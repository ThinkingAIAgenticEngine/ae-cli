# ae-kb deterministic query workflow

How to answer a knowledge question with the deterministic retrieval primitives
(`+list` / `+index` / `+grep` / `+read`) instead of `+ask`. Choose the next step
from the evidence already returned; these are branches, not commands to run on
every page. Reach relevant evidence without crawling a page line by line.

Use `+ask` when the question requires synthesizing across multiple pages or
multi-hop reasoning; simple factual lookups are served by the steps below.
Everything below is server-side LLM-free.

## Automatic project semantic KB retrieval

When the `ae-analysis` dual-switch gate is enabled and `kb project-target get`
returns an available company KB for the verified project, that exact KB is the
sole candidate. For each new analysis question, reuse exact navigation where
applicable and make a fresh `+grep` or content `+read` against the current project's resolved KB.
Results from a previous question do not satisfy the automatic project KB preflight.
If no obvious page matches, search the closest valid paths returned by navigation.
If the KB has no valid retrieval path, the retrieval fails, or there are no relevant hits,
continue ordinary analysis with business semantics. Do not return to discovery or search another KB.

## Other KB queries

This picks up **after** `ae-kb-discovery` has chosen a candidate from trusted active sources or `+list`.
An explicit reference skips `+list` and stays within the referenced list, even when page evidence is insufficient.
Preferred candidates are searched only when relevant; clearly unrelated candidates or evidence gaps can lead to `+list`.
After `+list`, retrieve from at most three distinct newly discovered knowledge bases; count every new source in a multi-source `+ask` separately. Explicit references and preferred candidates do not consume that budget.
When using `+ask` with explicit references or preferred candidates, always pass `--sources` containing only the relevant authorized sources from that active list; never omit it or include unrelated sources. For an explicit reference, insufficient evidence does not authorize expansion to another knowledge base.

If the first grep misses, rewrite the query once with different terms from the
navigation and the same `--paths`, then read the likeliest linked page if useful.
For a remaining evidence gap, try other paths copied from current navigation or
return to discovery for the next allowed candidate. With no usable paths, apply
the same discovery limits. Never construct a path from a title.

## Retrieval steps

Scope every `+index` / `+grep` / `+read` call to the selected KB with `--sources` / `--source`.

**Known-page fast path:** within the same host, identity, KB and published revision,
reuse navigation across questions. For automatic project retrieval, reuse previously
read content only for the same question. For other KB queries, reuse the evidence
already read in the same task.
Copy exact links returned by `+index`, `+grep` or `+read` and go to step 3 for a relevant page
whose path is known. Do not guess filenames. Once a path is known,
do not repeat indexing or broad directory searches to rediscover it;
only read a domain, catalog or parent page when its additional
context is needed to resolve scope, applicability or an uncovered requirement.
A revision or access-context change requires revalidation, not silent reuse.

1. **Index the candidate.** If no usable navigation is in context, call
   `+index --sources` with the discovery pick.
   Use `index.md` for navigation, a fit check, and **query wording** — the real
   terms in the index (product names, API identifiers, section titles) become
   your `+grep` keywords. The root index routes at module level only; when a
   module is too coarse for your question (it has many detail pages), read that
   module's catalog page (`wiki/modules/<module>/catalog.md`) — it groups
   detail pages by topic with one-line summaries. **Copy** detail-page paths
   from the catalog as additional `--paths` candidates; the catalog itself is
   navigation, not an answer source.

   **Done when:** you have the candidate's `index.md`, and a list of `wiki/...`
   links you can **copy** (0 items still counts as done).

2. **Grep copied paths.** When no sufficiently specific page link is known,
   copy 1–3 `wiki/...` entries from the navigation already returned (a page
   such as `wiki/sandbox.md`, or a subdirectory such as `wiki/guides`). Each
   entry must be strictly below `wiki/`: the roots `wiki` and `wiki/`,
   `index.md`, `raw/`, absolute paths and paths escaping `wiki/` are invalid.
   Never use the wiki root as a full-library search fallback. If navigation
   provides no usable paths, skip `+grep` and follow the fallback for your route above.
   With valid paths, call `+grep` with the candidate `--sources` and the copied list as `--paths`. Search
   with the terms in the returned navigation. If the grep misses, follow the
   fallback for your route above.

   **Done when:** you have relevant hits to read or have reached the fallback
   for your route.

   **Reading the result — the page-level `results` view.** The response is a page-level
   `results` array: each entry is one page with its full `hitCount`, a
   `pageKind`, and up to 4 `sections` previews (each with its breadcrumb,
   `sectionStartLine`/`sectionEndLine`, and a text preview). Read the top
   relevant pages until every subquestion of the question is backed by
   sections you have actually read (step 4 distinguishes business analysis
   from knowledge-only coverage). `hitCount` tells you how dense the matches
   are on a page; `pageKind: "catalog"` marks a module directory page — its
   previews are detail-page entries, so treat them as navigation: add the
   detail-page paths you see there to your read list instead of reading the
   catalog as an answer source. When a page has `moreSections > 0` and the
   answer is not in the previews, locate the missing evidence on that single
   page using step 3 rather than searching its entire directory again.

   Each page-group section preview carries its enclosing heading-section
   boundaries:

   - `sectionStartLine` / `sectionEndLine` are the section boundaries. Use
     them as the read window (or as the maximum boundary when choosing a
     smaller window under them).
   - `+read --offset` / `--limit` are the actual read window. Choose the
     smallest reliable window that preserves the needed evidence; do not
     shell-truncate with `| head`.
   - `+read --expand block` may include the rest of a Markdown block just
     outside the requested window. Use `+read --expand none` when the line
     window must be exact. Omit the flag to keep the server default, `block`.

