import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, statusLabel, formatDate, workCode } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/meeting-summary")({
  head: () => ({
    meta: [
      { title: "สรุปประชุม | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "สร้างสรุปประชุมอัพเดทความคืบหน้างานฝ่ายผลิตจากข้อมูลงาน" },
    ],
  }),
  component: MeetingSummaryPage,
});

type Work = {
  id: string; work_no: number; title: string; work_type: string; owner_name: string | null;
  due_date: string | null; status: string; progress: number; latest_update: string | null;
  latest_issue: string | null; next_action: string | null; updated_at: string;
};

function MeetingSummaryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [workType, setWorkType] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");

  const { data: works } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const { data } = await supabase.from("works").select("*").order("updated_at", { ascending: false });
      return (data ?? []) as Work[];
    },
  });
  const { data: workTypes } = useQuery({
    queryKey: ["work_types"],
    queryFn: async () => {
      const { data } = await supabase.from("work_types").select("name").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const owners = useMemo(() => [...new Set((works ?? []).map((w) => w.owner_name).filter(Boolean))] as string[], [works]);

  const filtered = useMemo(() => {
    let list = works ?? [];
    if (workType !== "all") list = list.filter((w) => w.work_type === workType);
    if (status !== "all") list = list.filter((w) => w.status === status);
    if (owner !== "all") list = list.filter((w) => w.owner_name === owner);
    // งานที่มีการอัพเดทในช่วงเวลาที่เลือก
    const fromD = new Date(from + "T00:00:00");
    const toD = new Date(to + "T23:59:59");
    return list.filter((w) => {
      const u = new Date(w.updated_at);
      return u >= fromD && u <= toD;
    });
  }, [works, from, to, workType, status, owner]);

  const completed = filtered.filter((w) => w.status === "completed");
  const inProgress = filtered.filter((w) => ["in_progress", "not_started", "waiting"].includes(w.status));
  const issues = filtered.filter((w) => w.status === "on_hold" || w.latest_issue);
  const actionItems = filtered.filter((w) => w.next_action && w.status !== "completed" && w.status !== "cancelled");

  const markdown = useMemo(() => {
    const lines: string[] = [];
    lines.push("# สรุปประชุมอัพเดตความคืบหน้างานฝ่ายผลิต");
    lines.push(`วันที่ประชุม: ${formatDate(to)} (ข้อมูลช่วง ${formatDate(from)} - ${formatDate(to)})`);
    lines.push("");
    lines.push("## 1. งานที่ดำเนินการเสร็จสิ้น");
    if (!completed.length) lines.push("- ไม่มี");
    completed.forEach((w) => lines.push(`- [${workCode(w.work_no)}] ${w.title} - ผู้รับผิดชอบ: ${w.owner_name ?? "-"}`));
    lines.push("");
    lines.push("## 2. งานที่กำลังดำเนินการ");
    if (!inProgress.length) lines.push("- ไม่มี");
    inProgress.forEach((w) => {
      lines.push(`- [${workCode(w.work_no)}] ${w.title}`);
      lines.push(`  สถานะ: ${statusLabel(w.status)} | ความคืบหน้า: ${w.progress}%`);
      if (w.latest_update) lines.push(`  อัพเดทล่าสุด: ${w.latest_update}`);
    });
    lines.push("");
    lines.push("## 3. งานที่ติดปัญหา");
    if (!issues.length) lines.push("- ไม่มี");
    issues.forEach((w) => {
      lines.push(`- [${workCode(w.work_no)}] ${w.title}`);
      if (w.latest_issue) lines.push(`  ปัญหา: ${w.latest_issue}`);
      if (w.next_action) lines.push(`  แนวทางแก้ไข: ${w.next_action}`);
      lines.push(`  ผู้รับผิดชอบ: ${w.owner_name ?? "-"}`);
    });
    lines.push("");
    lines.push("## 4. Action Items");
    lines.push("| Action | ผู้รับผิดชอบ | กำหนดเสร็จ |");
    lines.push("|---|---|---|");
    actionItems.forEach((w) => lines.push(`| ${w.next_action} | ${w.owner_name ?? "-"} | ${formatDate(w.due_date)} |`));
    return lines.join("\n");
  }, [completed, inProgress, issues, actionItems, from, to]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    toast.success("คัดลอกสรุปประชุมแล้ว");
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-summary-${to}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-bold">สรุปประชุมอัพเดทงาน</h1>
        <p className="mb-6 text-sm text-muted-foreground">เลือกช่วงเวลาและเงื่อนไข แล้วคัดลอกรายงานไปใช้ประชุมได้ทันที</p>

        <Card className="mb-4">
          <CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">ตั้งแต่วันที่</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ถึงวันที่</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภทงาน</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {workTypes?.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ผู้รับผิดชอบ</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">พบ {filtered.length} งานที่อัพเดทในช่วงเวลานี้</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyMarkdown}><Copy className="mr-2 h-4 w-4" />คัดลอกรายงาน</Button>
            <Button variant="outline" onClick={downloadMarkdown}><Download className="mr-2 h-4 w-4" />ดาวน์โหลด .md</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">ตัวอย่างรายงาน</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm leading-relaxed">
              {markdown}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
