import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUSES,
  statusBg,
  statusLabel,
  statusColor,
  formatDate,
  formatDateTime,
  workCode,
} from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | ระบบอัพเดทงานฝ่ายผลิต" },
      {
        name: "description",
        content: "ภาพรวมงานฝ่ายผลิต สถานะงาน งานเกินกำหนด และความคืบหน้าล่าสุด",
      },
      { property: "og:title", content: "ระบบอัพเดทงานฝ่ายผลิต" },
      {
        property: "og:description",
        content: "บันทึก ติดตาม และสรุปความคืบหน้างานฝ่ายผลิตแบบเรียลไทม์",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

type Work = {
  id: string;
  work_no: number;
  title: string;
  work_type: string;
  owner_name: string | null;
  due_date: string | null;
  status: string;
  progress: number;
  latest_update: string | null;
  updated_at: string;
};

function DashboardPage() {
  const [owner, setOwner] = useState("all");
  const [workType, setWorkType] = useState("all");

  const { data: works } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const { data } = await supabase
        .from("works")
        .select("*")
        .order("updated_at", { ascending: false });
      return (data ?? []) as Work[];
    },
  });
  const { data: workTypes } = useQuery({
    queryKey: ["work_types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("work_types")
        .select("name")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = works ?? [];
    if (owner !== "all") list = list.filter((w) => w.owner_name === owner);
    if (workType !== "all") list = list.filter((w) => w.work_type === workType);
    return list;
  }, [works, owner, workType]);

  const owners = useMemo(
    () => [...new Set((works ?? []).map((w) => w.owner_name).filter(Boolean))] as string[],
    [works],
  );

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    filtered.forEach((w) => {
      byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
    });
    return { total: filtered.length, byStatus };
  }, [filtered]);

  const pieData = STATUSES.filter((s) => (stats.byStatus[s.value] ?? 0) > 0).map((s) => ({
    name: s.label,
    value: stats.byStatus[s.value],
    color: s.color,
  }));
  const barData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((w) => map.set(w.work_type, (map.get(w.work_type) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const cards = [
    { label: "งานทั้งหมด", value: stats.total, icon: ListTodo, cls: "text-slate-600" },
    {
      label: "กำลังดำเนินการ",
      value: stats.byStatus["in_progress"] ?? 0,
      icon: Clock,
      cls: "text-green-600",
    },
    {
      label: "เสร็จสิ้น",
      value: stats.byStatus["completed"] ?? 0,
      icon: CheckCircle2,
      cls: "text-green-600",
    },
  ];

  return (
    <AppLayout>
      <div className="mb-6 rounded-[32px] bg-gradient-to-br from-[#22C55E] to-[#15803D] p-6 text-white shadow-[0_4px_20px_rgb(34_197_94_/_0.3)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              🎯 Production Dashboard
            </p>
            <h1 className="text-3xl font-extrabold tracking-wide">ภาพรวมงานฝ่ายผลิต</h1>
            <p className="mt-2 text-sm font-medium text-white/80">สรุปสถานะงานแบบเรียลไทม์</p>
          </div>
          <div className="rounded-3xl border-2 border-white/25 bg-black/15 px-5 py-3 text-right">
            <div className="text-xs font-bold text-white/70">งานทั้งหมด</div>
            <div className="text-4xl font-extrabold text-[#DCFCE7]">{stats.total}</div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-44 border-white/40 bg-white/95 text-foreground">
              <SelectValue placeholder="ผู้รับผิดชอบ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ผู้รับผิดชอบทั้งหมด</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={workType} onValueChange={setWorkType}>
            <SelectTrigger className="w-48 border-white/40 bg-white/95 text-foreground">
              <SelectValue placeholder="ประเภทงาน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภทงานทั้งหมด</SelectItem>
              {workTypes?.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <c.icon className={`mb-2 h-5 w-5 ${c.cls}`} />
              <div className="text-3xl font-extrabold text-[#15803D]">{c.value}</div>
              <div className="text-xs font-bold text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flip-section-title text-base">📊 สถานะงาน</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {pieData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลงาน</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flip-section-title text-base">🃏 จำนวนงานตามประเภทงาน</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {barData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลงาน</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="จำนวนงาน" fill="#22C55E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <WorkMiniTable
          title="อัพเดทล่าสุด"
          icon={<Clock className="h-4 w-4 text-green-600" />}
          works={filtered.slice(0, 8)}
          empty="ยังไม่มีงาน"
          showUpdate
        />
      </div>
    </AppLayout>
  );
}

function WorkMiniTable({
  title,
  icon,
  works,
  empty,
  showUpdate,
}: {
  title: string;
  icon: React.ReactNode;
  works: Work[];
  empty: string;
  showUpdate?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flip-section-title text-base">
          {icon}
          {title}
        </CardTitle>
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
                <TableHead>อัพเดท</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {works.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link to="/works/$workId" params={{ workId: w.id }} className="hover:underline">
                      <span className="mr-2 font-mono text-xs text-primary">
                        {workCode(w.work_no)}
                      </span>
                      <span className="text-sm font-medium">{w.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{w.owner_name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusBg(w.status)}>
                      {statusLabel(w.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {showUpdate ? formatDateTime(w.updated_at) : formatDate(w.due_date)}
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