3. **Choose the section locator.** Pick one locator for the current target
   page:

   - **Short or unknown-length linked page:** for a focused recall card or
     asset-definition page, read once with
     `--offset 1 --limit 200 --expand none`; an outline is not a prerequisite.
     If a response already shows a longer page or a precise relevant section,
     use the section branches below instead. Check the returned coverage:
     `startLine: 1`, `endLine: totalLines`, and `truncated: false` prove a
     complete page. If partial, locate only the missing evidence on the same page
     with scoped grep or an outline; a bounded prefix is not proof of full
     coverage. Do not reuse a range from another page.
   - **Section preview of a page group:** read the section range with
     `--offset sectionStartLine` and
     `--limit sectionEndLine - sectionStartLine + 1`. For narrow
     fact/table/code evidence, narrow the window under the section boundary
     once you see the preview text. If the window turns out too small, widen
     once up to the section range. Do not crawl by shifting offsets line by
     line.
   - **Linked or related page needing section localization:** if the direct
     read branch does not apply and you have concrete terms for that new page,
     run `+grep --paths '["<new-page>"]'` scoped to that page and use the new
     hit range. An explicit child link needs no catalog or directory lookup.
   - **No reliable range:** if the new page has no concrete grep terms, its
     grep misses, or headings are needed to choose the right section, call
     `+read --outline` for that page. It returns only the heading tree
     (`{level, heading, line}`), independent of any offset/limit window, with
     empty content.

   A bare `+read` without `--offset` / `--limit` is only acceptable after the
   response proves the whole page was returned (`startLine: 1`,
   `endLine: totalLines`, and `truncated: false`).

   **Done when:** you have a reliable range from the same-page grep hit, a new
   page grep hit, an outline-derived heading range, or a complete untruncated
   page response.

4. **Read the selected window.** Read the selected window in one call. Windows
   come from a page-group section preview's boundaries or two adjacent outline
   headings (`heading.line` of the target section to `heading.line - 1` of the
   next). If a window turns out too small, widen to the section boundary in one
   more call. A completed direct read in step 3 needs no additional read or
   outline. Independent, already identified pages may be read in parallel;
   follow only links needed for the question, not every related page.

   **Done when:** the needed evidence is in context without shell truncation,
   or the page response is complete and untruncated.

   **Read coverage:** for knowledge-only answers, read relevant candidate pages
   until every answered subquestion is backed by sections actually read — not
   until a page "looks like the answer". For business data analysis, read the
   relevant definitions and boundaries, then hand off verified coverage and
   remaining gaps in step 5. Carry the matched branch outcome, source and answer
   grains, required operation, checks and reason to stop together with its evidence.
   When a legacy card omits these, read the linked definition before claiming coverage; live values do not need KB text as their source.
   Do not pick a single page by surface similarity between the question wording
   and the page/module name or hit line.

5. **Assess coverage, then answer or iterate.** Map the user's question into
   subquestions and check each one against the sections you actually read. If a
   subquestion is covered, answer with citations (knowledge base + page path +
   section, plus the returned `readView.versionId/versionNumber` for snapshots).
   For `version_pinned` results, describe consistency within that captured view.
   Unchanged `versionId/readIdentity` proves that the reads used the same snapshot;
   it does not establish whether a newer publication or rollback occurred outside
   the execution. Claims about the latest formal version require separate current
   publication evidence obtained through an authorized management workflow.
   Preserve version identity with the reference; a fresh read of the same path is
   not a historical citation read. For completed Ask sources with `reference`, use
   `ae-cli kb +ask-status --execution-id <reference.executionId> --source-index <reference.sourceIndex>`
   to reopen the original version under current permissions. An unversioned source
   has no guaranteed historical snapshot; do not label its current content historical.
   Historical source reads are rejected inside a required fixed-context execution;
   never remove that context or fall back to an ordinary token to bypass its KB set.
   If a gap remains, follow the fallback for your route above.
   For a knowledge-only question, missing evidence after the allowed search
   means "not covered by the knowledge base" — do not attach a confident fact
   from general knowledge, even with a disclaimer. For business data analysis,
   this is a KB coverage gap, not completion of the original task. Preserve the
   read KB evidence and continue through `ae-analysis` using
   [`analysis-workflow.md`](analysis-workflow.md): verify suitable saved assets,
   resolve only missing metadata, and execute an independently supported,
   authorized query. Never attribute that live result to unread KB content.

   Once relevant definitions, parameters and boundaries are covered, proceed
   to the analysis handoff. Do not keep navigating to validate already verified
   links or to seek live numbers in a semantic snapshot. Return to KB retrieval
   only for a concrete unresolved semantic question.

   **Done when:** every answered subquestion is supported by read sections, or
   the remaining knowledge gaps are explicitly reported as missing evidence.
   A business data request still requires the analysis handoff and its task
   completion check; routing or definition-only coverage is not a live answer.

## Anti-pattern: same-page offset crawling

The failure this workflow prevents: reading a tiny window, finding it cut
mid-evidence, and nudging the window one line at a time. That wastes calls and
never shows page structure. Instead: read the page-group section range, widen
once up to the section boundary, or open `--outline` and read the selected
heading range.

## Related

- Command flags and JSON shapes: see the `+grep` / `+read` sections in
  [`../SKILL.md`](../SKILL.md).
- Use `+ask` for multi-page synthesis or multi-hop questions. Default `+ask` submits then polls until the answer is ready; `--no-wait` and `+ask-status` are for batch submit/retrieve. See the `+ask` section in [`../SKILL.md`](../SKILL.md).
