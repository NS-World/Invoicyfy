import { Chip } from "@mui/material";

const COLORS = {
  pending: ["#fff4e5", "#ed6c02"],
  approved: ["#e3f2fd", "#1976d2"],
  invoiced: ["#e6f4ea", "#2e7d32"],
  cancelled: ["#fdecea", "#d32f2f"],
  paid: ["#e6f4ea", "#2e7d32"],
  partial: ["#e3f2fd", "#1976d2"],
  unpaid: ["#fff4e5", "#ed6c02"],
  overdue: ["#fdecea", "#d32f2f"],
  active: ["#e6f4ea", "#2e7d32"],
  inactive: ["#eeeeee", "#616161"],
  tax: ["#ede7f6", "#5e35b1"],
  retail: ["#e0f2f1", "#00695c"],
  sending: ["#e3f2fd", "#1976d2"],
  completed: ["#e6f4ea", "#2e7d32"],
  stopped: ["#eeeeee", "#616161"],
  sent: ["#e6f4ea", "#2e7d32"],
  failed: ["#fdecea", "#d32f2f"],
  skipped: ["#eeeeee", "#616161"],
};

export default function StatusChip({ status, label, size = "small" }) {
  const key = String(status || "").toLowerCase();
  const [bg, fg] = COLORS[key] || ["#eee", "#555"];
  return (
    <Chip
      label={label || status}
      size={size}
      sx={{ fontWeight: 700, bgcolor: bg, color: fg, borderRadius: "6px" }}
    />
  );
}
