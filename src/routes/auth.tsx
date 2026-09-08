import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | ระบบอัพเดทงานฝ่ายผลิต" },
      { name: "description", content: "เข้าสู่ระบบเพื่อบันทึกและติดตามความคืบหน้างานฝ่ายผลิต" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [authTab, setAuthTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function signUpEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("สมัครสมาชิกและเข้าสู่ระบบเรียบร้อย");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ECFDF5] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#BBF7D0] bg-white/80 text-[#15803D] shadow-[0_18px_50px_rgb(34_197_94_/_0.14)] backdrop-blur">
            <Factory className="h-8 w-8" />
          </div>
          <h1 className="text-center text-4xl font-medium leading-tight tracking-normal text-[#14532D] [font-family:'Noto_Serif_Thai','Sarabun','Segoe_UI',serif]">
            ระบบอัพเดทงานฝ่ายผลิต
          </h1>
          <p className="max-w-sm text-center text-sm font-light leading-6 tracking-wide text-[#3F6212]">
            บันทึก ติดตาม และสรุปความคืบหน้างานผลิตและงานทดลอง
          </p>
          {!showLogin && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                className="rounded-full px-8 py-6 text-base font-semibold tracking-wide"
                onClick={() => {
                  setAuthTab("signin");
                  setShowLogin(true);
                }}
              >
                เข้าสู่ระบบ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/80 px-8 py-6 text-base font-semibold tracking-wide backdrop-blur"
                onClick={() => {
                  setAuthTab("signup");
                  setShowLogin(true);
                }}
              >
                สมัครสมาชิก
              </Button>
            </div>
          )}
        </div>
        <Card
          className={
            showLogin
              ? "border-[#DCFCE7] bg-white/85 shadow-[0_24px_70px_rgb(34_197_94_/_0.14)] backdrop-blur"
              : "hidden"
          }
        >
          <CardHeader>
            <CardTitle className="font-serif text-2xl font-semibold tracking-tight text-[#14532D]">
              เข้าสู่ระบบ
            </CardTitle>
            <CardDescription>
              ข้อมูลบัญชีและงานถูกเก็บใน localStorage ของเบราว์เซอร์นี้
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={authTab} onValueChange={setAuthTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">เข้าสู่ระบบ</TabsTrigger>
                <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signInEmail} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">รหัสผ่าน</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUpEmail} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                    <Input
                      id="name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email2">อีเมล</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password2">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
