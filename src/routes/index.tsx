import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, PauseCircle, Hourglass, CalendarClock, BellOff } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, statusBg, statusLabel, statusColor, formatDate, formatDateTime, workCode, isOverdue } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "ภาพรวมงานฝ่ายผลิต สถานะงาน งานเกินกำหนด และความคืบหน้าล่าสุด" },
      { property: "og:title", content: "ระบบอัพเดทงานฝ่ายผลิต" },
      { property: "og:description", content: "บันทึก ติดตาม และสรุปความคืบหน้างานฝ่ายผลิตแบบเรียลไทม์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const STALE_DAYS = 7;

type Work = {
  id: string; work_no: number; title: string; work_type: string; owner_name: string | null;
  due_date: string | null; status: string; progress: number; latest_update: string | null; updated_at: string;
};

function DashboardPage() {
  const [owner, setOwner] = useState("all");
  const [workType, setWorkType] = useState("all");

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

  const filtered = useMemo(() => {
    let list = works ?? [];
    if (owner !== "all") list = list.filter((w) => w.owner_name === owner);
    if (workType !== "all") list = list.filter((w) => w.work_type === workType);
    return list;
  }, [works, owner, workType]);

  const owners = useMemo(() => [...new Set((works ?? []).map((w) => w.owner_name).filter(Boolean))] as string[], [works]);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    filtered.forEach((w) => { byStatus[w.status] = (byStatus[w.status] ?? 0) + 1; });
    const overdue = filtered.filter(isOverdue);
    const stale = filtered.filter(
      (w) => !["completed", "cancelled"].includes(w.status) &&
        Date.now() - new Date(w.updated_at).getTime() > STALE_DAYS * 864e5
    );
    return { total: filtered.length, byStatus, overdue, stale };
  }, [filtered]);

  const pieData = STATUSES.filter((s) => (stats.byStatus[s.value] ?? 0) > 0).map((s) => ({
    name: s.label, value: stats.byStatus[s.value], color: s.color,
  }));
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((w) => map.set(w.work_type, (map.get(w.work_type) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const cards = [
    { label: "งานทั้งหมด", value: stats.total, icon: ListTodo, cls: "text-slate-600" },
    { label: "กำลังดำเนินการ", value: stats.byStatus["in_progress"] ?? 0, icon: Clock, cls: "text-blue-600" },
    { label: "เสร็จสิ้น", value: stats.byStatus["completed"] ?? 0, icon: CheckCircle2, cls: "text-green-600" },
    { label: "ติดปัญหา", value: stats.byStatus["on_hold"] ?? 0, icon: PauseCircle, cls: "text-red-600" },
    { label: "รอข้อมูล/วัตถุดิบ", value: stats.byStatus["waiting"] ?? 0, icon: Hourglass, cls: "text-amber-600" },
    { label: "เกินกำหนด", value: stats.overdue.length, icon: AlertTriangle, cls: "text-red-600" },
    { label: `ไม่อัพเดทเกิน ${STALE_DAYS} วัน`, value: stats.stale.length, icon: BellOff, cls: "text-orange-600" },
  ];

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard ภาพรวมงานฝ่ายผลิต</h1>
          <p className="text-sm text-muted-foreground">สรุปสถานะงานแบบเรียลไทม์</p>
        </div>
        <div className="flex gap-2">
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-44"><SelectValue placeholder="ผู้รับผิดชอบ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ผู้รับผิดชอบทั้งหมด</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={workType} onValueChange={setWorkType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="ประเภทงาน" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภทงานทั้งหมด</SelectItem>
              {workTypes?.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <c.icon className={`mb-2 h-5 w-5 ${c.cls}`} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">สถานะงาน</CardTitle></CardHeader>
          <CardContent className="h-64">
            {pieData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลงาน</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">จำนวนงานตามประเภทงาน</CardTitle></CardHeader>
          <CardContent className="h-64">
            {barData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลงาน</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="จำนวนงาน" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkMiniTable
          title="งานที่เกินกำหนด"
          icon={<CalendarClock className="h-4 w-4 text-red-600" />}
          works={stats.overdue.slice(0, 8)}
          empty="ไม่มีงานเกินกำหนด"
        />
        <WorkMiniTable
          title="อัพเดทล่าสุด"
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          works={filtered.slice(0, 8)}
          empty="ยังไม่มีงาน"
          showUpdate
        />
      </div>
    </AppLayout>
  );
}

function WorkMiniTable({ title, icon, works, empty, showUpdate }: {
  title: string; icon: React.ReactNode; works: Work[]; empty: string; showUpdate?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {works.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>งาน</TableHead>
                <TableHead>ผู้รับผิดชอบ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>{showUpdate ? "อัพเดท" : "กำหนดเสร็จ"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {works.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link to="/works/$workId" params={{ workId: w.id }} className="hover:underline">
                      <span className="mr-2 font-mono text-xs text-primary">{workCode(w.work_no)}</span>
                      <span className="text-sm font-medium">{w.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{w.owner_name ?? "-"}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusBg(w.status)}>{statusLabel(w.status)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {showUpdate ? formatDateTime(w.updated_at) : (
                      <span className={isOverdue(w) ? "font-semibold text-red-600" : ""}>{formatDate(w.due_date)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
