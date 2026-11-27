type Point = { label: string; value: number };
type Transition = { dropoff_accounts: number; conversion_rate: number | null };

const barWidth = 12;
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

export function checkoutShareMarkdown(points: readonly [Point, Point]): string | null {
  const total = points[0].value + points[1].value;
  if (!total) return null;
  const [unpaidMark, otherMark] = stackedMarks;
  const unpaidWidth = Math.round(points[0].value * barWidth / total);
  const bar = unpaidMark.repeat(unpaidWidth) + otherMark.repeat(barWidth - unpaidWidth);
  return `${bar}\n\n${compositionTable(points, total, [unpaidMark, otherMark])}`;
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

export function dailyViewerChangesMarkdown(points: readonly Point[]): string {
  const rows = points.map(({ label, value }, index) => {
    const date = label.slice(5).replace('-', '/');
    const previousDay = points[index - 1];
    let change = '—';
    if (previousDay) {
      const difference = value - previousDay.value;
      change = difference === 0 ? 'No change' : `${difference > 0 ? '↑' : '↓'} ${Math.abs(difference)}`;
    }
    return `| ${date} | ${value} | ${change} |`;
  });
  return ['| Date | Viewers | Change vs prior day |', '| --- | ---: | ---: |', ...rows].join('\n');
}

export function purchasePathMarkdown(points: readonly Point[], transitions: readonly Transition[]): string {
  const path = points.map(({ label, value }) => `**${value}** ${label}`).join(' → ');
  const details = points.slice(1).map(({ label }, index) => {
    const transition = transitions[index];
    const rate = transition?.conversion_rate;
    const conversion = rate == null ? '—' : share(rate, 1);
    return `${points[index].label} → ${label} **${conversion}** (${transition?.dropoff_accounts ?? '—'} lost)`;
  });
  return `${path}\n\n${details.join(' · ')}`;
}
