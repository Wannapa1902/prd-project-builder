import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

type AppRole = "admin" | "staff" | "supervisor" | "viewer";
type TableName = "profiles" | "user_roles" | "work_types" | "works" | "work_updates";
type Operation = "select" | "insert" | "update" | "delete";

type UserAccount = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  department: string | null;
  created_at: string;
};

type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
};

type WorkType = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type Work = {
  id: string;
  work_no: number;
  title: string;
  description: string | null;
  work_type: string;
  product_lot: string | null;
  owner_id: string | null;
  owner_name: string | null;
  department: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  progress: number;
  latest_update: string | null;
  latest_issue: string | null;
  next_action: string | null;
  image_url: string | null;
  image_name: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  remark: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type WorkUpdate = {
  id: string;
  work_id: string;
  status: string;
  progress: number | null;
  detail: string;
  issue: string | null;
  next_action: string | null;
  attachment_url: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string;
};

type TableRows = {
  profiles: Profile;
  user_roles: UserRole;
  work_types: WorkType;
  works: Work;
  work_updates: WorkUpdate;
};

type LocalDatabase = {
  version: 1;
  users: UserAccount[];
  profiles: Profile[];
  user_roles: UserRole[];
  work_types: WorkType[];
  works: Work[];
  work_updates: WorkUpdate[];
  next_work_no: number;
};

type QueryFilter = {
  column: string;
  value: unknown;
};

type QueryOrder = {
  column: string;
  ascending: boolean;
};

type QueryResult<Data> = {
  data: Data | null;
  error: Error | null;
};

type LocalRowInput = Partial<Profile & UserRole & WorkType & Work & WorkUpdate>;

type SignUpParams = {
  email: string;
  password: string;
  options?: {
    data?: {
      full_name?: string;
      name?: string;
    };
    emailRedirectTo?: string;
  };
};

type SignInParams = {
  email: string;
  password: string;
};

type SessionTokens = {
  access_token?: string;
  refresh_token?: string;
};

export type LocalSession = Session;

const DATABASE_KEY = "prd-project-builder:local-db:v1";
const SESSION_KEY = "prd-project-builder:local-session:v1";
const SESSION_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_WORK_TYPES = ["ปัญหางานผลิต", "งานทดลอง", "อัพเดทงาน/อื่น"];

let memoryDatabase: LocalDatabase | null = null;
let memorySession: LocalSession | null = null;
const authListeners = new Set<(event: AuthChangeEvent, session: LocalSession | null) => void>();

function cloneValue<Value>(value: Value): Value {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as Value;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function createInitialDatabase(): LocalDatabase {
  const createdAt = nowIso();
  return {
    version: 1,
    users: [],
    profiles: [],
    user_roles: [],
    work_types: DEFAULT_WORK_TYPES.map((name, index) => ({
      id: generateId(),
      name,
      is_active: true,
      sort_order: index + 1,
      created_at: createdAt,
    })),
    works: [],
    work_updates: [],
    next_work_no: 1,
  };
}

function normalizeDatabase(rawDatabase: Partial<LocalDatabase> | null): LocalDatabase {
  const initialDatabase = createInitialDatabase();
  const users = Array.isArray(rawDatabase?.users) ? rawDatabase.users : [];
  const profiles = Array.isArray(rawDatabase?.profiles) ? rawDatabase.profiles : [];
  const userRoles = Array.isArray(rawDatabase?.user_roles) ? rawDatabase.user_roles : [];
  const existingWorkTypes = Array.isArray(rawDatabase?.work_types) ? rawDatabase.work_types : [];
  const workTypes = DEFAULT_WORK_TYPES.map((name, index) => {
    const existingWorkType = existingWorkTypes.find((workType) => workType.name === name);
    return {
      id: existingWorkType?.id ?? initialDatabase.work_types[index]!.id,
      name,
      is_active: true,
      sort_order: index + 1,
      created_at: existingWorkType?.created_at ?? initialDatabase.work_types[index]!.created_at,
    };
  });
  const works = Array.isArray(rawDatabase?.works) ? rawDatabase.works : [];
  const workUpdates = Array.isArray(rawDatabase?.work_updates) ? rawDatabase.work_updates : [];
  const maxWorkNo = works.reduce(
    (maxValue, work) => Math.max(maxValue, Number(work.work_no) || 0),
    0,
  );
  const explicitNextWorkNo =
    typeof rawDatabase?.next_work_no === "number" ? rawDatabase.next_work_no : 1;
  const normalizedRoles =
    userRoles.length > 0 || users.length === 0
      ? userRoles
      : [{ id: generateId(), user_id: users[0]!.id, role: "admin" as AppRole }];

  return {
    version: 1,
    users,
    profiles,
    user_roles: normalizedRoles,
    work_types: workTypes,
    works,
    work_updates: workUpdates,
    next_work_no: Math.max(explicitNextWorkNo, maxWorkNo + 1),
  };
}

function readDatabase() {
  if (!hasLocalStorage()) {
    memoryDatabase ??= createInitialDatabase();
    return cloneValue(memoryDatabase);
  }

  const storedValue = window.localStorage.getItem(DATABASE_KEY);
  if (!storedValue) {
    const database = createInitialDatabase();
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    return database;
  }

  try {
    return normalizeDatabase(JSON.parse(storedValue) as Partial<LocalDatabase>);
  } catch {
    const database = createInitialDatabase();
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    return database;
  }
}

function writeDatabase(database: LocalDatabase) {
  const normalizedDatabase = normalizeDatabase(database);
  if (!hasLocalStorage()) {
    memoryDatabase = cloneValue(normalizedDatabase);
    return;
  }
  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(normalizedDatabase));
}

function readSession() {
  if (!hasLocalStorage()) return memorySession ? cloneValue(memorySession) : null;

  const storedValue = window.localStorage.getItem(SESSION_KEY);
  if (!storedValue) return null;

  try {
    return JSON.parse(storedValue) as LocalSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session: LocalSession | null) {
  if (!hasLocalStorage()) {
    memorySession = session ? cloneValue(session) : null;
    return;
  }

  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

function emitAuthChange(event: AuthChangeEvent, session: LocalSession | null) {
  authListeners.forEach((listener) => listener(event, session));
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(password));
    return Array.from(new Uint8Array(digest))
      .map((byteValue) => byteValue.toString(16).padStart(2, "0"))
      .join("");
  }
  return `plain:${password}`;
}

function createUser(account: UserAccount, signedInAt = nowIso()): User {
  return {
    id: account.id,
    aud: "authenticated",
    role: "authenticated",
    email: account.email,
    email_confirmed_at: account.created_at,
    confirmed_at: account.created_at,
    last_sign_in_at: signedInAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: account.display_name ?? account.email.split("@")[0] },
    identities: [],
    created_at: account.created_at,
    updated_at: signedInAt,
    is_anonymous: false,
  };
}

