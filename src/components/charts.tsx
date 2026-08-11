'use client';

/**
 * Chart primitives, built as plain SVG/HTML — no charting dependency.
 *
 * Both forms are single-measure magnitude displays, so they use one hue and
 * label every mark directly; identity never rests on colour alone. The status
 * hues come from the validated `--chart-*` tokens, not the UI status colours.
 */
export type BarDatum = { label: string; value: number; tone?: BarTone };
export type BarTone = 'primary' | 'ok' | 'warn' | 'bad' | 'info';

const BAR_FILL: Record<BarTone, string> = {
  primary: 'bg-chart-primary',
  ok: 'bg-chart-ok',
  warn: 'bg-chart-warn',
  bad: 'bg-chart-bad',
  info: 'bg-chart-info',
};

/** Horizontal labelled bars — the readable default for category magnitudes. */
export function BarList({ data, format }: { data: BarDatum[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-subtle">No data in this period.</p>;
  }
  return (
    <ul className="mt-3 space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg-muted">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-fg">
              {format ? format(d.value) : d.value}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-chart-track">
            <div
              className={`h-full rounded-full ${BAR_FILL[d.tone ?? 'primary']}`}
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Column chart for a dated series. Built from flex children rather than a
 * stretched SVG so a two-point series renders as two columns, not two slabs,
 * and the rounded data-ends stay square. Each column carries a native `title`
 * so every mark has a hover readout without a tooltip library.
 */
export function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-fg-subtle">No activity in this period.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <figure className="mt-3">
      <div
        className="flex h-40 items-end gap-1"
        role="img"
        aria-label={`Column chart, ${data.length} periods, peak ${peak.value} on ${peak.label}`}>
        {data.map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${d.value}`}
            className="flex h-full max-w-10 flex-1 cursor-default flex-col justify-end">
            <div
              className="rounded-t bg-chart-primary transition-opacity hover:opacity-70"
              style={{ height: `${d.value === 0 ? 0 : Math.max(3, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between gap-4 text-xs text-fg-subtle">
        <span>{data[0].label}</span>
        <span className="font-medium text-fg-muted">
          peak {peak.value} · {peak.label}
        </span>
        <span>{data[data.length - 1].label}</span>
      </figcaption>
    </figure>
  );
}
