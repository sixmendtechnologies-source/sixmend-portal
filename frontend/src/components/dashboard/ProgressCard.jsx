import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

function ProgressBarRow({ label, pct, color }) {
  return (
    <div className="flex items-center text-[12px] py-2">
      <span className="w-28 flex-shrink-0" style={{ color: C.textPrimary }}>
        {label}
      </span>
      <span className="w-10 flex-shrink-0" style={{ color }}>
        {pct}%
      </span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: C.border }}>
        {pct > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: color, minWidth: 4 }}
          />
        )}
      </div>
    </div>
  );
}

export default function ProgressCard({ stats }) {
  const enquiries = stats?.enquiries || {};
  const total = Object.values(enquiries).reduce((a, b) => a + b, 0) || 1;

  const statuses = [
    { label: "New", key: "new", color: C.blueLight },
    { label: "In Progress", key: "in-progress", color: C.teal },
    { label: "Quoted", key: "quoted", color: C.orange },
    { label: "Won", key: "won", color: C.green },
    { label: "Lost", key: "lost", color: C.red },
  ];

  return (
    <Card>
      <CardHeader title="Enquiry Progress" />
      <div>
        {statuses.map((s) => (
          <ProgressBarRow
            key={s.key}
            label={s.label}
            pct={Math.round(((enquiries[s.key] || 0) / total) * 100)}
            color={s.color}
          />
        ))}
      </div>
    </Card>
  );
}
