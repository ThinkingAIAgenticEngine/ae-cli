"""Offline integration tests using real Git histories and an in-memory GitLab."""

import importlib.util
import asyncio
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("integration_review", ROOT / ".ci/integration_review.py")
review = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = review
SPEC.loader.exec_module(review)


class GitLabFixture:
    project = "/projects/123"
    pages = review.GitLab.pages

    def __init__(self, head):
        self.head = head
        self.target = "integration/6.0-20260910"
        self.notes = []
        self.posts = []
        self.reads = []
        self.fail_post = False

    def request(self, method, path, payload=None):
        if method == "POST":
            if self.fail_post:
                raise review.ReviewError("GitLab POST failed (403)")
            self.posts.append((path, payload))
            self.notes.append({"author": {"id": 7}, **payload})
            return {"id": len(self.posts)}
        self.reads.append(path)
        if path == "/user":
            return {"id": 7}
        if "/repository/branches/" in path:
            return {"commit": {"id": self.head}}
        if "?per_page=100&page=" in path:
            start = (int(path.rsplit("=", 1)[1]) - 1) * 100
            return self.notes[start:start + 100]
        raise AssertionError(f"Unexpected GitLab operation: {method} {path}")


class IntegrationReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "--quiet")
        self.git("config", "user.name", "Review Test")
        self.git("config", "user.email", "review-test@example.invalid")
        (self.root / "AGENTS.md").write_text("Fixed base policy\n")
        (self.root / "command.ts").write_text("export const value = 1;\n")
        self.base = self.commit("baseline")
        self.git("branch", "release/6.0", self.base)
        self.git("remote", "add", "origin", str(self.root))
        (self.root / "command.ts").write_text("export const value = 2;\n")
        self.head = self.commit("first change")
        self.api = GitLabFixture(self.head)
        self.env = {
            "CI_PIPELINE_SOURCE": "push", "CI_COMMIT_BRANCH": self.api.target,
            "CI_COMMIT_SHA": self.head, "CI_COMMIT_BEFORE_SHA": self.base,
            "GITLAB_USER_LOGIN": "push-user", "CI_PIPELINE_ID": "42",
            "CI_PIPELINE_URL": "https://gitlab.example/project/-/pipelines/42",
        }
        self.rendered = []

    def git(self, *args):
        return review.git(self.root, *args).stdout.strip()

    def commit(self, message):
        self.git("add", ".")
        self.git("commit", "--quiet", "-m", message)
        return self.git("rev-parse", "HEAD")

    def renderer(self, root, ctx, env):
        self.rendered.append(ctx)
        return {"report": "## Findings\n\nNo actionable defects found.", "model": {"model_seconds": 120.5}}

    def run_review(self, renderer=None):
        code = review.run(self.env, self.root, self.api, renderer or self.renderer)
        result = json.loads((self.root / ".review/result.json").read_text())
        return code, result

    def mr(self):
        self.env.update(CI_PIPELINE_SOURCE="merge_request_event", CI_MERGE_REQUEST_IID="9",
                        CI_MERGE_REQUEST_TARGET_BRANCH_NAME=self.api.target,
                        CI_MERGE_REQUEST_DIFF_BASE_SHA=self.base)

    def test_push_reviews_entire_push_and_posts_to_exact_commit(self):
        (self.root / "second.ts").write_text("export const second = true;\n")
        self.head = self.commit("second change")
        self.env["CI_COMMIT_SHA"] = self.api.head = self.head
        code, result = self.run_review()
        self.assertEqual((code, result["status"]), (0, "published"))
        self.assertEqual((self.rendered[0].base, self.rendered[0].head), (self.base, self.head))
        endpoint, payload = self.api.posts[0]
        self.assertEqual(endpoint, f"/projects/123/repository/commits/{self.head}/comments")
        self.assertIn("@push-user", payload["note"])
        self.assertIn(self.base, payload["note"])
        self.assertEqual(result["email_delivery"], "managed-by-gitlab-not-verified")

    def test_merged_feature_reviews_integration_before_to_merge_commit(self):
        feature_head = self.head
        self.git("checkout", "--quiet", "-b", self.api.target, self.base)
        (self.root / "already-integrated.ts").write_text("export const stable = true;\n")
        before = self.commit("previous integration change")
        self.git("merge", "--no-ff", "--no-edit", feature_head)
        merged_head = self.git("rev-parse", "HEAD")
        self.env.update(CI_COMMIT_BEFORE_SHA=before, CI_COMMIT_SHA=merged_head,
                        GITLAB_USER_LOGIN="merge-user")
        self.api.head = merged_head
        code, result = self.run_review()
        self.assertEqual((code, result["status"]), (0, "published"))
        self.assertEqual((self.rendered[0].base, self.rendered[0].head), (before, merged_head))
        self.assertEqual(self.git("diff", "--name-only", before, merged_head), "command.ts")
        endpoint, payload = self.api.posts[0]
        self.assertEqual(endpoint, f"/projects/123/repository/commits/{merged_head}/comments")
        self.assertIn("@merge-user", payload["note"])
        self.assertIn("集成分支代码审核", payload["note"])
        self.assertIn("集成分支推送", payload["note"])
        self.assertIn(merged_head, payload["note"])
        self.assertFalse(any("merge_requests" in path for path in self.api.reads))
        self.assertEqual(result["model"]["model_seconds"], 120.5)

    def test_all_mr_pipeline_types_are_rejected_before_model_or_publication(self):
        self.mr()
        for event_type in ("detached", "merged_result", "merge_train"):
            self.env["CI_MERGE_REQUEST_EVENT_TYPE"] = event_type
            with self.subTest(event_type=event_type):
                code, result = self.run_review()
                self.assertEqual((code, result["status"]), (1, "error"))
                self.assertIn("Only integration branch push", result["error"])
        self.assertFalse(self.rendered)
        self.assertFalse(self.api.reads)
        self.assertFalse(self.api.posts)

    def test_new_branch_uses_matching_release_without_master(self):
        self.env["CI_COMMIT_BEFORE_SHA"] = "0" * 40
        with patch.object(review, "git", wraps=review.git) as calls:
            code, _ = self.run_review()
        self.assertEqual(code, 0)
        self.assertEqual(self.rendered[0].base, self.base)
        fetches = [call.args for call in calls.call_args_list if call.args[1] == "fetch"]
        self.assertEqual(fetches[0][-1], "refs/heads/release/6.0")

    def test_new_unversioned_branch_requires_explicit_release_base(self):
        self.env.update(CI_COMMIT_BEFORE_SHA="0" * 40, CI_COMMIT_BRANCH="integration/special")
        code, result = self.run_review()
        self.assertEqual(code, 1)
        self.assertIn("REVIEW_BASE_REF", result["error"])
        self.assertFalse(self.api.posts)
        self.env["REVIEW_BASE_REF"] = "release/6.0"
        self.assertEqual(self.run_review()[0], 0)

    def test_rejects_release_feature_and_master_push(self):
        for branch in ("release/6.0", "feat/new-command", "master"):
            self.env["CI_COMMIT_BRANCH"] = branch
            with self.subTest(branch=branch):
                self.assertEqual(self.run_review()[0], 1)
        self.assertFalse(self.rendered)
        self.assertFalse(self.api.posts)

    def test_rejects_tags_schedules_and_missing_base(self):
        for source, branch in (("schedule", self.api.target), ("web", self.api.target), ("push", "")):
            self.env.update(CI_PIPELINE_SOURCE=source, CI_COMMIT_BRANCH=branch)
            self.assertEqual(self.run_review()[0], 1)
        self.env.update(CI_PIPELINE_SOURCE="push", CI_COMMIT_BRANCH=self.api.target)
        del self.env["CI_COMMIT_BEFORE_SHA"]
        self.assertEqual(self.run_review()[0], 1)
        self.assertFalse(self.rendered)

    def test_unchanged_tree_skips_model_and_publication(self):
        self.env["CI_COMMIT_BEFORE_SHA"] = self.head
        code, result = self.run_review()
        self.assertEqual((code, result["status"]), (0, "no-changes"))
        self.assertFalse(self.rendered)
        self.assertFalse(self.api.posts)

    def test_stale_integration_push_is_skipped_before_model(self):
        self.api.head = "a" * 40
        code, result = self.run_review()
        self.assertEqual((code, result["status"]), (0, "stale"))
        self.assertFalse(self.rendered)

    def test_new_push_during_review_prevents_stale_publication(self):
        def advance(root, ctx, env):
            self.api.head = "b" * 40
            return {"report": "Completed report for the old commit"}
        code, result = self.run_review(advance)
        self.assertEqual((code, result["status"]), (0, "stale"))
        self.assertFalse(self.api.posts)
        self.assertIn("Completed report", (self.root / ".review/report.md").read_text())

    def test_retry_does_not_duplicate_comment_and_checks_author(self):
        self.assertEqual(self.run_review()[0], 0)
        first = self.api.notes[0]
        self.api.notes = [{"author": {"id": 99}, "note": first["note"]}] * 100 + [first]
        code, result = self.run_review()
        self.assertEqual((code, result["status"]), (0, "already-published"))
        self.assertEqual(len(self.api.posts), 1)
        self.assertTrue(any("page=2" in path for path in self.api.reads))

    def test_different_head_creates_new_notification_comment(self):
        self.run_review()
        (self.root / "command.ts").write_text("export const value = 3;\n")
        # Review artifacts are deliberately not part of the fixture commit.
        self.git("add", "command.ts")
        self.git("commit", "--quiet", "-m", "follow-up")
        self.env["CI_COMMIT_SHA"] = self.api.head = self.git("rev-parse", "HEAD")
        self.assertEqual(self.run_review()[0], 0)
        self.assertEqual(len(self.api.posts), 2)

    def test_model_failure_is_error_not_a_pass_and_clears_old_artifact(self):
        self.run_review()
        def fail(*args):
            raise RuntimeError("private model request content")
        code, result = self.run_review(fail)
        self.assertEqual((code, result["status"]), (1, "error"))
        artifact = (self.root / ".review/report.md").read_text()
        self.assertNotIn("No actionable defects", artifact)
        self.assertNotIn("private model", json.dumps(result) + artifact)

    def test_publish_failure_keeps_report_and_returns_nonzero(self):
        self.api.fail_post = True
        code, result = self.run_review()
        self.assertEqual(code, 1)
        self.assertIn("403", result["error"])
        self.assertIn("Findings", (self.root / ".review/report.md").read_text())

    def test_credentials_are_redacted_from_publication(self):
        self.env["OPENAI__KEY"] = "private-api-key-value"
        self.run_review(lambda *args: {"report": "Found private-api-key-value and glpat-testcredential"})
        body = self.api.posts[0][1]["note"]
        self.assertNotIn("private-api-key-value", body)
        self.assertNotIn("glpat-testcredential", body)

    def test_snapshot_preserves_exact_trees_for_force_push(self):
        before = self.head
        self.git("checkout", "--quiet", "-b", "divergent", self.base)
        (self.root / "other.ts").write_text("export const other = true;\n")
        after = self.commit("divergent change")
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "snapshot"
            review.snapshot(self.root, target, review.Context("push", before, after, self.api.target))
            expected = self.git("diff", before, after)
            actual = review.git(target, "diff", "review-base...HEAD").stdout.strip()
            self.assertEqual(actual, expected)
            self.assertEqual(review.git(target, "rev-parse", "HEAD^{tree}").stdout.strip(), self.git("rev-parse", f"{after}^{{tree}}"))
            self.assertEqual(review.git(target, "status", "--porcelain").stdout, "")


