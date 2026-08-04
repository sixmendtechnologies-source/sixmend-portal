import { C } from "../../utils/colors";

export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.border}` }}>
      <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#0d1117" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium"
                style={{ color: C.textMuted, whiteSpace: "nowrap" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center"
                style={{ color: C.textMuted }}
              >
                No records found
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className="transition-colors"
                style={{
                  borderBottom: i < data.length - 1 ? `1px solid ${C.border}` : "none",
                  background: C.card,
                  cursor: onRowClick ? "pointer" : "default",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#161b26")}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.card)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3" style={{ color: C.textPrimary }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
