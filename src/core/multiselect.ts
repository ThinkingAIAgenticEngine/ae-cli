/**
 * Terminal multi-select interaction
 *
 * Adapted from the single-select skeleton in src/commands/config.ts:186. Key bindings:
 *   ↑↓ / j k         move cursor
 *   space            toggle current item
 *   a / A            select all / deselect all
 *   enter            confirm (at least 1 item required)
 *   q / esc / ctrl+c cancel
 *
 * Items in the same group are rendered consecutively with a group header; non-TTY environments
 * throw immediately (silent checkbox selection is not possible in a CLI).
 */

export interface MultiselectItem<T> {
  value: T;
  label: string;
  group?: string;
  hint?: string;
  preselected?: boolean;
}

export interface SingleCheckboxItem<T> {
  value: T;
  label: string;
  hint?: string;
  preselected?: boolean;
}

export class MultiselectCancelled extends Error {
  constructor() {
    super('Selection cancelled by user');
    this.name = 'MultiselectCancelled';
  }
}

interface RenderRow<T> {
  kind: 'header' | 'item';
  groupLabel?: string;
  itemIndex?: number; // index in the items array
  item?: MultiselectItem<T>;
}

function buildRows<T>(items: MultiselectItem<T>[]): RenderRow<T>[] {
  const rows: RenderRow<T>[] = [];
  let lastGroup: string | undefined;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.group && it.group !== lastGroup) {
      rows.push({ kind: 'header', groupLabel: it.group });
      lastGroup = it.group;
    }
    rows.push({ kind: 'item', itemIndex: i, item: it });
  }
  return rows;
}

export function promptMultiselect<T>(opts: {
  title: string;
  items: MultiselectItem<T>[];
}): Promise<T[]> {
  const { title, items } = opts;
  if (items.length === 0) {
    return Promise.resolve([]);
  }

  const stderr = process.stderr;
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return Promise.reject(
      new Error('ae-cli sync requires a TTY for multi-select; please run in an interactive terminal'),
    );
  }

  const rows = buildRows(items);
  const itemRowIndices: number[] = [];
  rows.forEach((r, idx) => {
    if (r.kind === 'item') itemRowIndices.push(idx);
  });

  const selected = new Set<number>();
  items.forEach((it, idx) => {
    if (it.preselected) selected.add(idx);
  });

  let cursorRowIdx = itemRowIndices[0];
  let renderCount = 0;

  function totalLines(): number {
    return rows.length + 2; // title + blank line + rows
  }

  function render() {
    if (renderCount > 0) {
      stderr.write(`\x1B[${totalLines()}A`);
    }
    stderr.write(`${title}  (space: select · a: select all/none · enter: confirm · q: cancel)\x1B[K\n`);
    stderr.write(`\x1B[K\n`);
    rows.forEach((row, ridx) => {
      if (row.kind === 'header') {
        stderr.write(`  \x1B[90m── ${row.groupLabel} ──\x1B[0m\x1B[K\n`);
        return;
      }
      const isCursor = ridx === cursorRowIdx;
      const isSelected = selected.has(row.itemIndex!);
      const pointer = isCursor ? '\x1B[36m❯\x1B[0m' : ' ';
      const checkbox = isSelected ? '\x1B[32m[x]\x1B[0m' : '[ ]';
      const label = row.item!.label;
      const hint = row.item!.hint ? ` \x1B[90m${row.item!.hint}\x1B[0m` : '';
      stderr.write(`${pointer} ${checkbox} ${label}${hint}\x1B[K\n`);
    });
    renderCount++;
  }

  return new Promise<T[]>((resolve, reject) => {
    stderr.write('\x1B[?25l'); // hide cursor
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\x1B[?25h');
    }

    function moveCursor(direction: 1 | -1) {
      const cur = itemRowIndices.indexOf(cursorRowIdx);
      const next = (cur + direction + itemRowIndices.length) % itemRowIndices.length;
      cursorRowIdx = itemRowIndices[next];
      render();
    }

    function toggleAll() {
      if (selected.size === items.length) {
        selected.clear();
      } else {
        items.forEach((_, idx) => selected.add(idx));
      }
      render();
    }

    function onData(key: string) {
      if (key === '\x1B[A' || key === 'k') {
        moveCursor(-1);
      } else if (key === '\x1B[B' || key === 'j') {
        moveCursor(1);
      } else if (key === ' ') {
        const row = rows[cursorRowIdx];
        if (row.kind === 'item') {
          const idx = row.itemIndex!;
          if (selected.has(idx)) selected.delete(idx);
          else selected.add(idx);
          render();
        }
      } else if (key === 'a' || key === 'A') {
        toggleAll();
      } else if (key === '\r' || key === '\n') {
        if (selected.size === 0) {
          stderr.write('\x07'); // beep
          return;
        }
        cleanup();
        const result = Array.from(selected).map((i) => items[i].value);
        resolve(result);
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\x03') {
        cleanup();
        reject(new MultiselectCancelled());
      }
    }

    stdin.on('data', onData);
    render();
  });
}