class WorkflowTests(unittest.TestCase):
    def test_workflow_event_matrix_from_actual_rules(self):
        import yaml
        config = yaml.safe_load((ROOT / ".gitlab-ci.yml").read_text())
        rules = config["workflow"]["rules"]
        def allowed(env):
            for rule in rules:
                expression = rule.get("if")
                if not expression:
                    return rule.get("when") != "never"
                parts = re.fullmatch(r'\$(\w+) == "([^"]+)" && \$(\w+) =~ /(.+)/', expression)
                self.assertIsNotNone(parts)
                first, value, second, pattern = parts.groups()
                if env.get(first) == value and re.search(pattern.replace(r"\/", "/"), env.get(second, "")):
                    return True
            return False
        cases = [
            ("merge_request_event", "integration/6.0-20260910", "", False),
            ("merge_request_event", "integration/6.1-20260910", "", False),
            ("merge_request_event", "integration/6.0-20260910", "integration/6.0-20260910", False),
            ("merge_request_event", "release/6.0", "", False),
            ("merge_request_event", "feat/work", "", False),
            ("push", "", "integration/6.0-20260910", True),
            ("push", "", "integration/6.1-20260910", True),
            ("push", "", "integration/xxxxxxx", True),
            ("push", "integration/6.0-20260910", "feat/work", False),
            ("push", "", "release/6.0", False),
            ("push", "", "feat/work", False),
            ("push", "", "master", False),
            ("push", "", "", False),
            ("push", "", "integration/", False),
            ("schedule", "", "integration/6.0-20260910", False),
            ("web", "", "integration/6.0-20260910", False),
            ("api", "", "integration/6.0-20260910", False),
        ]
        for source, target, branch, expected in cases:
            with self.subTest(source=source, target=target, branch=branch):
                self.assertEqual(allowed({"CI_PIPELINE_SOURCE": source,
                                          "CI_MERGE_REQUEST_TARGET_BRANCH_NAME": target,
                                          "CI_COMMIT_BRANCH": branch}), expected)


