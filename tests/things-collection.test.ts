import assert from "node:assert/strict";
import {
  collectThingsPages,
  factsInWindow,
  thingsWindow,
} from "../src/commands/things/collect.js";
import type { RuntimeContext } from "../src/framework/types.js";

const all = Array.from({ length: 215 }, (_, i) => ({ id: String(i) }));
const result = await collectThingsPages(async (cursor) => {
  const offset = Number(cursor ?? 0);
  return {
    items: all.slice(offset, offset + 100),
    nextCursor: offset + 100 < all.length ? String(offset + 100) : null,
  };
});
assert.equal(result.fetchedCount, 215);
assert.equal(result.truncated, false);
const failure = await collectThingsPages(async (cursor) => {
  if (cursor) throw Error("PRIVATE NETWORK BODY");
  return { items: all.slice(0, 100), nextCursor: "100" };
});
assert.equal(failure.fetchedCount, 100);
assert.equal(failure.truncated, true);
assert.ok(!JSON.stringify(failure).includes("PRIVATE"));
assert.equal(
  (await collectThingsPages(async () => ({ items: [], nextCursor: "loop" })))
    .collectionError,
  "CURSOR_DID_NOT_ADVANCE",
);
assert.equal(
  (
    await collectThingsPages(async () => ({
      items: [{ id: "same" }, { id: "same" }],
      nextCursor: null,
    }))
  ).collectionError,
  "DUPLICATE_OR_INVALID_ITEM",
);
assert.equal(
  (
    await collectThingsPages(
      async () => ({ items: all, nextCursor: null }),
      200,
    )
  ).collectionError,
  "COLLECTION_LIMIT",
);
const thing = {
  id: "thing-a",
  status: "done",
  assigneeId: null,
  createdAt: "2026-08-01T00:00:00Z",
  archivedAt: "2026-09-09T00:00:00Z",
};
const entries = [
  {
    id: "1",
    type: "progress",
    content: "基线证据",
    createdAt: "2026-09-06T12:00:00Z",
  },
  {
    id: "2",
    type: "status",
    createdAt: "2026-09-07T00:00:00Z",
    dataJson: { before: "open", after: "done" },
  },
  { id: "3", type: "note", createdAt: "2026-09-07T01:00:00Z" },
  {
    id: "4",
    type: "progress",
    content: "Verified interface result with evidence",
    createdAt: "2026-09-07T02:00:00Z",
  },
  {
    id: "5",
    type: "updated",
    createdAt: "2026-09-07T03:00:00Z",
    dataJson: { title: { before: "旧", after: "新" } },
  },
  {
    id: "6",
    type: "status",
    createdAt: "2026-09-09T00:00:00Z",
    dataJson: { before: "done", after: "archived" },
  },
];
const facts = factsInWindow(
  thing,
  entries,
  "2026-09-07T00:00:00Z",
  "2026-09-09T00:00:00Z",
);
assert.equal(facts.entries.length, 4);
assert.equal(facts.effectiveProgressCount, 1);
assert.equal(facts.baseline?.status, "open");
assert.equal("progress" in (facts.baseline ?? {}), false);
assert.equal(facts.baseline?.archived, false);
assert.equal(facts.lastEffectiveRecordBeforeWindow?.id, "1");
assert.equal(
  factsInWindow(
    { ...thing, createdAt: "2026-09-07T00:00:00Z" },
    entries,
    "2026-09-07T00:00:00Z",
    null,
  ).baseline,
  null,
);
const windowContext = (values: Record<string, string>) =>
  ({ str: (key: string) => values[key] ?? "" }) as RuntimeContext;
assert.equal(thingsWindow(windowContext({})).timeZone, "Asia/Shanghai");
assert.throws(
  () => thingsWindow(windowContext({ from: "2026-09-07T00:00:00+08:00" })),
  /both/,
);
assert.throws(
  () => thingsWindow(windowContext({ from: "2026-09-07", to: "2026-09-14" })),
  /timezone/,
);
assert.throws(
  () => thingsWindow(windowContext({ timeZone: "invalid" })),
  /time-zone/,
);
assert.equal(
  thingsWindow(
    windowContext({
      from: "2026-09-07T00:00:00+08:00",
      to: "2026-09-14T00:00:00+08:00",
    }),
  ).start,
  "2026-09-06T16:00:00.000Z",
);

// Production returns descending pages; calculations must not rely on caller order.
const history = [
  { id: "a", type: "created", createdAt: "2026-09-01T00:00:00Z" },
  { id: "b", type: "progress", createdAt: "2026-09-06T12:00:00Z" },
  {
    id: "c",
    type: "updated",
    createdAt: "2026-09-07T01:00:00Z",
    dataJson: {
      assigneeId: { before: "self", after: "other" },
      tags: { before: ["old"], after: [] },
    },
  },
  {
    id: "d",
    type: "updated",
    createdAt: "2026-09-07T01:00:00Z",
    dataJson: {
      assigneeId: { before: "other", after: "self" },
      tags: { before: [], after: ["new"] },
    },
  },
  {
    id: "e",
    type: "status",
    createdAt: "2026-09-08T00:00:00Z",
    dataJson: { before: "open", after: "paused" },
  },
  {
    id: "f",
    type: "status",
    createdAt: "2026-09-09T00:00:00Z",
    dataJson: { before: "paused", after: "done" },
  },
  {
    id: "g",
    type: "status",
    createdAt: "2026-09-10T00:00:00Z",
    dataJson: { before: "done", after: "archived" },
  },
  {
    id: "h",
    type: "status",
    createdAt: "2026-09-11T00:00:00Z",
    dataJson: { before: "archived", after: "done" },
  },
];
const pages = await collectThingsPages(async (cursor) => ({
  items: [...history].reverse().slice(cursor ? 4 : 0, cursor ? 8 : 4),
  nextCursor: cursor ? null : "next",
}));
for (const input of [history, pages.items]) {
  const before = JSON.stringify(input);
  const result = factsInWindow(
    { ...thing, assigneeId: "self", tags: ["new"], archivedAt: null },
    input,
    "2026-09-07T00:00:00Z",
    "2026-09-09T00:00:00Z",
  );
  assert.deepEqual(result.baseline, {
    status: "open",
    assigneeId: "self",
    tags: ["old"],
    archived: false,
  });
  assert.equal(result.lastEffectiveRecordBeforeWindow?.id, "b");
  assert.deepEqual(
    result.entries.map((entry) => entry.id),
    ["e", "d", "c"],
  );
  assert.equal(JSON.stringify(input), before);
}

console.log(
  "things collection: PASS (215 rows, cursor faults, redaction, progress filtering, baseline, window boundaries)",
);
