import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Boxes,
  FileText,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Presentation,
  Settings,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS } from "@/lib/constants";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/works", label: "Work List", icon: ListTodo },
  { to: "/meeting-summary", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [presentSidebarOpen, setPresentSidebarOpen] = useState(true);

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
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[32px] border-4 border-white bg-card shadow-[0_24px_70px_rgb(34_197_94_/_0.18)] md:min-h-[calc(100vh-4rem)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-sidebar-border bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={sidebarOpen ? "ซ่อน sidebar" : "แสดง sidebar"}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={presentSidebarOpen ? "ซ่อน sidebar พรีเซ้น" : "แสดง sidebar พรีเซ้น"}
              onClick={() => setPresentSidebarOpen((open) => !open)}
            >
              <Presentation className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 -rotate-3 items-center justify-center rounded-2xl border-2 border-[#15803D] bg-[#DCFCE7] text-[#15803D] shadow-[0_4px_20px_rgb(34_197_94_/_0.4)]">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-extrabold leading-tight tracking-wide text-[#15803D]">
                ProdFlow
              </div>
              <div className="text-xs font-bold text-[#16A34A]">Production</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="truncate px-2 text-xs text-muted-foreground">{session.user.email}</div>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" /> ออกจากระบบ
            </Button>
          </div>
        </header>
        <div className="flex min-h-[calc(100vh-9rem)]">
          {sidebarOpen && (
            <aside className="w-64 shrink-0 border-r border-sidebar-border bg-white p-4">
              <nav className="space-y-2">
                {NAV.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                        active
                          ? "bg-[#ECFDF5] text-[#15803D] shadow-[inset_-5px_0_0_#DCFCE7,0_4px_20px_rgb(34_197_94_/_0.14)]"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  to="/works/new"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] px-4 py-3 text-sm font-extrabold text-[#2C3E50] shadow-[0_4px_20px_rgb(34_197_94_/_0.4)] transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มงานใหม่
                </Link>
                {presentSidebarOpen && (
                  <div className="mt-5 border-t border-sidebar-border pt-4">
                    <div className="mb-3 flex items-center gap-2 px-2 text-sm font-extrabold text-[#15803D]">
                      <Presentation className="h-4 w-4" />
                      Work Presentation
                    </div>
                    <div className="space-y-2">
                      {DEPARTMENTS.map((department) => {
                        const active = pathname.startsWith("/department-present");
                        return (
                          <Link
                            key={department}
                            to="/department-present"
                            search={{ department }}
                            className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                              active
                                ? "bg-[#F8FAF8] text-[#15803D] shadow-[inset_-5px_0_0_#DCFCE7,0_4px_20px_rgb(34_197_94_/_0.16)]"
                                : "text-muted-foreground hover:bg-[#F8FAF8] hover:text-[#15803D]"
                            }`}
                          >
                            <span>{department}</span>
                            <span className="text-xs">Open</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </nav>
            </aside>
          )}
          <main className="min-w-0 flex-1 bg-[#F6FBF7] p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
