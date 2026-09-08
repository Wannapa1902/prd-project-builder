import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { STATUSES, PRIORITIES, DEPARTMENTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/works/new")({
  head: () => ({
    meta: [
      { title: "เพิ่มงานใหม่ | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "สร้างงานใหม่สำหรับฝ่ายผลิต ระบุประเภทงาน ผู้รับผิดชอบ และกำหนดเสร็จ" },
    ],
  }),
  component: NewWorkPage,
});

function NewWorkPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    work_type: "",
    product_lot: "",
    owner_id: "",
    department: "",
    start_date: "",
    due_date: "",
    priority: "medium",
    status: "not_started",
    remark: "",
  });

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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.work_type || !form.owner_id) {
      toast.error("กรุณากรอกหัวข้องาน ประเภทงาน และผู้รับผิดชอบ");
      return;
    }
    setBusy(true);
    const owner = profiles?.find((p) => p.id === form.owner_id);
    const { data, error } = await supabase
      .from("works")
      .insert({
        title: form.title.trim(),
        description: form.description || null,
        work_type: form.work_type,
        product_lot: form.product_lot || null,
        owner_id: form.owner_id,
        owner_name: owner?.display_name || owner?.email || null,
        department: form.department || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        remark: form.remark || null,
        created_by: user?.id,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("เพิ่มงานใหม่เรียบร้อย");
      navigate({ to: "/works/$workId", params: { workId: data.id } });
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-2xl font-bold">เพิ่มงานใหม่</h1>
        <p className="mb-6 text-sm text-muted-foreground">รหัสงานจะถูกสร้างอัตโนมัติเมื่อบันทึก</p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>หัวข้องาน *</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>รายละเอียดงาน</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ประเภทงาน *</Label>
                <Select value={form.work_type} onValueChange={(v) => set("work_type", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกประเภทงาน" /></SelectTrigger>
                  <SelectContent>
                    {workTypes?.map((t) => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>สินค้า / รุ่น / Lot</Label>
                <Input value={form.product_lot} onChange={(e) => set("product_lot", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ผู้รับผิดชอบ *</Label>
                <Select value={form.owner_id} onValueChange={(v) => set("owner_id", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกผู้รับผิดชอบ" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>แผนกที่เกี่ยวข้อง</Label>
                <Select value={form.department} onValueChange={(v) => set("department", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกแผนก" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
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
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>สถานะเริ่มต้น</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>หมายเหตุ</Label>
                <Textarea rows={2} value={form.remark} onChange={(e) => set("remark", e.target.value)} />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกงานใหม่"}</Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/works" })}>ยกเลิก</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
