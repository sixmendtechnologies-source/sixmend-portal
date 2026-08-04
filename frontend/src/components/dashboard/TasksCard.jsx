import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

export default function TasksCard({ stats }) {
  const enquiries = stats?.enquiries || {};
  const data = [
    { name: "New", value: enquiries.new || 0, color: C.gray },
    { name: "In Progress", value: enquiries["in-progress"] || 0, color: C.teal },
    { name: "Quoted", value: enquiries.quoted || 0, color: C.orange },
    { name: "Won", value: enquiries.won || 0, color: C.green },
    { name: "Lost", value: enquiries.lost || 0, color: C.red },
  ].filter((d) => d.value > 0);

  const total = data.reduce((a, b) => a + b.value, 0);

  if (data.length === 0) {
    data.push({ name: "No Data", value: 1, color: C.gray });
  }

  return (
    <Card>
      <CardHeader title="Enquiries" />
      <div className="flex items-center gap-3 text-[11px] mb-2 flex-wrap" style={{ color: C.textMuted }}>
        {[
          { name: "New", color: C.gray },
          { name: "In Progress", color: C.teal },
          { name: "Won", color: C.green },
          { name: "Lost", color: C.red },
        ].map((d) => (
          <span key={d.name} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={55}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: 0 }}
        >
          <span className="text-[22px] font-bold" style={{ color: C.textPrimary }}>{total}</span>
          <span className="text-[11px]" style={{ color: C.textMuted }}>Total</span>
        </div>
      </div>
    </Card>
  );
}
