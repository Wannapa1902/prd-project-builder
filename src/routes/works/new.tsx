import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { DEPARTMENTS, STATUSES, WORK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/works/new")({
  head: () => ({
    meta: [
      { title: "เพิ่มงานใหม่ | ระบบอัพเดทงานฝ่ายผลิต" },
      {
        name: "description",
        content: "สร้างงานใหม่สำหรับฝ่ายผลิต ระบุประเภทงาน แผนก และสถานะเริ่มต้น",
      },
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
    department: "",
    status: "not_started",
    image_url: "",
    image_name: "",
    attachment_url: "",
    attachment_name: "",
    remark: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function readAttachment(file: File | undefined, kind: "image" | "file") {
    if (!file) {
      setForm((f) => ({
        ...f,
        ...(kind === "image"
          ? { image_url: "", image_name: "" }
          : { attachment_url: "", attachment_name: "" }),
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        ...(kind === "image"
          ? { image_url: String(reader.result ?? ""), image_name: file.name }
          : { attachment_url: String(reader.result ?? ""), attachment_name: file.name }),
      }));
    };
    reader.onerror = () => toast.error("อ่านไฟล์แนบไม่สำเร็จ");
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.work_type) {
      toast.error("กรุณากรอกหัวข้องานและประเภทงาน");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("works")
      .insert({
        title: form.title.trim(),
        description: form.description || null,
        work_type: form.work_type,
        product_lot: null,
        owner_id: null,
        owner_name: null,
        department: form.department || null,
        start_date: null,
        due_date: null,
        priority: "medium",
        status: form.status,
        image_url: form.image_url || null,
        image_name: form.image_name || null,
        attachment_url: form.attachment_url || null,
        attachment_name: form.attachment_name || null,
        remark: form.remark || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("บันทึกไม่สำเร็จ: " + (error?.message ?? "ไม่พบรหัสงานที่สร้าง"));
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
              <div className="grid gap-4 md:col-span-2 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-1.5">
                  <Label>รายละเอียดงาน</Label>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ประเภทงาน *</Label>
                  <div className="space-y-2 rounded-3xl border-2 border-[#ECFDF5] bg-white p-3">
                    {WORK_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex cursor-pointer items-center gap-2 rounded-2xl px-2 py-2 text-sm font-medium text-[#2C3E50] hover:bg-[#F8FAF8]"
                      >
                        <Checkbox
                          checked={form.work_type === type}
                          onCheckedChange={() => set("work_type", type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>แผนกที่เกี่ยวข้อง</Label>
                <Select value={form.department} onValueChange={(v) => set("department", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกแผนก" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>สถานะเริ่มต้น</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>แนบรูปภาพ</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => readAttachment(e.target.files?.[0], "image")}
                />
                {form.image_url && (
                  <div className="overflow-hidden rounded-3xl border-2 border-[#ECFDF5] bg-white p-2 shadow-[0_4px_20px_rgb(34_197_94_/_0.12)]">
                    <img
                      src={form.image_url}
                      alt={form.image_name || "รูปภาพแนบ"}
                      className="max-h-72 w-full rounded-2xl object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>แนบไฟล์</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={(e) => readAttachment(e.target.files?.[0], "file")}
                />
                {form.attachment_name && (
                  <p className="text-xs font-medium text-muted-foreground">
                    ไฟล์ที่เลือก: {form.attachment_name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>หมายเหตุ</Label>
                <Textarea
                  rows={2}
                  value={form.remark}
                  onChange={(e) => set("remark", e.target.value)}
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "กำลังบันทึก..." : "บันทึกงานใหม่"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/works" })}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
