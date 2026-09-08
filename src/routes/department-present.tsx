import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, formatDateTime, statusBg, statusLabel, workCode } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DepartmentPresentSearch = {
  department: string | undefined;
};

type Work = {
  id: string;
  work_no: number;
  title: string;
  description: string | null;
  work_type: string;
  department: string | null;
  status: string;
  progress: number;
  latest_update: string | null;
  latest_issue: string | null;
  next_action: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/department-present")({
  validateSearch: (search: Record<string, unknown>): DepartmentPresentSearch => ({
    department: typeof search["department"] === "string" ? search["department"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "พรีเซ้นแผนก | ระบบอัพเดทงานฝ่ายผลิต" },
      {
        name: "description",
        content: "สรุปงานตามแผนกสำหรับนำเสนอ ดึงข้อมูลจากรายการงานฝ่ายผลิต",
      },
    ],
  }),
  component: DepartmentPresentPage,
});

function DepartmentPresentPage() {
  const search = Route.useSearch();
  const selectedDepartment = DEPARTMENTS.includes(search.department ?? "")
    ? search.department!
    : DEPARTMENTS[0]!;

  const { data: works, isLoading } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const { data } = await supabase
        .from("works")
        .select("*")
        .order("updated_at", { ascending: false });
      return (data ?? []) as Work[];
    },
  });

  const departmentWorks = useMemo(
    () => (works ?? []).filter((work) => work.department === selectedDepartment),
    [works, selectedDepartment],
  );

  const stats = useMemo(() => {
    const active = departmentWorks.filter(
      (work) => !["completed", "cancelled"].includes(work.status),
    );
    const completed = departmentWorks.filter((work) => work.status === "completed");
    const averageProgress =
      departmentWorks.length === 0
        ? 0
        : Math.round(
            departmentWorks.reduce((total, work) => total + Number(work.progress || 0), 0) /
              departmentWorks.length,
          );
    return {
      total: departmentWorks.length,
      active: active.length,
      completed: completed.length,
      averageProgress,
    };
  }, [departmentWorks]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-[32px] bg-gradient-to-br from-[#2BA8A2] to-[#1E8C86] p-6 text-white shadow-[0_4px_20px_rgb(43_168_162_/_0.3)]">
          <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            Department Presentation
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-wide">
                Work Presentation - {selectedDepartment}
              </h1>
              <p className="mt-2 text-sm font-medium text-white/80">
                ดึงข้อมูลจากงานที่เลือกแผนก {selectedDepartment}
              </p>
            </div>
            <div className="rounded-3xl border-2 border-white/25 bg-black/15 px-5 py-3 text-right">
              <div className="text-xs font-bold text-white/70">ความคืบหน้าเฉลี่ย</div>
              <div className="text-4xl font-extrabold text-[#FFD23F]">{stats.averageProgress}%</div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label="งานทั้งหมด"
            value={stats.total}
            icon={<ListTodo className="h-5 w-5" />}
          />
          <StatCard label="กำลังทำ" value={stats.active} icon={<Clock className="h-5 w-5" />} />
          <StatCard
            label="เสร็จสิ้น"
            value={stats.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flip-section-title text-base">
              งานสำหรับพรีเซ้น {selectedDepartment}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด...</p>
            ) : departmentWorks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                ยังไม่มีงานของแผนกนี้
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>งาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ความคืบหน้า</TableHead>
                    <TableHead>อัพเดทล่าสุด</TableHead>
                    <TableHead>เปิด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentWorks.map((work) => (
                    <TableRow key={work.id}>
                      <TableCell>
                        <div className="font-medium">{work.title}</div>
                        <div className="font-mono text-xs text-primary">
                          {workCode(work.work_no)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{work.work_type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBg(work.status)}>
                          {statusLabel(work.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${work.progress}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-xs text-muted-foreground">
                            {work.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <div className="truncate text-sm">{work.latest_update ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(work.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/works/$workId"
                          params={{ workId: work.id }}
                          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                        >
                          ดูงาน
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-4">
        <div>
          <div className="text-3xl font-extrabold text-[#1E8C86]">{value}</div>
          <div className="text-xs font-bold text-muted-foreground">{label}</div>
        </div>
        <div className="rounded-2xl bg-[#E8F6F5] p-3 text-[#1E8C86]">{icon}</div>
      </CardContent>
    </Card>
  );
}
