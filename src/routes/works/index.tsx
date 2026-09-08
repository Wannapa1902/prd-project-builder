import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, Search } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, statusBg, statusLabel, formatDate, workCode, isOverdue } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/works/")({
  head: () => ({
    meta: [
      { title: "รายการงาน | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "ค้นหา กรอง และติดตามงานฝ่ายผลิตทั้งหมด" },
    ],
  }),
  component: WorksPage,
});

type Work = {
  id: string;
  work_no: number;
  title: string;
  work_type: string;
  product_lot: string | null;
  owner_name: string | null;
  due_date: string | null;
  start_date: string | null;
  status: string;
  priority: string;
  progress: number;
  latest_update: string | null;
  updated_at: string;
};

function WorksPage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [workType, setWorkType] = useState("all");
  const [sort, setSort] = useState("created_desc");

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

  const owners = useMemo(
    () => [...new Set((works ?? []).map((w) => w.owner_name).filter(Boolean))] as string[],
    [works],
  );

  const filtered = useMemo(() => {
    let list = works ?? [];
    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter((w) =>
        [w.title, w.product_lot, workCode(w.work_no), w.owner_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k)),
      );
    }
    if (status === "overdue") list = list.filter(isOverdue);
    else if (status !== "all") list = list.filter((w) => w.status === status);
    if (owner !== "all") list = list.filter((w) => w.owner_name === owner);
    if (workType !== "all") list = list.filter((w) => w.work_type === workType);
    const sorted = [...list];
    if (sort === "created_desc") sorted.sort((a, b) => b.work_no - a.work_no);
    else if (sort === "due_asc")
      sorted.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    else if (sort === "status") sorted.sort((a, b) => a.status.localeCompare(b.status));
    return sorted;
  }, [works, keyword, status, owner, workType, sort]);

  function exportCsv() {
    const header = [
      "Work ID",
      "หัวข้องาน",
      "ประเภทงาน",
      "สินค้า/Lot",
      "ผู้รับผิดชอบ",
      "วันกำหนดเสร็จ",
      "สถานะ",
      "%ความคืบหน้า",
    ];
    const rows = filtered.map((w) => [
      workCode(w.work_no),
      w.title,
      w.work_type,
      w.product_lot ?? "",
      w.owner_name ?? "",
      w.due_date ?? "",
      statusLabel(w.status),
      w.progress,
    ]);
    const csv =
      "﻿" +
      [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `works-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">รายการงานทั้งหมด</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} งาน</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Link to="/works/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มงานใหม่
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="relative col-span-2 md:col-span-3 lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหางาน..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              <SelectItem value="overdue">เกินกำหนด</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger>
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
            <SelectTrigger>
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
          <div className="flex gap-3">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue placeholder="เรียงตาม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">สร้างล่าสุด</SelectItem>
                <SelectItem value="due_asc">ใกล้กำหนดเสร็จ</SelectItem>
                <SelectItem value="status">สถานะ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสงาน</TableHead>
              <TableHead>หัวข้องาน</TableHead>
              <TableHead>ประเภทงาน</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead>กำหนดเสร็จ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-32">ความคืบหน้า</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  ไม่พบงานที่ตรงเงื่อนไข
                </TableCell>
              </TableRow>
            )}
            {filtered.map((w) => (
              <TableRow key={w.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    to="/works/$workId"
                    params={{ workId: w.id }}
                    className="font-mono text-sm font-semibold text-primary hover:underline"
                  >
                    {workCode(w.work_no)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to="/works/$workId"
                    params={{ workId: w.id }}
                    className="font-medium hover:underline"
                  >
                    {w.title}
                  </Link>
                  {w.product_lot && (
                    <div className="text-xs text-muted-foreground">{w.product_lot}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">{w.work_type}</TableCell>
                <TableCell className="text-sm">{w.owner_name ?? "-"}</TableCell>
                <TableCell className="text-sm">
                  <span className={isOverdue(w) ? "font-semibold text-red-600" : ""}>
                    {formatDate(w.due_date)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusBg(w.status)}>
                    {statusLabel(w.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${w.progress}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs text-muted-foreground">
                      {w.progress}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
