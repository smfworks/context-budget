import type { BudgetReport } from "../types";
import { BAND_META } from "../types";
import { barWidthPct } from "../lib/budget";
import { formatStampTime } from "../lib/share";
import { formatCount, formatPct } from "../lib/tokens";

interface BudgetCardProps {
  report: BudgetReport;
}

function barcodeBars(id: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 36; i += 1) {
    const code = id.charCodeAt(i % id.length) + i * 17;
    bars.push(1 + (code % 4));
  }
  return bars;
}

export function BudgetCard({ report }: BudgetCardProps) {
  const meta = BAND_META[report.band];
  const tone = report.empty ? "is-empty" : meta.className;
  const width = barWidthPct(report.pct);
  const cuts = report.cuts.slice(0, 6);
  const head =
    report.headroom < 0
      ? `over by ~${formatCount(Math.abs(report.headroom))}`
      : `~${formatCount(report.headroom)} left`;

  return (
    <article className={`ticket ${tone}`}>
      <div className="ticket-rail" aria-hidden="true" />
      <header className="ticket-head">
        <div>
          <p className="r-kicker">Context window card</p>
          <h2>Context Budget</h2>
        </div>
        <p className="ticket-seq">{report.id}</p>
      </header>

      <div className="perf" aria-hidden="true">
        <span />
      </div>

      <div className="ticket-body">
        <div className="stamp-row">
          <div className={`wax ${tone}`}>
            <div className="wax-ring" />
            <div className="wax-core">
              <span className="wax-kicker">SMF WORKS</span>
              <strong>{report.empty ? "—" : formatPct(report.pct)}</strong>
              <span className="wax-sub">{report.empty ? "AWAIT PASTE" : meta.label}</span>
            </div>
          </div>
          <dl className="codes">
            <div>
              <dt>~Tokens</dt>
              <dd>{report.empty ? "—" : formatCount(report.tokens)}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{report.budgetLabel}</dd>
            </div>
            <div>
              <dt>Headroom</dt>
              <dd>{report.empty ? "—" : head}</dd>
            </div>
          </dl>
        </div>

        <section className="bar-block">
          <p className="r-label">Fill</p>
          <div
            className="bar-track"
            role="img"
            aria-label={
              report.empty
                ? "Empty budget bar"
                : `${formatPct(report.pct)} of ${report.budgetLabel}`
            }
          >
            <div
              className="bar-grad"
              style={{ clipPath: `inset(0 ${Math.max(0, 100 - width)}% 0 0)` }}
            />
          </div>
          <p className="bar-caption">
            {report.empty
              ? "green → yellow → red · chars ÷ 4"
              : `${formatPct(report.pct)} of ${report.budgetLabel} · approx.`}
          </p>
        </section>

        <section className="r-hero">
          <p className="r-label">Summary</p>
          <h3>{report.summary}</h3>
        </section>

        <section className="r-block">
          <p className="r-label">{cuts.length ? "What to cut" : "Cut list"}</p>
          {report.empty ? (
            <p className="r-placeholder">
              GREEN has headroom. YELLOW is tight. RED is critical or over budget.
            </p>
          ) : cuts.length ? (
            <ul>
              {cuts.map((item) => (
                <li key={item.id}>
                  <span className={`mark-tick is-${item.severity}`}>
                    {item.severity === "error" ? "✕" : item.severity === "warn" ? "!" : "·"}
                  </span>
                  <span>
                    <strong>{item.title}.</strong> {item.hint}{" "}
                    <em className="cut-tok">~{formatCount(item.tokens)}</em>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="r-placeholder">No obvious cuts. Still approximate — judgment stays human.</p>
          )}
        </section>

        <section className="coupon">
          <p className="r-label">Lab note</p>
          <p className="coupon-line">Approximate · chars ÷ 4 · not a billing meter · not a tokenizer</p>
        </section>
      </div>

      <div className="perf" aria-hidden="true">
        <span />
      </div>

      <div className="barcode" aria-hidden="true">
        {barcodeBars(report.id).map((widthBar, index) => (
          <i key={index} style={{ width: widthBar }} />
        ))}
      </div>

      <footer className="r-foot">
        <p>Context Budget · SMF Works</p>
        <p className="r-link">smfworks.com</p>
        <p className="r-motto">
          {report.empty ? "Heuristic demo · not a meter" : formatStampTime(report.measuredAt)}
        </p>
        <p className="r-motto">Judgment stays human.</p>
      </footer>
    </article>
  );
}
