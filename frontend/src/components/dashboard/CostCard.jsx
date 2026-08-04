import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader } from "../ui/Card";
import { C } from "../../utils/colors";

const CATEGORY_COLORS = {
  Travel: C.blueLight,
  Materials: C.green,
  Labor: C.teal,
  Equipment: C.orange,
  Other: C.purple,
};

export default function CostCard({ stats }) {
  const byCategory = stats?.expenses?.byCategory || {};
  const total = stats?.expenses?.total || 0;

  const data = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value: parseFloat(value) || 0,
    color: CATEGORY_COLORS[name] || C.blueLight,
  }));

  if (data.length === 0) {
    data.push({ name: "No Data", value: 0, color: C.gray });
  }

  const maxVal = Math.max(...data.map((d) => d.value), 100);

  return (
    <Card>
      <CardHeader title="Expenses" />
      <div className="flex items-center gap-4 text-[11px] mb-2" style={{ color: C.textMuted }}>
        <span>Total: <span style={{ color: C.green, fontWeight: 600 }}>${total.toLocaleString()}</span></span>
      </div>
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
            <YAxis
              domain={[0, maxVal]}
              tick={{ fill: C.textMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v === 0 ? "$0" : `$${(v / 1000).toFixed(1)}K`}
            />
            <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: 12 }}
              formatter={(v) => [`$${v.toLocaleString()}`, "Amount"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
