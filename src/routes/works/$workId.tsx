import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  STATUSES, PRIORITIES, DEPARTMENTS, statusBg, statusLabel, priorityBg, priorityLabel,
  formatDate, formatDateTime, workCode, isOverdue,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/works/$workId")({
  head: () => ({
    meta: [
      { title: "รายละเอียดงาน | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "รายละเอียดงานและประวัติการอัพเดทความคืบหน้า" },
    ],
  }),
  component: WorkDetailPage,
});

function WorkDetailPage() {
  const { workId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: work, isLoading } = useQuery({
    queryKey: ["work", workId],
    queryFn: async () => {
      const { data, error } = await supabase.from("works").select("*").eq("id", workId).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: updates } = useQuery({
    queryKey: ["work_updates", workId],
    queryFn: async () => {
      const { data } = await supabase.from("work_updates").select("*").eq("work_id", workId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function deleteWork() {
    if (!confirm("ยืนยันลบงานนี้? ประวัติการอัพเดททั้งหมดจะถูกลบด้วย")) return;
    const { error } = await supabase.from("works").delete().eq("id", workId);
    if (error) toast.error("ลบไม่สำเร็จ (เฉพาะผู้ดูแลระบบ)");
    else {
      toast.success("ลบงานเรียบร้อย");
      navigate({ to: "/works" });
    }
  }

  if (isLoading || !work) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-muted-foreground">กำลังโหลด...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/works"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-primary">{workCode(work.work_no)}</span>
                <Badge variant="secondary" className={statusBg(work.status)}>{statusLabel(work.status)}</Badge>
                <Badge variant="secondary" className={priorityBg(work.priority)}>{priorityLabel(work.priority)}</Badge>
                {isOverdue(work) && <Badge variant="destructive">เกินกำหนด</Badge>}
              </div>
              <h1 className="mt-1 text-xl font-bold">{work.title}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setUpdateOpen(true)}><RefreshCw className="mr-2 h-4 w-4" />อัพเดทความคืบหน้า</Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />แก้ไขงาน</Button>
            <Button variant="ghost" size="icon" onClick={deleteWork}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">รายละเอียดงาน</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">ความคืบหน้า</span>
                  <span className="font-semibold">{work.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${work.progress}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                <Field label="ประเภทงาน" value={work.work_type} />
                <Field label="สินค้า / รุ่น / Lot" value={work.product_lot} />
                <Field label="ผู้รับผิดชอบ" value={work.owner_name} />
                <Field label="แผนก" value={work.department} />
                <Field label="วันที่เริ่ม" value={formatDate(work.start_date)} />
                <Field label="กำหนดเสร็จ" value={formatDate(work.due_date)} />
              </dl>
              {work.description && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">รายละเอียด</div>
                  {work.description}
                </div>
              )}
              {work.remark && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">หมายเหตุ</div>
                  {work.remark}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {work.latest_issue && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">ปัญหาล่าสุด</CardTitle></CardHeader>
                <CardContent className="text-sm text-red-800">{work.latest_issue}</CardContent>
              </Card>
            )}
            {work.next_action && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Action ถัดไป</CardTitle></CardHeader>
                <CardContent className="text-sm text-blue-800">{work.next_action}</CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">ข้อมูลระบบ</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div>สร้างเมื่อ: {formatDateTime(work.created_at)}</div>
                <div>อัพเดทล่าสุด: {formatDateTime(work.updated_at)}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">ประวัติการอัพเดท ({updates?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!updates?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีการอัพเดท</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่อัพเดท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead>ปัญหา</TableHead>
                    <TableHead>Action ถัดไป</TableHead>
                    <TableHead>ผู้อัพเดท</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updates.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(u.created_at)}</TableCell>
                      <TableCell><Badge variant="secondary" className={statusBg(u.status)}>{statusLabel(u.status)}</Badge></TableCell>
                      <TableCell className="text-sm">{u.progress ?? "-"}</TableCell>
                      <TableCell className="max-w-64 text-sm">
                        {u.detail}
                        {u.attachment_url && (
                          <a href={u.attachment_url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">ไฟล์แนบ</a>
                        )}
                      </TableCell>
                      <TableCell className="max-w-48 text-sm text-red-700">{u.issue ?? "-"}</TableCell>
                      <TableCell className="max-w-48 text-sm">{u.next_action ?? "-"}</TableCell>
                      <TableCell className="text-sm">{u.updated_by_name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UpdateDialog
        workId={workId}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        currentStatus={work.status}
        currentProgress={work.progress}
        userId={user?.id ?? null}
        userName={user?.user_metadata?.full_name ?? user?.email ?? ""}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["work", workId] });
          qc.invalidateQueries({ queryKey: ["work_updates", workId] });
          qc.invalidateQueries({ queryKey: ["works"] });
        }}
      />
      <EditWorkDialog
        work={work}
        open={editOpen}
        onOpenChange={setEditOpen}
        onDone={() => qc.invalidateQueries({ queryKey: ["work", workId] })}
      />
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}

export function UpdateDialog({
  workId, open, onOpenChange, currentStatus, currentProgress, userId, userName, onDone,
}: {
  workId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentStatus: string;
  currentProgress: number;
  userId: string | null;
  userName: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    status: currentStatus,
    progress: currentProgress,
    detail: "",
    issue: "",
    next_action: "",
    attachment_url: "",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.detail.trim()) {
      toast.error("กรุณากรอกรายละเอียดความคืบหน้า");
      return;
    }
    setBusy(true);
    const { error: upErr } = await supabase.from("work_updates").insert({
      work_id: workId,
      status: form.status,
      progress: form.progress,
      detail: form.detail.trim(),
      issue: form.issue || null,
      next_action: form.next_action || null,
      attachment_url: form.attachment_url || null,
      updated_by: userId,
      updated_by_name: userName,
    });
    if (!upErr) {
      const { error: wErr } = await supabase.from("works").update({
        status: form.status,
        progress: form.status === "completed" ? 100 : form.progress,
        latest_update: form.detail.trim(),
        latest_issue: form.issue || null,
        next_action: form.next_action || null,
        updated_at: new Date().toISOString(),
      }).eq("id", workId);
      if (wErr) toast.error(wErr.message);
    }
    setBusy(false);
    if (upErr) {
      toast.error("บันทึกไม่สำเร็จ: " + upErr.message);
    } else {
      toast.success("อัพเดทความคืบหน้าเรียบร้อย");
      setForm((f) => ({ ...f, detail: "", issue: "", next_action: "", attachment_url: "" }));
      onOpenChange(false);
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>อัพเดทความคืบหน้า</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>สถานะล่าสุด *</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>% ความคืบหน้า</Label>
              <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => set("progress", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>รายละเอียดความคืบหน้า *</Label>
            <Textarea rows={3} required value={form.detail} onChange={(e) => set("detail", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ปัญหา / อุปสรรค</Label>
            <Textarea rows={2} value={form.issue} onChange={(e) => set("issue", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>การดำเนินการถัดไป (Next Action)</Label>
            <Textarea rows={2} value={form.next_action} onChange={(e) => set("next_action", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ลิงก์ไฟล์แนบ / รูปภาพ</Label>
            <Input type="url" placeholder="https://..." value={form.attachment_url} onChange={(e) => set("attachment_url", e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกการอัพเดท"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditWorkDialog({
  work, open, onOpenChange, onDone,
}: {
  work: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: work.title as string,
    description: (work.description ?? "") as string,
    work_type: work.work_type as string,
    product_lot: (work.product_lot ?? "") as string,
    owner_id: (work.owner_id ?? "") as string,
    department: (work.department ?? "") as string,
    start_date: (work.start_date ?? "") as string,
    due_date: (work.due_date ?? "") as string,
    priority: work.priority as string,
    remark: (work.remark ?? "") as string,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email").order("display_name");
      return data ?? [];
    },
  });
  const { data: workTypes } = useQuery({
    queryKey: ["work_types"],
    queryFn: async () => {
      const { data } = await supabase.from("work_types").select("name").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const owner = profiles?.find((p) => p.id === form.owner_id);
    const { error } = await supabase.from("works").update({
      title: form.title.trim(),
      description: form.description || null,
      work_type: form.work_type,
      product_lot: form.product_lot || null,
      owner_id: form.owner_id || null,
      owner_name: owner ? owner.display_name || owner.email : null,
      department: form.department || null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      priority: form.priority,
      remark: form.remark || null,
      updated_at: new Date().toISOString(),
    }).eq("id", work.id);
    setBusy(false);
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message);
    else {
      toast.success("แก้ไขงานเรียบร้อย");
      onOpenChange(false);
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>แก้ไขข้อมูลงาน</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>หัวข้องาน *</Label>
            <Input required value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>รายละเอียดงาน</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ประเภทงาน *</Label>
            <Select value={form.work_type} onValueChange={(v) => set("work_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {workTypes?.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>สินค้า / รุ่น / Lot</Label>
            <Input value={form.product_lot} onChange={(e) => set("product_lot", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ผู้รับผิดชอบ</Label>
            <Select value={form.owner_id} onValueChange={(v) => set("owner_id", v)}>
              <SelectTrigger><SelectValue placeholder="เลือกผู้รับผิดชอบ" /></SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>แผนก</Label>
            <Select value={form.department} onValueChange={(v) => set("department", v)}>
              <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>วันที่เริ่มงาน</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>วันที่กำหนดเสร็จ</Label>
            <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ความสำคัญ</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Input value={form.remark} onChange={(e) => set("remark", e.target.value)} />
          </div>
          <Button type="submit" className="md:col-span-2" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
