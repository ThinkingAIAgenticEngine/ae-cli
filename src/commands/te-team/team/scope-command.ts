import { BASE_TEAM_PATH } from "../shared.js";
import { detectCliLocale } from "../../../tracking/i18n/locale.js";
import { kbApi } from "../../../core/mcp-access.js";
import type { Command, RuntimeContext } from "../../../framework/types.js";

const scopeText = {
  en: {
    id: "Team ID",
    revision: "Use expectedRevision from the preview",
    required:
      "Preview this Team with --dry-run, then pass its --expected-revision.",
    promote:
      "Convert your personal Team to a company Team after reviewing the preview.",
    copy: "Create an independent personal copy of a company Team.",
  },
  zh: {
    id: "Team ID",
    revision: "使用预览返回的 expectedRevision",
    required: "请先运行 --dry-run 预览，再传入对应的 --expected-revision。",
    promote: "确认预览后，将本人的个人 Team 转为公司 Team。",
    copy: "把公司 Team 复制为独立的个人 Team。",
  },
  ja: {
    id: "Team ID",
    revision: "プレビューで取得した expectedRevision",
    required:
      "--dry-run で確認してから --expected-revision を指定してください。",
    promote: "確認した個人用 Team を会社の Team に変更します。",
    copy: "会社の Team の独立した個人用コピーを作成します。",
  },
  ko: {
    id: "Team ID",
    revision: "미리 보기에서 받은 expectedRevision",
    required:
      "먼저 --dry-run으로 확인한 후 --expected-revision을 전달하세요.",
    promote: "미리 보기 확인 후 개인 Team을 회사 Team으로 전환합니다.",
    copy: "회사 Team의 독립적인 개인 복사본을 만듭니다.",
  },
};
export function teamScopeCommand(
  action: "promote" | "copy",
): Omit<Command, "command"> {
  const txt = scopeText[detectCliLocale()];
  const endpoint = (ctx: RuntimeContext) =>
    BASE_TEAM_PATH + "/" + encodeURIComponent(ctx.str("id")) + "/" + action;
  return {
    service: "team",
    description: txt[action],
    risk: "write",
    flags: [
      { name: "id", type: "string", required: true, desc: txt.id },
      { name: "expected-revision", type: "string", desc: txt.revision },
    ],
    dryRun: (ctx) =>
      kbApi(ctx, "GET", endpoint(ctx), { lang: detectCliLocale() }),
    execute: (ctx) => {
      const expectedRevision = ctx.str("expected-revision");
      if (!expectedRevision) throw new Error(txt.required);
      return kbApi(
        ctx,
        "POST",
        endpoint(ctx),
        { lang: detectCliLocale() },
        { expectedRevision },
        { preserveBusinessErrorCode: true },
      );
    },
  };
}
