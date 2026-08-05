import { C } from "../../utils/colors";

const STATUS_COLORS = {
  // enquiry pipeline stages
  open: { bg: "var(--badge-blue-bg)", color: C.blueLight },
  first_level_discussion: { bg: "var(--badge-teal-bg)", color: C.teal },
  kick_off: { bg: "var(--badge-orange-bg)", color: C.orange },
  agreement: { bg: "var(--badge-purple-bg)", color: C.purple },
  client: { bg: "var(--badge-green-bg)", color: C.green },
  lost: { bg: "var(--badge-red-bg)", color: C.red },
  // phase task statuses
  todo: { bg: "var(--badge-blue-bg)", color: C.blueLight },
  inprogress: { bg: "var(--badge-orange-bg)", color: C.orange },
  hold: { bg: "var(--badge-gray-bg)", color: C.textMuted },
  completed: { bg: "var(--badge-green-bg)", color: C.green },
  // legacy enquiry statuses
  new: { bg: "var(--badge-blue-bg)", color: C.blueLight },
  "in-progress": { bg: "var(--badge-green-bg)", color: C.teal },
  in_progress: { bg: "var(--badge-green-bg)", color: C.teal },
  quoted: { bg: "var(--badge-orange-bg)", color: C.orange },
  won: { bg: "var(--badge-green-bg)", color: C.green },
  // client statuses
  active: { bg: "var(--badge-green-bg)", color: C.green },
  inactive: { bg: "var(--badge-pink-bg)", color: C.textMuted },
  prospect: { bg: "var(--badge-purple-bg)", color: C.purple },
  // payment statuses
  paid: { bg: "var(--badge-green-bg)", color: C.green },
  pending: { bg: "var(--badge-orange-bg)", color: C.orange },
  overdue: { bg: "var(--badge-red-bg)", color: C.red },
  // expense statuses
  approved: { bg: "var(--badge-green-bg)", color: C.green },
  rejected: { bg: "var(--badge-red-bg)", color: C.red },
  // user statuses & roles
  invited: { bg: "var(--badge-orange-bg)", color: C.orange },
  admin: { bg: "var(--badge-teal-bg)", color: C.teal },
  member: { bg: "var(--badge-gray-bg)", color: C.textMuted },
  // priority
  high: { bg: "var(--badge-red-bg)", color: C.red },
  medium: { bg: "var(--badge-orange-bg)", color: C.orange },
  low: { bg: "var(--badge-green-bg)", color: C.green },
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
