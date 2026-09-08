import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Factory, LayoutDashboard, ListTodo, FileText, Settings, LogOut, Plus } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/works", label: "รายการงาน", icon: ListTodo },
  { to: "/meeting-summary", label: "สรุปประชุม", icon: FileText },
  { to: "/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">ระบบอัพเดทงาน</div>
            <div className="text-xs text-muted-foreground">ฝ่ายผลิต</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/works/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            เพิ่มงานใหม่
          </Link>
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{session.user.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </Button>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
