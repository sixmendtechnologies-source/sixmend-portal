import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

export default function TimeCard({ stats }) {
  const enquiries = stats?.enquiries || {};
  const total = Object.values(enquiries).reduce((a, b) => a + b, 0) || 1;
  const won = enquiries.won || 0;
  const inProgress = enquiries["in-progress"] || 0;
  const winPct = Math.round((won / total) * 100);
  const activePct = Math.round((inProgress / total) * 100);

  const rows = [
    { label: "Win Rate", pct: winPct, color: C.green },
    { label: "Active Rate", pct: activePct, color: C.blueLight },
    { label: "Completion", pct: Math.round(((won) / total) * 100), color: C.teal },
  ];

  return (
    <Card>
      <CardHeader title="Performance" />
      <div className="flex items-center gap-4 text-[11px] mb-3" style={{ color: C.textMuted }}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: C.green }} /> Win Rate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: C.blueLight }} /> Active
        </span>
      </div>
      <div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center text-[12px] py-2">
            <span className="w-28 flex-shrink-0" style={{ color: C.textPrimary }}>
              {r.label}
            </span>
            <span className="w-10 flex-shrink-0" style={{ color: r.color }}>
              {r.pct}%
            </span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: C.border }}>
              {r.pct > 0 && (
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct}%`, background: r.color }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
