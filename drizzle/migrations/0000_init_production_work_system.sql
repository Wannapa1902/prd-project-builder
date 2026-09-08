CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'supervisor', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Authenticated can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_types TO authenticated;
GRANT ALL ON public.work_types TO service_role;
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read work types" ON public.work_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage work types" ON public.work_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update work types" ON public.work_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete work types" ON public.work_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_no BIGINT GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT NOT NULL,
  product_lot TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  owner_name TEXT,
  department TEXT,
  start_date DATE,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'not_started',
  progress INT NOT NULL DEFAULT 0,
  latest_update TEXT,
  latest_issue TEXT,
  next_action TEXT,
  remark TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.works TO authenticated;
GRANT ALL ON public.works TO service_role;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read works" ON public.works FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create works" ON public.works FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update works" ON public.works FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete works" ON public.works FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.work_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  progress INT,
  detail TEXT NOT NULL,
  issue TEXT,
  next_action TEXT,
  attachment_url TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_updates TO authenticated;
GRANT ALL ON public.work_updates TO service_role;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read updates" ON public.work_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add updates" ON public.work_updates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete updates" ON public.work_updates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.work_types (name, sort_order) VALUES
  ('งานผลิต', 1), ('งานทดลอง', 2), ('งานแก้ไข', 3), ('งานตรวจสอบ', 4),
  ('งานปรับปรุงกระบวนการ', 5), ('งานเอกสาร', 6), ('งานติดตามผล', 7);