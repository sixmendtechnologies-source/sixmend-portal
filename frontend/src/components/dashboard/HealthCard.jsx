import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

export default function HealthCard({ stats }) {
  const totalEnquiries = Object.values(stats?.enquiries || {}).reduce((a, b) => a + b, 0);
  const wonEnquiries = stats?.enquiries?.won || 0;
  const totalExpenses = stats?.expenses?.total || 0;

  const rows = [
    { label: "Clients", value: `${stats?.clients || 0} total clients` },
    { label: "Enquiries", value: `${totalEnquiries} total enquiries` },
    { label: "Won", value: `${wonEnquiries} enquiries won` },
    { label: "Expenses", value: `$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total` },
    { label: "Status", value: totalEnquiries > 0 ? `${Math.round((wonEnquiries / totalEnquiries) * 100)}% win rate` : "No enquiries yet" },
  ];

  return (
    <Card>
      <CardHeader title="Health" />
      <div>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex text-[13px] py-2"
            style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}
          >
            <span className="w-28 flex-shrink-0" style={{ color: C.textPrimary }}>
              {r.label}
            </span>
            <span style={{ color: C.textMuted }}>{r.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