function createSession(account: UserAccount): LocalSession {
  const signedInAt = nowIso();
  return {
    access_token: `local-access-${account.id}-${Date.now()}`,
    refresh_token: `local-refresh-${account.id}-${Date.now()}`,
    expires_in: SESSION_SECONDS,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    token_type: "bearer",
    user: createUser(account, signedInAt),
  };
}

function readJwtPayload(token: string) {
  const parts = token.split(".");
  const payload = parts[1];
  if (parts.length !== 3 || !payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(
      normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="),
    );
    return JSON.parse(decodedPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function createSessionFromTokens(tokens: SessionTokens): LocalSession {
  const database = readDatabase();
  const payload = tokens.access_token ? readJwtPayload(tokens.access_token) : null;
  const email =
    typeof payload?.["email"] === "string"
      ? normalizeEmail(payload["email"])
      : "local-oauth@example.local";
  const accountId = typeof payload?.["sub"] === "string" ? payload["sub"] : generateId();
  let account = database.users.find(
    (userAccount) => userAccount.id === accountId || userAccount.email === email,
  );

  if (!account) {
    account = {
      id: accountId,
      email,
      password_hash: "oauth",
      display_name: typeof payload?.["name"] === "string" ? payload["name"] : email.split("@")[0]!,
      created_at: nowIso(),
    };
    database.users.push(account);
    database.profiles.push({
      id: account.id,
      email: account.email,
      display_name: account.display_name,
      department: null,
      created_at: account.created_at,
    });
    if (!database.user_roles.some((userRole) => userRole.role === "admin")) {
      database.user_roles.push({ id: generateId(), user_id: account.id, role: "admin" });
    }
    writeDatabase(database);
  }

  const session = createSession(account);
  return {
    ...session,
    access_token: tokens.access_token ?? session.access_token,
    refresh_token: tokens.refresh_token ?? session.refresh_token,
  };
}

function createError(message: string) {
  return new Error(message);
}

function projectRows<Row extends Record<string, unknown>>(rows: Row[], selectedColumns: string) {
  if (selectedColumns.trim() === "*") return cloneValue(rows);

  const columnNames = selectedColumns
    .split(",")
    .map((columnName) => columnName.trim())
    .filter(Boolean);

  return rows.map((row) =>
    Object.fromEntries(columnNames.map((columnName) => [columnName, row[columnName]])),
  );
}

function matchesFilters<Row extends Record<string, unknown>>(row: Row, filters: QueryFilter[]) {
  return filters.every((filter) => row[filter.column] === filter.value);
}

function compareValues(leftValue: unknown, rightValue: unknown) {
  if (typeof leftValue === "number" && typeof rightValue === "number")
    return leftValue - rightValue;
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
}

function orderRows<Row extends Record<string, unknown>>(rows: Row[], order: QueryOrder | null) {
  if (!order) return rows;
  return [...rows].sort((leftRow, rightRow) => {
    const result = compareValues(leftRow[order.column], rightRow[order.column]);
    return order.ascending ? result : -result;
  });
}

function applyDefaults<Table extends TableName>(
  tableName: Table,
  value: LocalRowInput,
  database: LocalDatabase,
): TableRows[Table] {
  const createdAt = nowIso();

  if (tableName === "profiles") {
    return {
      id: String(value.id ?? generateId()),
      email: typeof value.email === "string" ? value.email : null,
      display_name: typeof value.display_name === "string" ? value.display_name : null,
      department: typeof value.department === "string" ? value.department : null,
      created_at: typeof value.created_at === "string" ? value.created_at : createdAt,
    } as TableRows[Table];
  }

  if (tableName === "user_roles") {
    return {
      id: String(value.id ?? generateId()),
      user_id: String(value.user_id ?? ""),
      role: (value.role ?? "staff") as AppRole,
    } as TableRows[Table];
  }

  if (tableName === "work_types") {
    return {
      id: String(value.id ?? generateId()),
      name: String(value.name ?? ""),
      is_active: typeof value.is_active === "boolean" ? value.is_active : true,
      sort_order:
        typeof value.sort_order === "number" ? value.sort_order : database.work_types.length + 1,
      created_at: typeof value.created_at === "string" ? value.created_at : createdAt,
    } as TableRows[Table];
  }

  if (tableName === "works") {
    const workNo = typeof value.work_no === "number" ? value.work_no : database.next_work_no++;
    return {
      id: String(value.id ?? generateId()),
      work_no: workNo,
      title: String(value.title ?? ""),
      description: typeof value.description === "string" ? value.description : null,
      work_type: String(value.work_type ?? ""),
      product_lot: typeof value.product_lot === "string" ? value.product_lot : null,
      owner_id: typeof value.owner_id === "string" ? value.owner_id : null,
      owner_name: typeof value.owner_name === "string" ? value.owner_name : null,
      department: typeof value.department === "string" ? value.department : null,
      start_date: typeof value.start_date === "string" ? value.start_date : null,
      due_date: typeof value.due_date === "string" ? value.due_date : null,
      priority: String(value.priority ?? "medium"),
      status: String(value.status ?? "not_started"),
      progress: typeof value.progress === "number" ? value.progress : 0,
      latest_update: typeof value.latest_update === "string" ? value.latest_update : null,
      latest_issue: typeof value.latest_issue === "string" ? value.latest_issue : null,
      next_action: typeof value.next_action === "string" ? value.next_action : null,
      image_url: typeof value.image_url === "string" ? value.image_url : null,
      image_name: typeof value.image_name === "string" ? value.image_name : null,
      attachment_url: typeof value.attachment_url === "string" ? value.attachment_url : null,
      attachment_name: typeof value.attachment_name === "string" ? value.attachment_name : null,
      remark: typeof value.remark === "string" ? value.remark : null,
      created_by: typeof value.created_by === "string" ? value.created_by : null,
      created_at: typeof value.created_at === "string" ? value.created_at : createdAt,
      updated_at: typeof value.updated_at === "string" ? value.updated_at : createdAt,
    } as TableRows[Table];
  }

  return {
    id: String(value.id ?? generateId()),
    work_id: String(value.work_id ?? ""),
    status: String(value.status ?? "not_started"),
    progress: typeof value.progress === "number" ? value.progress : null,
    detail: String(value.detail ?? ""),
    issue: typeof value.issue === "string" ? value.issue : null,
    next_action: typeof value.next_action === "string" ? value.next_action : null,
    attachment_url: typeof value.attachment_url === "string" ? value.attachment_url : null,
    updated_by: typeof value.updated_by === "string" ? value.updated_by : null,
    updated_by_name: typeof value.updated_by_name === "string" ? value.updated_by_name : null,
    created_at: typeof value.created_at === "string" ? value.created_at : createdAt,
  } as TableRows[Table];
}

class LocalQueryBuilder<Table extends TableName, Data = TableRows[Table][]> implements PromiseLike<
  QueryResult<Data>
> {
  private operation: Operation = "select";
  private filters: QueryFilter[] = [];
  private selectedColumns = "*";
  private selectedOrder: QueryOrder | null = null;
  private singleMode = false;
  private payload: LocalRowInput | LocalRowInput[] | null = null;

  constructor(private readonly tableName: Table) {}

  select(columns = "*") {
    this.selectedColumns = columns;
    return this;
  }

  insert(payload: LocalRowInput | LocalRowInput[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: LocalRowInput) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.selectedOrder = { column, ascending: options?.ascending ?? true };
    return this;
  }

  single() {
    this.singleMode = true;
    return this as unknown as LocalQueryBuilder<Table, TableRows[Table]>;
  }

  then<ResultFulfilled = QueryResult<Data>, ResultRejected = never>(
    onfulfilled?:
      ((value: QueryResult<Data>) => ResultFulfilled | PromiseLike<ResultFulfilled>) | null,
    onrejected?: ((reason: unknown) => ResultRejected | PromiseLike<ResultRejected>) | null,
  ): PromiseLike<ResultFulfilled | ResultRejected> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<Data>> {
    try {
      const database = readDatabase();
      const tableRows = database[this.tableName] as TableRows[Table][];
      let resultRows: TableRows[Table][] = [];

      if (this.operation === "select") {
        resultRows = tableRows.filter((row) =>
          matchesFilters(row as Record<string, unknown>, this.filters),
        );
      }

      if (this.operation === "insert") {
        const payloadItems = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
        resultRows = payloadItems.map((payloadItem) =>
          applyDefaults(this.tableName, payloadItem, database),
        );

        if (this.tableName === "work_types") {
          const duplicate = resultRows.find((row) =>
            database.work_types.some((workType) => workType.name === (row as WorkType).name),
          );
          if (duplicate) return { data: null, error: createError("ชื่อประเภทงานซ้ำ") };
        }

        if (this.tableName === "user_roles") {
          const duplicate = resultRows.find((row) =>
            database.user_roles.some(
              (userRole) =>
                userRole.user_id === (row as UserRole).user_id &&
                userRole.role === (row as UserRole).role,
            ),
          );
          if (duplicate) return { data: null, error: createError("สิทธิ์ผู้ใช้นี้มีอยู่แล้ว") };
        }

        (database[this.tableName] as TableRows[Table][]).push(...resultRows);
        writeDatabase(database);
      }

      if (this.operation === "update") {
        const payloadValue = (this.payload ?? {}) as LocalRowInput;
        resultRows = tableRows
          .filter((row) => matchesFilters(row as Record<string, unknown>, this.filters))
          .map((row) => ({ ...row, ...payloadValue }));

        const updatedRows = tableRows.map((row) =>
          matchesFilters(row as Record<string, unknown>, this.filters)
            ? ({ ...row, ...payloadValue } as TableRows[Table])
            : row,
        );
        database[this.tableName] = updatedRows as LocalDatabase[Table];
        writeDatabase(database);
      }

      if (this.operation === "delete") {
        resultRows = tableRows.filter((row) =>
          matchesFilters(row as Record<string, unknown>, this.filters),
        );
        database[this.tableName] = tableRows.filter(
          (row) => !matchesFilters(row as Record<string, unknown>, this.filters),
        ) as LocalDatabase[Table];

        if (this.tableName === "works") {
          const deletedWorkIds = new Set(resultRows.map((row) => (row as Work).id));
          database.work_updates = database.work_updates.filter(
            (workUpdate) => !deletedWorkIds.has(workUpdate.work_id),
          );
        }

        if (this.tableName === "profiles") {
          const deletedProfileIds = new Set(resultRows.map((row) => (row as Profile).id));
          database.user_roles = database.user_roles.filter(
            (userRole) => !deletedProfileIds.has(userRole.user_id),
          );
        }

        writeDatabase(database);
      }

      const orderedRows = orderRows(resultRows as Record<string, unknown>[], this.selectedOrder);
      const projectedRows = projectRows(orderedRows, this.selectedColumns);

      if (this.singleMode) {
        const singleRow = projectedRows[0] ?? null;
        return singleRow
          ? { data: singleRow as Data, error: null }
          : { data: null, error: createError("ไม่พบข้อมูล") };
      }

      return { data: projectedRows as Data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : createError(String(error)) };
    }
  }
}

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: readSession() }, error: null };
    },
    onAuthStateChange(callback: (event: AuthChangeEvent, session: LocalSession | null) => void) {
      authListeners.add(callback);
      queueMicrotask(() => callback("INITIAL_SESSION", readSession()));
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
    async signUp({ email, password, options }: SignUpParams) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail)
        return { data: { user: null, session: null }, error: createError("กรุณากรอกอีเมล") };
      if (password.length < 6)
        return {
          data: { user: null, session: null },
          error: createError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
        };

      const database = readDatabase();
      if (database.users.some((userAccount) => userAccount.email === normalizedEmail)) {
        return { data: { user: null, session: null }, error: createError("อีเมลนี้ถูกใช้แล้ว") };
      }

      const createdAt = nowIso();
      const displayName =
        options?.data?.full_name?.trim() ||
        options?.data?.name?.trim() ||
        normalizedEmail.split("@")[0]!;
      const account: UserAccount = {
        id: generateId(),
        email: normalizedEmail,
        password_hash: await hashPassword(password),
        display_name: displayName,
        created_at: createdAt,
      };

      database.users.push(account);
      database.profiles.push({
        id: account.id,
        email: account.email,
        display_name: account.display_name,
        department: null,
        created_at: createdAt,
      });
      database.user_roles.push({
        id: generateId(),
        user_id: account.id,
        role: database.user_roles.some((userRole) => userRole.role === "admin") ? "staff" : "admin",
      });
      writeDatabase(database);

      const session = createSession(account);
      writeSession(session);
      emitAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    },
    async signInWithPassword({ email, password }: SignInParams) {
      const normalizedEmail = normalizeEmail(email);
      const database = readDatabase();
      const account = database.users.find((userAccount) => userAccount.email === normalizedEmail);
      const passwordHash = await hashPassword(password);

      if (!account || account.password_hash !== passwordHash) {
        return {
          data: { user: null, session: null },
          error: createError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"),
        };
      }

      const session = createSession(account);
      writeSession(session);
      emitAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    },
    async setSession(tokens: SessionTokens) {
      const session = createSessionFromTokens(tokens);
      writeSession(session);
      emitAuthChange("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    },
    async signOut() {
      writeSession(null);
      emitAuthChange("SIGNED_OUT", null);
      return { error: null };
    },
  },
  from<Table extends TableName>(tableName: Table) {
    return new LocalQueryBuilder(tableName);
  },
  async rpc(functionName: string, params: Record<string, unknown>) {
    if (functionName !== "has_role")
      return { data: null, error: createError(`ไม่รองรับฟังก์ชัน ${functionName}`) };

    const database = readDatabase();
    const userId = String(params["_user_id"] ?? "");
    const role = String(params["_role"] ?? "");
    return {
      data: database.user_roles.some(
        (userRole) => userRole.user_id === userId && userRole.role === role,
      ),
      error: null,
    };
  },
};
