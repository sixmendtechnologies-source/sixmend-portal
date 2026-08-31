import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../../utils/colors";

export default function Pagination({ total, page, pageSize, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1 py-2 flex-wrap gap-3">
      <div className="flex items-center gap-2 text-[12px]" style={{ color: C.textMuted }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="px-2 py-1 rounded-md text-[12px] outline-none"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3 text-[12px]" style={{ color: C.textMuted }}>
        <span>{total === 0 ? "0" : `${from}–${to}`} of {total}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <ChevronLeft size={14} style={{ color: C.textPrimary }} />
          </button>
          <span className="px-2 py-0.5 rounded-md text-[12px] font-medium" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <ChevronRight size={14} style={{ color: C.textPrimary }} />
          </button>
        </div>
      </div>
    </div>
  );
}
