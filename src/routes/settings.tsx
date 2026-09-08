import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าระบบ | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "จัดการประเภทงาน ผู้ใช้งาน และสิทธิ์การใช้งาน" },
    ],
  }),
  component: SettingsPage,
});

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Production Staff" },
  { value: "supervisor", label: "Supervisor / Manager" },
  { value: "viewer", label: "Viewer" },
];

function SettingsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [newType, setNewType] = useState("");

  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });
  const { data: workTypes } = useQuery({
    queryKey: ["work_types_all"],
    queryFn: async () => {
      const { data } = await supabase.from("work_types").select("*").order("sort_order");
      return data ?? [];
    },
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email, department").order("created_at");
      return data ?? [];
    },
  });
  const { data: roles } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["work_types_all"] });
    qc.invalidateQueries({ queryKey: ["work_types"] });
    qc.invalidateQueries({ queryKey: ["user_roles"] });
    qc.invalidateQueries({ queryKey: ["is_admin"] });
  };

  async function addType() {
    if (!newType.trim()) return;
    const { error } = await supabase.from("work_types").insert({ name: newType.trim(), sort_order: (workTypes?.length ?? 0) + 1 });
    if (error) toast.error("เพิ่มไม่สำเร็จ (เฉพาะ Admin หรือชื่อซ้ำ)");
    else { toast.success("เพิ่มประเภทงานแล้ว"); setNewType(""); refresh(); }
  }
  async function toggleType(id: string, active: boolean) {
    const { error } = await supabase.from("work_types").update({ is_active: active }).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function deleteType(id: string) {
    if (!confirm("ยืนยันลบประเภทงานนี้?")) return;
    const { error } = await supabase.from("work_types").delete().eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function setRole(userId: string, role: string) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (role !== "none") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as "admin" | "staff" | "supervisor" | "viewer" });
      if (error) { toast.error("ตั้งสิทธิ์ไม่สำเร็จ (เฉพาะ Admin)"); return; }
    }
    toast.success("อัพเดทสิทธิ์แล้ว");
    refresh();
  }
  async function updateDepartment(userId: string, department: string) {
    const { error } = await supabase.from("profiles").update({ department }).eq("id", userId);
    if (error) toast.error(error.message);
    else toast.success("บันทึกแผนกแล้ว");
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card className="mx-auto mt-16 max-w-md">
          <CardHeader>
            <CardTitle>เฉพาะผู้ดูแลระบบ (Admin)</CardTitle>
            <CardDescription>
              หน้านี้สำหรับจัดการประเภทงานและสิทธิ์ผู้ใช้งาน หากคุณเป็น Admin คนแรก ให้แจ้งผู้พัฒนาระบบเพื่อตั้งสิทธิ์ให้บัญชีของคุณ
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ตั้งค่าระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการข้อมูลมาตรฐานและสิทธิ์ผู้ใช้งาน</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ประเภทงาน</CardTitle>
            <CardDescription>ประเภทงานที่เปิดใช้งานจะแสดงในฟอร์มเพิ่มงาน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="ชื่อประเภทงานใหม่..." value={newType} onChange={(e) => setNewType(e.target.value)} />
              <Button onClick={addType}><Plus className="mr-2 h-4 w-4" />เพิ่ม</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อประเภทงาน</TableHead>
                  <TableHead>เปิดใช้งาน</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workTypes?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Switch checked={t.is_active} onCheckedChange={(v) => toggleType(t.id, v)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteType(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ผู้ใช้งานและสิทธิ์</CardTitle>
            <CardDescription>ผู้ใช้ที่เข้าสู่ระบบแล้วจะปรากฏในรายการนี้โดยอัตโนมัติ</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>สิทธิ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((p) => {
                  const role = roles?.find((r) => r.user_id === p.id)?.role ?? "none";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.display_name ?? "-"}
                        {p.id === user?.id && <Badge variant="secondary" className="ml-2">คุณ</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-40"
                          defaultValue={p.department ?? ""}
                          placeholder="ระบุแผนก"
                          onBlur={(e) => e.target.value !== (p.department ?? "") && updateDepartment(p.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={role} onValueChange={(v) => setRole(p.id, v)}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">ยังไม่กำหนด</SelectItem>
                            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
