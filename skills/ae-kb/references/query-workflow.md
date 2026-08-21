# ae-kb deterministic query workflow

How to answer a knowledge question with the deterministic retrieval primitives
(`+list` / `+index` / `+grep` / `+read`) instead of `+ask`. Follow this order;
it is designed to reach the right section in a few calls and to avoid crawling a
page line by line.

Use `+ask` when the question requires synthesizing across multiple pages or
multi-hop reasoning; simple factual lookups are served by the steps below.
Everything below is server-side LLM-free.

## The loop

This picks up **after** `ae-kb-discovery` has listed accessible knowledge bases
and ranked candidates. Start here with a chosen candidate; scope every `+index`
/ `+grep` / `+read` call to it with `--sources` / `--source`. If the candidate
turns out not to cover the question, go back to `ae-kb-discovery` for the next
candidate rather than searching everything blindly.

1. **Index the candidate.** Call `+index --sources` with the discovery pick.
   Use `index.md` for navigation, a fit check, and **query wording** — the real
   terms in the index (product names, API identifiers, section titles) become
   your `+grep` keywords.

   **Done when:** you have the candidate's `index.md`, and a list of `wiki/...`
   links you can **copy** (0 items still counts as done).

2. **Grep copied paths.** Copy 1–3 `wiki/...` entries from the index (a page
   such as `wiki/sandbox.md`, or a subdirectory such as `wiki/guides`). Call
   `+grep` with the candidate `--sources` and the copied list as `--paths`. Search
   with the index terms. If the first grep misses, rewrite the query **once**
   using different index terms — still with this same `--paths` — then stop
   rewriting.

   **Done when:** you have hits, or you have rewritten once, or step 1 copied
   0 paths. Copied 0 paths → skip grep and `+read --outline` the likeliest
   title page, or go back to discovery for the next candidate.

   A grep hit gives both a hit anchor and its enclosing section range:

   - `line` is the exact matched line. Use it as the anchor when the evidence
     is local.
   - `sectionStartLine` / `sectionEndLine` are the enclosing heading-section
     boundaries. Use them when the answer needs the whole section context, or
     as the maximum boundary when choosing a smaller window.
   - `+read --offset` / `--limit` are the actual read window. Choose the
     smallest reliable window that preserves the needed evidence; do not
     shell-truncate with `| head`.

3. **Choose the section locator.** Pick one locator for the current target
   page:

   - **Same-page grep hit:** choose a read window from the hit. For narrow
     fact/table/code evidence, read a bounded window anchored at `line`; stay
     within `sectionStartLine`–`sectionEndLine`. For section-level meaning,
     field definitions, caveats, or rows that depend on the heading context,
     read the section range with
     `--offset sectionStartLine` and
     `--limit sectionEndLine - sectionStartLine + 1`. If the first window is
     too small, widen once up to the section range. Do not crawl by shifting
     offsets line by line.
   - **Linked or related page:** if you follow a catalog/detail/related link to
     a different page, the old grep range no longer applies. If you have
     concrete terms for that new page, run `+grep --paths '["<new-page>"]'`
     scoped to that page and use the new hit range.
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
   come from the hit anchor, the grep hit's section boundaries, or two adjacent
   outline headings (`heading.line` of the target section to `heading.line - 1`
   of the next). If a window turns out too small, widen to the section boundary
   in one more call.

   **Done when:** the needed evidence is in context without shell truncation,
   or the page response is complete and untruncated.

5. **Assess coverage, then answer or iterate.** Map the user's question into
   subquestions and check each one against the sections you actually read. If a
   subquestion is covered, answer with citations (knowledge base + page path +
   section). If a gap remains, go back to step 2 with another set of `--paths`
   **copied** from the index, or return to discovery for the next candidate.
   If the evidence is missing after the allowed search, say which subquestion is
   not covered instead of filling it from memory.

   **Done when:** every answered subquestion is supported by read sections, or
   the remaining gaps are explicitly reported as missing evidence.

## Anti-pattern: same-page offset crawling

The failure this workflow prevents: grep returns a line number, you `+read` a
tiny window around it, it is cut mid-evidence, so you nudge the window one line
at a time. That wastes calls and never shows page structure. Instead: use the
hit anchor, widen once up to the section boundary, or open `--outline` and read
the selected heading range.

## Related

- Command flags and JSON shapes: see the `+grep` / `+read` sections in
  [`../SKILL.md`](../SKILL.md).
- Use `+ask` for multi-page synthesis or multi-hop questions. Default `+ask` submits then polls until the answer is ready; `--no-wait` and `+ask-status` are for batch submit/retrieve. See the `+ask` section in [`../SKILL.md`](../SKILL.md).
