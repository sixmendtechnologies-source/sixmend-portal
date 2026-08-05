import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

function fmt(val) {
  return "₹" + parseFloat(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function PaymentOverviewCard({ stats }) {
  const p = stats?.payments || {};

  const items = [
    { label: "Total Project Value", value: fmt(p.totalProjectValue), color: C.teal },
    { label: "Total Paid", value: fmt(p.totalPaid), color: C.green },
    { label: "Remaining", value: fmt(p.remaining), color: C.orange },
    { label: "Overdue", value: fmt(p.overdue), color: C.red },
  ];

  const totalProjectValue = parseFloat(p.totalProjectValue || 0);
  const totalPaid = parseFloat(p.totalPaid || 0);
  const paidPct = totalProjectValue > 0 ? (totalPaid / totalProjectValue) * 100 : 0;

  return (
    <Card>
      <CardHeader title="Payment Overview" />
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: C.textMuted }}>
              {item.label}
            </span>
            <span className="text-[14px] font-semibold" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: C.textMuted }}>
          <span>Collection progress</span>
          <span style={{ color: C.green }}>{paidPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(paidPct, 100)}%`, background: C.green }}
          />
        </div>
      </div>
    </Card>
  );
}
