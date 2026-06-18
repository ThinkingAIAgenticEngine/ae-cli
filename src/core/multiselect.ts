/**
 * 终端多选交互
 *
 * 改造自 src/commands/config.ts:186 的单选骨架。键位：
 *   ↑↓ / j k         移动光标
 *   space            切换当前项
 *   a / A            全选 / 全不选
 *   enter            确认（至少 1 项）
 *   q / esc / ctrl+c 取消
 *
 * 同分组项连续渲染，组首会输出标题行；非 TTY 环境直接抛错（CLI 无法静默勾选）。
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
    super('用户取消选择');
    this.name = 'MultiselectCancelled';
  }
}

interface RenderRow<T> {
  kind: 'header' | 'item';
  groupLabel?: string;
  itemIndex?: number; // 在 items 数组中的下标
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
      new Error('ae-cli sync 需要 TTY 才能进行多选；请在交互式终端中运行'),
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
    return rows.length + 2; // 标题 + 空行 + 行
  }

  function render() {
    if (renderCount > 0) {
      stderr.write(`\x1B[${totalLines()}A`);
    }
    stderr.write(`${title}  (space 选择 · a 全选/全不选 · enter 确认 · q 取消)\x1B[K\n`);
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
 * 单选复选框交互（用于模型切换这类需要先空格选中、再回车确认的场景）。
 */
export function promptSingleCheckboxSelect<T>(opts: {
  title: string;
  items: SingleCheckboxItem<T>[];
}): Promise<T> {
  const { title, items } = opts;
  if (items.length === 0) return Promise.reject(new Error('无可选项'));
  const stderr = process.stderr;
  const stdin = process.stdin;
  if (!stdin.isTTY) return Promise.reject(new Error('需要 TTY 才能进行单选'));

  const preselectedIndex = items.findIndex((item) => item.preselected);
  let cursor = preselectedIndex >= 0 ? preselectedIndex : 0;
  let selected: number | null = preselectedIndex >= 0 ? preselectedIndex : null;
  let renderCount = 0;
  const lines = items.length + 2;

  function render() {
    if (renderCount > 0) stderr.write(`\x1B[${lines}A`);
    stderr.write(`${title}  (space 选择 · enter 确认 · q 取消)\x1B[K\n`);
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
 * 简单单选（用于 skills/mcp/both 这类小集合）。
 */
export function promptSingleSelect<T>(opts: {
  title: string;
  items: { value: T; label: string }[];
}): Promise<T> {
  const { title, items } = opts;
  if (items.length === 0) return Promise.reject(new Error('无可选项'));
  const stderr = process.stderr;
  const stdin = process.stdin;
  if (!stdin.isTTY) return Promise.reject(new Error('需要 TTY 才能进行单选'));

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