class RendererTests(unittest.TestCase):
    def execute(self, prediction, artifact="Rendered finding", remaining=None, finish="stop"):
        spec = importlib.util.spec_from_file_location("pr_agent_local", ROOT / ".ci/pr_agent_local.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        class Settings:
            def __init__(self):
                self.values = {"PR_REVIEWER.EXTRA_INSTRUCTIONS": "CLI review policy"}
            def get(self, key, default=None):
                return self.values.get(key.upper(), default)
            def set(self, key, value):
                self.values[key.upper()] = value
        settings = Settings()
        class Client:
            def __init__(self, **kwargs):
                self.chat = types.SimpleNamespace(completions=self)
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                pass
            async def create(self, **kwargs):
                settings.set("TEST.REQUEST", kwargs)
                return types.SimpleNamespace(choices=[types.SimpleNamespace(
                    finish_reason=finish, message=types.SimpleNamespace(content=prediction))],
                    usage=types.SimpleNamespace(prompt_tokens=3000, completion_tokens=500,
                                                completion_tokens_details=types.SimpleNamespace(reasoning_tokens=450)))
        class Reviewer:
            def __init__(self, base, ai_handler):
                if base != "review-base":
                    raise AssertionError("Unexpected local review base")
                self.prediction = prediction
                self.git_provider = types.SimpleNamespace()
                self.token_handler = object()
                self.ai_handler = ai_handler()
            async def _get_prediction(self, model):
                result = await self.ai_handler.chat_completion(model=model, temperature=0.1, system="policy", user="diff")
                return result[0]
            async def run(self):
                await self._prepare_prediction("test/model")
                settings.set("DATA.ARTIFACT", artifact)
        loader = types.ModuleType("pr_agent.config_loader")
        loader.get_settings = lambda: settings
        reviewer_module = types.ModuleType("pr_agent.tools.pr_reviewer")
        reviewer_module.PRReviewer = Reviewer
        processing = types.ModuleType("pr_agent.algo.pr_processing")
        processing.get_pr_diff = lambda *args, **kwargs: ("diff", remaining) if remaining else "diff"
        openai_module = types.ModuleType("openai")
        openai_module.AsyncOpenAI = Client
        modules = {"pr_agent": types.ModuleType("pr_agent"), "pr_agent.config_loader": loader,
                   "pr_agent.tools": types.ModuleType("pr_agent.tools"),
                   "pr_agent.tools.pr_reviewer": reviewer_module,
                   "pr_agent.algo": types.ModuleType("pr_agent.algo"),
                   "pr_agent.algo.pr_processing": processing, "openai": openai_module}
        cwd = Path.cwd()
        with tempfile.TemporaryDirectory() as folder, patch.dict(sys.modules, modules), \
                patch.dict(os.environ, {"OPENAI__KEY": "test-key", "OPENAI__API_BASE": "http://model.invalid/v1",
                                        "REVIEW_PROJECT_URL": "https://gitlab.example/te-ai/te-cli",
                                        "REVIEW_COMMIT_SHA": "a" * 40}):
            root = Path(folder)
            policy = root / "policy.md"
            policy.write_text("Fixed version policy")
            try:
                asyncio.run(module.render(root, ROOT / ".pr_agent.toml", policy, root / "result.json"))
                result = json.loads((root / "result.json").read_text())
            finally:
                os.chdir(cwd)
        return settings, result

    def test_explicit_local_config_and_base_policy_without_gitlab_publication(self):
        settings, result = self.execute("```yaml\nreview:\n  key_issues_to_review: []\n```")
        self.assertEqual(settings.get("CONFIG.MODEL"), "deepseek-v4-pro")
        self.assertEqual(settings.get("CONFIG.MAX_MODEL_TOKENS"), 131072)
        self.assertEqual(settings.get("CONFIG.FALLBACK_MODELS"), [])
        self.assertEqual(settings.get("CONFIG.GIT_PROVIDER"), "local")
        self.assertFalse(settings.get("CONFIG.PUBLISH_OUTPUT"))
        self.assertFalse(settings.get("CONFIG.USE_REPO_SETTINGS_FILE"))
        self.assertIs(settings.get("PR_REVIEWER.REQUIRE_ESTIMATE_EFFORT_TO_REVIEW"), False)
        self.assertIn("Fixed version policy", settings.get("PR_REVIEWER.EXTRA_INSTRUCTIONS"))
        request = settings.get("TEST.REQUEST")
        self.assertIn("Simplified Chinese", request["messages"][0]["content"])
        self.assertEqual(request["messages"][0]["role"], "system")
        self.assertEqual(request["messages"][1], {"role": "user", "content": "diff"})
        self.assertIn("未发现重大问题", result["report"])
        self.assertEqual(result["model_result"]["input_tokens"], 3000)
        self.assertEqual(result["model_result"]["reasoning_tokens"], 450)
        self.assertEqual(settings.get("TEST.REQUEST")["reasoning_effort"], "low")
        self.assertEqual(settings.get("TEST.REQUEST")["max_tokens"], 32768)
        self.assertGreaterEqual(result["model_result"]["model_seconds"], 0)

    def test_missing_malformed_or_empty_model_result_fails(self):
        for prediction, artifact in ((None, "report"), ("{}", "report"),
                                     ("review: {}", ""), ("review: []", "report")):
            with self.subTest(prediction=prediction, artifact=artifact):
                with self.assertRaises(RuntimeError):
                    self.execute(prediction, artifact)

    def test_partial_model_review_is_not_published(self):
        with self.assertRaisesRegex(RuntimeError, "all selected files"):
            self.execute("review: {}", remaining=["omitted.ts"])

    def test_truncated_model_output_is_not_published(self):
        with self.assertRaisesRegex(RuntimeError, "truncated"):
            self.execute("review: {}", finish="length")

    def test_finding_links_use_real_reviewed_commit(self):
        _, result = self.execute("""review:
  key_issues_to_review:
    - relevant_file: src/a file.ts
      issue_header: 分页提前结束
      issue_content: 返回空页但仍有下一页时会漏掉数据。
      start_line: 5
      end_line: 7
  relevant_tests: yes
  security_concerns: No
  estimated_effort_to_review_[1-5]: 4
""")
        self.assertIn("https://gitlab.example/te-ai/te-cli/-/blob/" + "a" * 40 + "/src/a%20file.ts#L5-7", result["report"])
        self.assertIn("分页提前结束", result["report"])
        self.assertIn("未执行测试", result["report"])
        self.assertIn("未发现安全问题", result["report"])
        self.assertNotIn("人工审核工作量", result["report"])
        self.assertNotIn("4/5", result["report"])
        self.assertNotIn("No major issues", result["report"])

    def test_missing_or_invalid_findings_fail_instead_of_claiming_no_issues(self):
        for fields in ("{}", "{key_issues_to_review: No}", "{key_issues_to_review: [{}]}"):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.execute("review: " + fields)

    def test_chinese_report_preserves_security_concern(self):
        _, result = self.execute("review: {key_issues_to_review: [], relevant_tests: no, security_concerns: 日志包含密钥}")
        self.assertIn("安全关注点", result["report"])
        self.assertIn("日志包含密钥", result["report"])
        self.assertNotIn("未发现安全问题", result["report"])

    def test_english_findings_or_security_explanations_are_not_published(self):
        finding = {"relevant_file": "src/output.ts", "issue_header": "结果丢失",
                   "issue_content": "多条结果只返回第一条。", "start_line": 118, "end_line": 118}
        for field, text in (("issue_header", "Possible Bug"),
                            ("issue_content", "Multiple jq results silently lose all but the first match.")):
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "not Chinese"):
                self.execute(json.dumps({"review": {"key_issues_to_review": [{**finding, field: text}],
                                                    "security_concerns": "No"}}))
        with self.assertRaisesRegex(ValueError, "not Chinese"):
            self.execute("review: {key_issues_to_review: [], security_concerns: Credentials are logged}")


if __name__ == "__main__":
    unittest.main()
