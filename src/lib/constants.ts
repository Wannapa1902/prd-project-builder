export const STATUSES = [
  { value: "not_started", label: "รอดำเนินการ", color: "#64748b", bg: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "กำลังดำเนินการ", color: "#2563eb", bg: "bg-blue-100 text-blue-700" },
  { value: "waiting", label: "รอข้อมูล/วัตถุดิบ", color: "#d97706", bg: "bg-amber-100 text-amber-700" },
  { value: "on_hold", label: "ติดปัญหา", color: "#dc2626", bg: "bg-red-100 text-red-700" },
  { value: "completed", label: "เสร็จสิ้น", color: "#16a34a", bg: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "ยกเลิก", color: "#9ca3af", bg: "bg-gray-100 text-gray-500" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "ต่ำ", bg: "bg-slate-100 text-slate-600" },
  { value: "medium", label: "ปานกลาง", bg: "bg-sky-100 text-sky-700" },
  { value: "high", label: "สูง", bg: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "เร่งด่วน", bg: "bg-red-100 text-red-700" },
] as const;

export const DEPARTMENTS = ["ฝ่ายผลิต", "ฝ่ายวิจัยและพัฒนา", "ฝ่ายคุณภาพ", "ฝ่ายวิศวกรรม", "ฝ่ายจัดซื้อ", "อื่น ๆ"];

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
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
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
