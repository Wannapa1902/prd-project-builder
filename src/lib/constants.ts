export const STATUSES = [
  {
    value: "not_started",
    label: "รอดำเนินการ",
    color: "#9CA3AF",
    bg: "bg-[#F0FDF4] text-slate-600",
  },
  {
    value: "in_progress",
    label: "กำลังดำเนินการ",
    color: "#22C55E",
    bg: "bg-[#ECFDF5] text-[#15803D]",
  },
  {
    value: "waiting",
    label: "รอข้อมูล/วัตถุดิบ",
    color: "#DCFCE7",
    bg: "bg-[#DCFCE7] text-[#14532D]",
  },
  { value: "on_hold", label: "ติดปัญหา", color: "#16A34A", bg: "bg-[#BBF7D0]/20 text-[#15803D]" },
  { value: "completed", label: "เสร็จสิ้น", color: "#27AE60", bg: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "ยกเลิก", color: "#BDC3C7", bg: "bg-gray-100 text-gray-500" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "ต่ำ", bg: "bg-[#ECFDF5] text-[#15803D]" },
  { value: "medium", label: "ปานกลาง", bg: "bg-[#F0FDF4] text-[#14532D]" },
  { value: "high", label: "สูง", bg: "bg-[#DCFCE7] text-[#14532D]" },
  { value: "urgent", label: "เร่งด่วน", bg: "bg-[#16A34A] text-white" },
] as const;

export const DEPARTMENTS = ["ผลิต 1", "ผลิต 2", "ผลิต 3", "ผลิต 4", "ผลิต 5", "LDI"];

export const WORK_TYPES = ["ปัญหางานผลิต", "งานทดลอง", "อัพเดทงาน/อื่น"] as const;

export function statusLabel(v: string) {
  return STATUSES.find((s) => s.value === v)?.label ?? v;
}
export function statusBg(v: string) {
  return STATUSES.find((s) => s.value === v)?.bg ?? "bg-slate-100 text-slate-700";
}
export function statusColor(v: string) {
  return STATUSES.find((s) => s.value === v)?.color ?? "#64748b";
}
export function priorityLabel(v: string) {
  return PRIORITIES.find((p) => p.value === v)?.label ?? v;
}
export function priorityBg(v: string) {
  return PRIORITIES.find((p) => p.value === v)?.bg ?? "bg-slate-100 text-slate-600";
}

export function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function formatDateTime(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function workCode(workNo: number) {
  return `W-${String(workNo).padStart(4, "0")}`;
}

export function isOverdue(work: { due_date?: string | null; status: string }) {
  if (!work.due_date || work.status === "completed" || work.status === "cancelled") return false;
  return new Date(work.due_date) < new Date(new Date().toDateString());
}
