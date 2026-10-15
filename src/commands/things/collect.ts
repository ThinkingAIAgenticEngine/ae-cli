import type { RuntimeContext } from "../../framework/types.js";
import { requestThings } from "./client.js";

type Row = { id: string; [key: string]: unknown };
type Page<T> = { items: T[]; nextCursor: string | null };
export async function collectThingsPages<T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  maximum = 10000,
) {
  const items: T[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < 100; pageIndex++) {
    let page: Page<T>;
    try {
      page = await fetchPage(cursor);
    } catch {
      return {
        items,
        fetchedCount: items.length,
        truncated: true,
        collectionError: "PAGE_REQUEST_FAILED",
      };
    }
    if (
      !page ||
      !Array.isArray(page.items) ||
      !(page.nextCursor === null || typeof page.nextCursor === "string")
    )
      return {
        items,
        fetchedCount: items.length,
        truncated: true,
        collectionError: "INVALID_PAGE",
      };
    for (const item of page.items) {
      if (!item || typeof item.id !== "string" || ids.has(item.id))
        return {
          items,
          fetchedCount: items.length,
          truncated: true,
          collectionError: "DUPLICATE_OR_INVALID_ITEM",
        };
      if (items.length >= maximum)
        return {
          items,
          fetchedCount: items.length,
          truncated: true,
          collectionError: "COLLECTION_LIMIT",
        };
      ids.add(item.id);
      items.push(item);
    }
    if (!page.nextCursor)
      return {
        items,
        fetchedCount: items.length,
        truncated: false,
        collectionError: null,
      };
    if (cursors.has(page.nextCursor) || !page.items.length)
      return {
        items,
        fetchedCount: items.length,
        truncated: true,
        collectionError: "CURSOR_DID_NOT_ADVANCE",
      };
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return {
    items,
    fetchedCount: items.length,
    truncated: true,
    collectionError: "COLLECTION_LIMIT",
  };
}
export function thingsWindow(ctx: RuntimeContext) {
  const start = ctx.str("from");
  const end = ctx.str("to");
  const timeZone = ctx.str("timeZone") || "Asia/Shanghai";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new Error("Invalid --time-zone");
  }
  if (Boolean(start) !== Boolean(end))
    throw new Error("Specify both --from and --to with explicit timezones");
  for (const value of [start, end].filter(Boolean))
    if (
      !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      throw new Error("Use ISO timestamps with explicit timezone offsets");
  if (start && Date.parse(start) >= Date.parse(end))
    throw new Error("--from must be earlier than --to");
  return {
    start: start ? new Date(start).toISOString() : null,
    end: end ? new Date(end).toISOString() : null,
    timeZone,
  };
}
export function factsInWindow(
  thing: Row,
  entries: Row[],
  start: string | null,
  end: string | null,
) {
  const effective = (entry: Row) => entry.type === "progress";
  const startMs = start ? Date.parse(start) : -Infinity;
  const endMs = end ? Date.parse(end) : Infinity;
  // Server pages are newest first; normalize copies for callers with other ordering.
  const ordered = [...entries].sort(
    (a, b) =>
      Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)) ||
      (String(a.id) < String(b.id) ? 1 : String(a.id) > String(b.id) ? -1 : 0),
  );
  const inWindow = ordered.filter(
    (e) =>
      Date.parse(String(e.createdAt)) >= startMs &&
      Date.parse(String(e.createdAt)) < endMs,
  );
  const baseline: Record<string, unknown> = Object.fromEntries(
    ["status", "assigneeId", "tags"].map((key) => [key, thing[key]]),
  );
  baseline.archived = Boolean(thing.archivedAt);
  for (const entry of ordered) {
    if (Date.parse(String(entry.createdAt)) < startMs) continue;
    if (
      entry.type === "updated" &&
      entry.dataJson &&
      typeof entry.dataJson === "object"
    )
      for (const [key, change] of Object.entries(entry.dataJson)) {
        if (
          key in baseline &&
          change &&
          typeof change === "object" &&
          "before" in change
        )
          baseline[key] = change.before;
      }
    if (
      entry.type === "status" &&
      entry.dataJson &&
      typeof entry.dataJson === "object" &&
      "before" in entry.dataJson
    ) {
      baseline.status = entry.dataJson.before;
      baseline.archived = entry.dataJson.before === "archived";
    }
  }
  return {
    baseline:
      !start || Date.parse(String(thing.createdAt)) >= startMs
        ? null
        : baseline,
    entries: inWindow,
    effectiveProgressCount: inWindow.filter((e) => effective(e)).length,
    lastEffectiveRecordBeforeWindow:
      ordered.find(
        (e) => effective(e) && Date.parse(String(e.createdAt)) < startMs,
      ) ?? null,
  };
}
export async function collectThingDetail(
  ctx: RuntimeContext,
  root: string,
  id: string,
) {
  const thing = await requestThings<Row>(ctx, "GET", `${root}/things/${id}`);
  const entries = await collectThingsPages<Row>((cursor) =>
    requestThings(
      ctx,
      "GET",
      `${root}/things/${id}/entries?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),
  );
  const assets = await collectThingsPages<Row>((cursor) =>
    requestThings(
      ctx,
      "GET",
      `${root}/things/${id}/assets?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),
  );
  const context = await requestThings<{ thing: { version: number } }>(
    ctx,
    "GET",
    `${root}/things/${id}/context`,
  );
  return {
    thing,
    entries: entries.items,
    context,
    assets: assets.items,
    fetchedCount: 1 + entries.fetchedCount + assets.fetchedCount,
    truncated: entries.truncated || assets.truncated,
    collectionErrors: [entries.collectionError, assets.collectionError].filter(
      Boolean,
    ),
    consistency:
      context.thing.version === thing.version
        ? "non_transactional"
        : "changed_during_collection",
    collectedAt: new Date().toISOString(),
  };
}
export async function collectThingDigest(
  ctx: RuntimeContext,
  root: string,
  explicitIds: string[],
) {
  const window = thingsWindow(ctx);
  const params = new URLSearchParams({ limit: "100" });
  if (ctx.str("assigneeId")) params.set("assigneeId", ctx.str("assigneeId"));
  const listing = explicitIds.length
    ? {
        items: explicitIds.map((id) => ({ id })),
        truncated: false,
        collectionError: null,
      }
    : await (async () => {
        const pages = await Promise.all(
          ["", "archived"].map((status) =>
            collectThingsPages<Row>((cursor) =>
              requestThings(
                ctx,
                "GET",
                `${root}/things?${params}${status ? `&status=${status}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
              ),
            ),
          ),
        );
        return {
          items: [
            ...new Map(
              pages
                .flatMap((page) => page.items)
                .map((item) => [item.id, item]),
            ).values(),
          ],
          truncated: pages.some((page) => page.truncated),
          collectionError:
            pages.find((page) => page.collectionError)?.collectionError ?? null,
        };
      })();
  const items: Array<
    Awaited<ReturnType<typeof collectThingDetail>> &
      ReturnType<typeof factsInWindow>
  > = [];
  const unreadable: { id: string; code: string }[] = [];
  for (const item of listing.items) {
    try {
      const detail = await collectThingDetail(ctx, root, item.id);
      const facts = factsInWindow(
        detail.thing,
        detail.entries,
        window.start,
        window.end,
      );
      items.push({
        ...detail,
        ...facts,
        baseline:
          detail.truncated || detail.consistency === "changed_during_collection"
            ? null
            : facts.baseline,
      });
    } catch {
      unreadable.push({ id: item.id, code: "ITEM_UNREADABLE" });
    }
  }
  const statuses = ["open", "paused", "done"];
  const counts = Object.fromEntries(
    statuses.map((status) => [
      status,
      items.filter((i) => !i.thing.archivedAt && i.thing.status === status)
        .length,
    ]),
  );
  return {
    items,
    counts,
    archivedCount: items.filter((i) => Boolean(i.thing.archivedAt)).length,
    ...(explicitIds.length
      ? { requestedCount: explicitIds.length, unreadable }
      : { unreadableCount: unreadable.length }),
    fetchedCount: items.length,
    truncated:
      listing.truncated ||
      unreadable.length > 0 ||
      items.some((i) => i.truncated),
    collectionError: listing.collectionError,
    consistency: items.some(
      (i) => i.consistency === "changed_during_collection",
    )
      ? "changed_during_collection"
      : "non_transactional",
    collectedAt: new Date().toISOString(),
    window,
  };
}