/**
 * Single-item checkbox interaction (for scenarios like model switching where the user
 * must first press space to select, then enter to confirm).
 */
export function promptSingleCheckboxSelect<T>(opts: {
  title: string;
  items: SingleCheckboxItem<T>[];
}): Promise<T> {
  const { title, items } = opts;
  if (items.length === 0) return Promise.reject(new Error('No items to select'));
  const stderr = process.stderr;
  const stdin = process.stdin;
  if (!stdin.isTTY) return Promise.reject(new Error('A TTY is required for single-select'));

  const preselectedIndex = items.findIndex((item) => item.preselected);
  let cursor = preselectedIndex >= 0 ? preselectedIndex : 0;
  let selected: number | null = preselectedIndex >= 0 ? preselectedIndex : null;
  let renderCount = 0;
  const lines = items.length + 2;

  function render() {
    if (renderCount > 0) stderr.write(`\x1B[${lines}A`);
    stderr.write(`${title}  (space: select · enter: confirm · q: cancel)\x1B[K\n`);
    stderr.write(`\x1B[K\n`);
    items.forEach((it, idx) => {
      const pointer = idx === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
      const checkbox = selected === idx ? '\x1B[32m[x]\x1B[0m' : '[ ]';
      const hint = it.hint ? ` \x1B[90m${it.hint}\x1B[0m` : '';
      stderr.write(`${pointer} ${checkbox} ${it.label}${hint}\x1B[K\n`);
    });
    renderCount++;
  }

  return new Promise<T>((resolve, reject) => {
    stderr.write('\x1B[?25l');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\x1B[?25h');
    }

    function moveCursor(direction: 1 | -1) {
      cursor = (cursor + direction + items.length) % items.length;
      render();
    }

    function onData(key: string) {
      if (key === '\x1B[A' || key === 'k') {
        moveCursor(-1);
      } else if (key === '\x1B[B' || key === 'j') {
        moveCursor(1);
      } else if (key === ' ') {
        selected = cursor;
        render();
      } else if (key === '\r' || key === '\n') {
        if (selected === null) {
          stderr.write('\x07');
          return;
        }
        cleanup();
        resolve(items[selected].value);
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\x03') {
        cleanup();
        reject(new MultiselectCancelled());
      }
    }

    stdin.on('data', onData);
    render();
  });
}

/**
 * Simple single-select prompt (for small sets like skills/mcp/both).
 */
export function promptSingleSelect<T>(opts: {
  title: string;
  items: { value: T; label: string }[];
}): Promise<T> {
  const { title, items } = opts;
  if (items.length === 0) return Promise.reject(new Error('No items to select'));
  const stderr = process.stderr;
  const stdin = process.stdin;
  if (!stdin.isTTY) return Promise.reject(new Error('A TTY is required for single-select'));

  let cursor = 0;
  let renderCount = 0;
  const lines = items.length + 1;

  function render() {
    if (renderCount > 0) stderr.write(`\x1B[${lines}A`);
    stderr.write(`${title}\x1B[K\n`);
    items.forEach((it, idx) => {
      const pointer = idx === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
      stderr.write(`${pointer} ${it.label}\x1B[K\n`);
    });
    renderCount++;
  }

  return new Promise<T>((resolve, reject) => {
    stderr.write('\x1B[?25l');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\x1B[?25h');
    }

    function onData(key: string) {
      if (key === '\x1B[A' || key === 'k') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key === '\x1B[B' || key === 'j') {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve(items[cursor].value);
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\x03') {
        cleanup();
        reject(new MultiselectCancelled());
      }
    }

    stdin.on('data', onData);
    render();
  });
}
