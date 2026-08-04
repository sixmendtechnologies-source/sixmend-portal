import { C } from "../../utils/colors";

const STATUS_COLORS = {
  // enquiry pipeline stages
  open: { bg: "#1a2a3a", color: C.blueLight },
  first_level_discussion: { bg: "#1a2a2a", color: C.teal },
  kick_off: { bg: "#2a2a1a", color: C.orange },
  agreement: { bg: "#1a1a2a", color: C.purple },
  client: { bg: "#1a2a1a", color: C.green },
  lost: { bg: "#2a1a1a", color: C.red },
  // phase task statuses
  todo: { bg: "#1a2a3a", color: C.blueLight },
  inprogress: { bg: "#2a2a1a", color: C.orange },
  hold: { bg: "#202020", color: C.textMuted },
  completed: { bg: "#1a2a1a", color: C.green },
  // legacy enquiry statuses
  new: { bg: "#1a2a3a", color: C.blueLight },
  "in-progress": { bg: "#1a2a1a", color: C.teal },
  in_progress: { bg: "#1a2a1a", color: C.teal },
  quoted: { bg: "#2a2a1a", color: C.orange },
  won: { bg: "#1a2a1a", color: C.green },
  // client statuses
  active: { bg: "#1a2a1a", color: C.green },
  inactive: { bg: "#2a1a2a", color: C.textMuted },
  prospect: { bg: "#1a1a2a", color: C.purple },
  // payment statuses
  paid: { bg: "#1a2a1a", color: C.green },
  pending: { bg: "#2a2a1a", color: C.orange },
  overdue: { bg: "#2a1a1a", color: C.red },
  // expense statuses
  approved: { bg: "#1a2a1a", color: C.green },
  rejected: { bg: "#2a1a1a", color: C.red },
  // priority
  high: { bg: "#2a1a1a", color: C.red },
  medium: { bg: "#2a2a1a", color: C.orange },
  low: { bg: "#1a2a1a", color: C.green },
};

const LABELS = {
  first_level_discussion: "First Level Discussion",
  kick_off: "Kick Off",
  "in-progress": "In Progress",
  in_progress: "In Progress",
  inprogress: "In Progress",
  todo: "To Do",
  hold: "On Hold",
};

export default function Badge({ value }) {
  const key = value?.toLowerCase();
  const style = STATUS_COLORS[key] || { bg: C.border, color: C.textMuted };
  const label = LABELS[key] || value?.replace(/_/g, " ").replace(/-/g, " ");
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-medium capitalize whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}
