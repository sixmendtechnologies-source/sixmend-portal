import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

export default function WorkloadCard({ stats }) {
  const enquiries = stats?.enquiries || {};

  const workloadData = [
    { label: "New", value: enquiries.new || 0, color: C.gray },
    { label: "In Progress", value: enquiries["in-progress"] || 0, color: C.teal },
    { label: "Quoted", value: enquiries.quoted || 0, color: C.orange },
    { label: "Won", value: enquiries.won || 0, color: C.green },
    { label: "Lost", value: enquiries.lost || 0, color: C.red },
  ];

  const maxVal = Math.max(...workloadData.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader title="Enquiry Workload" />
      <div>
        {workloadData.map((item) => (
          <div key={item.label} className="flex items-center text-[12px] py-2">
            <span className="w-24 flex-shrink-0" style={{ color: C.textPrimary }}>
              {item.label}
            </span>
            <span className="w-8 text-right flex-shrink-0 mr-3" style={{ color: item.color }}>
              {item.value}
            </span>
            <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: C.border }}>
              {item.value > 0 && (
                <div
                  className="h-full"
                  style={{ width: `${(item.value / maxVal) * 100}%`, background: item.color }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex justify-between text-[10px] pt-2 mt-1"
        style={{ color: C.textMuted, borderTop: `1px solid ${C.border}` }}
      >
        {[0, Math.round(maxVal / 4), Math.round(maxVal / 2), Math.round((maxVal * 3) / 4), maxVal].map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </div>
    </Card>
  );
}
