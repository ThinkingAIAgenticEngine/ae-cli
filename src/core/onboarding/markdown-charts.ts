type Point = { label: string; value: number };
type Transition = { dropoff_accounts: number; conversion_rate: number | null };

const barWidth = 12;
const ringMarks = ['█', '▒'];
const stackedMarks = ['🟦', '🟪', '⬜'];

function share(value: number, total: number): string {
  return total ? `${(value * 100 / total).toFixed(1)}%` : '—';
}

export function comparisonMarkdown(points: { label: string; value: number | null }[], maximum: number, percent = false): string {
  const rows = points.map(({ label, value }) => {
    const width = value === null || !maximum ? 0 : Math.round(value * barWidth / maximum);
    const exact = value === null ? '—' : percent ? `${value.toFixed(1)}%` : String(value);
    return `| ${label} | ${exact} | ${'🟦'.repeat(width)} |`;
  });
  return ['| Group | Value | Scale |', '| --- | ---: | --- |', ...rows].join('\n');
}

function compositionTable(points: readonly Point[], total: number, marks: string[]): string {
  return ['| Group | Players | Share |', '| --- | ---: | ---: |', ...points.map(({ label, value }, index) =>
    `| ${marks[index]} ${label} | ${value} | ${share(value, total)} |`)].join('\n');
}

export function checkoutRingMarkdown(points: readonly [Point, Point]): string | null {
  const total = points[0].value + points[1].value;
  if (!total) return null;
  const firstShare = points[0].value / total;
  const rows: string[] = [];
  for (let y = -4; y <= 4; y += 1) {
    let row = '';
    for (let x = -9; x <= 9; x += 1) {
      const radius = Math.hypot(x / 2, y);
      const angle = (Math.atan2(x / 2, -y) + 2 * Math.PI) % (2 * Math.PI);
      row += radius < 2.7 || radius > 4.5 ? ' ' : ringMarks[angle / (2 * Math.PI) < firstShare ? 0 : 1];
    }
    rows.push(row.trimEnd());
  }
  return ['```text', ...rows, '```', '', compositionTable(points, total, ringMarks)].join('\n');
}

export function audienceShareMarkdown(points: readonly [Point, Point, Point]): string | null {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  if (!total) return null;
  const width = 20;
  let cumulative = 0;
  let previousBoundary = 0;
  const marks = points.map(({ value }, index) => {
    cumulative += value;
    const boundary = Math.round(cumulative * width / total);
    const segment = stackedMarks[index].repeat(boundary - previousBoundary);
    previousBoundary = boundary;
    return segment;
  }).join('');
  return `${marks}\n\n${compositionTable(points, total, stackedMarks)}`;
}

export function dailyTrendMarkdown(points: Point[]): string {
  const levels = 6;
  const counts = points.map(point => point.value);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const step = Math.max(1, Math.ceil((maximum - minimum) / levels));
  const baseline = Math.max(0, maximum - step * levels);
  const spacing = 6;
  const grid = Array.from({ length: levels + 1 }, () => Array<string>((points.length - 1) * spacing + 1).fill(' '));
  const heights = counts.map(value => Math.round((value - baseline) / step));
  for (let index = 1; index < heights.length; index += 1) {
    const rise = heights[index] - heights[index - 1];
    for (let offset = 1; offset < spacing; offset += 1) {
      const height = Math.round(heights[index - 1] + rise * offset / spacing);
      const before = Math.round(heights[index - 1] + rise * (offset - 1) / spacing);
      const after = Math.round(heights[index - 1] + rise * (offset + 1) / spacing);
      const stroke = before === after ? '─' : rise > 0 ? '╱' : '╲';
      grid[levels - height][(index - 1) * spacing + offset] = stroke;
    }
  }
  heights.forEach((height, index) => { grid[levels - height][index * spacing] = '●'; });
  const labelWidth = String(baseline + step * levels).length;
  const dates = points.map(point => point.label.slice(5).replace('-', '/'));
  const axis = grid.map((row, index) =>
    `${String(baseline + (levels - index) * step).padStart(labelWidth)} │ ${row.join('')}`.trimEnd());
  const table = [
    `| Date | ${dates.join(' | ')} |`,
    `| --- | ${dates.map(() => '---:').join(' | ')} |`,
    `| Viewers | ${points.map(point => point.value).join(' | ')} |`,
  ];
  return ['```text', ...axis, `${' '.repeat(labelWidth + 1)} └${'─'.repeat(grid[0].length + 2)}`,
    `${' '.repeat(labelWidth + 1)}${dates.join(' ')}`, '```', '', ...table].join('\n');
}

export function funnelMarkdown(points: Point[], transitions: Transition[]): string {
  const peak = points[0].value;
  const rows = points.map(({ label, value }, index) => {
    const width = peak ? Math.round(value * barWidth / peak) : 0;
    const transition = transitions[index - 1];
    const rate = transition?.conversion_rate;
    return `| ${label} | ${value} | ${'━'.repeat(width)} | ${transition?.dropoff_accounts ?? '—'} | ${rate == null ? '—' : share(rate, 1)} |`;
  });
  return ['| Step | Players | Scale | Drop-off | Conversion |', '| --- | ---: | :---: | ---: | ---: |', ...rows].join('\n');
}
