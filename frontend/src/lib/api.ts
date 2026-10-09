import type {
  Activity,
  BulkDeleteResult,
  DashboardData,
  DnsRecord,
  DnsTestResult,
  HealthCheck,
  HealthCheckInput,
  HealthCheckResult,
  HostedZone,
  ImportResult,
  Page,
  RecordType,
  SearchHit,
  SessionInfo,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function detailMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: { msg?: string }) => d.msg ?? String(d)).join(" ");
  }
  return "Something went wrong. Try again.";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const onAuthPage = ["/", "/login", "/signup"].includes(window.location.pathname);
  if (res.status === 401 && !onAuthPage && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = detailMessage((await res.json()).detail);
    } catch {
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

const json = (body: unknown) => ({ body: JSON.stringify(body) });

export const api = {
  login: (body: { account_id: string; username: string; password: string }) =>
    request<User>("/auth/login", { method: "POST", ...json(body) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  authConfig: () => request<{ signup_enabled: boolean; demo_enabled: boolean }>("/auth/config"),
  register: (body: { username: string; password: string; account_alias: string; display_name: string; email: string }) =>
    request<User>("/auth/register", { method: "POST", ...json(body) }),
  updateProfile: (body: { display_name?: string; email?: string; account_alias?: string }) =>
    request<User>("/auth/me", { method: "PATCH", ...json(body) }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<void>("/auth/change-password", { method: "POST", ...json(body) }),
  sessions: () => request<SessionInfo[]>("/auth/sessions"),
  revokeSession: (id: string) => request<void>(`/auth/sessions/${id}`, { method: "DELETE" }),

  listZones: (p: { search?: string; type?: string; page: number; page_size: number }) =>
    request<Page<HostedZone>>(`/hostedzones${qs(p)}`),
  getZone: (id: string) => request<HostedZone>(`/hostedzones/${id}`),
  createZone: (body: {
    name: string;
    comment: string;
    is_private: boolean;
    vpc_region?: string;
    vpc_id?: string;
  }) => request<HostedZone>("/hostedzones", { method: "POST", ...json(body) }),
  updateZone: (id: string, body: { comment: string }) =>
    request<HostedZone>(`/hostedzones/${id}`, { method: "PATCH", ...json(body) }),
  deleteZone: (id: string) => request<void>(`/hostedzones/${id}`, { method: "DELETE" }),
  bulkDeleteZones: (ids: string[]) =>
    request<BulkDeleteResult>("/hostedzones/bulk-delete", { method: "POST", ...json({ ids }) }),
  exportZone: async (id: string, format: "json" | "bind") => {
    const res = await fetch(`/api/hostedzones/${id}/export?format=${format}`, { credentials: "include" });
    if (!res.ok) throw new ApiError(res.status, "Export failed.");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `zone.${format === "json" ? "json" : "zone"}`;
    return { blob: await res.blob(), filename };
  },

  listRecords: (zoneId: string, p: { search?: string; type?: string; page: number; page_size: number }) =>
    request<Page<DnsRecord>>(`/hostedzones/${zoneId}/records${qs(p)}`),
  getRecord: (zoneId: string, id: number) => request<DnsRecord>(`/hostedzones/${zoneId}/records/${id}`),
  createRecord: (
    zoneId: string,
    body: { name: string; type: RecordType; ttl: number; values: string[]; health_check_id?: string | null },
  ) =>
    request<DnsRecord>(`/hostedzones/${zoneId}/records`, { method: "POST", ...json(body) }),
  updateRecord: (zoneId: string, id: number, body: { ttl: number; values: string[]; health_check_id?: string }) =>
    request<DnsRecord>(`/hostedzones/${zoneId}/records/${id}`, { method: "PATCH", ...json(body) }),
  deleteRecord: (zoneId: string, id: number) =>
    request<void>(`/hostedzones/${zoneId}/records/${id}`, { method: "DELETE" }),
  bulkDeleteRecords: (zoneId: string, ids: number[]) =>
    request<BulkDeleteResult>(`/hostedzones/${zoneId}/records/bulk-delete`, { method: "POST", ...json({ ids }) }),
  testDns: (zoneId: string, name: string, type: string) =>
    request<DnsTestResult>(`/hostedzones/${zoneId}/test-dns${qs({ name, type })}`),
  importZoneFile: (zoneId: string, zone_file: string, dry_run: boolean) =>
    request<ImportResult>(`/hostedzones/${zoneId}/records/import`, {
      method: "POST",
      ...json({ zone_file, dry_run }),
    }),

  listHealthChecks: (p: { search?: string; status?: string; page: number; page_size: number }) =>
    request<Page<HealthCheck>>(`/healthchecks${qs(p)}`),
  getHealthCheck: (id: string) => request<HealthCheck>(`/healthchecks/${id}`),
  createHealthCheck: (body: HealthCheckInput) =>
    request<HealthCheck>("/healthchecks", { method: "POST", ...json(body) }),
  updateHealthCheck: (id: string, body: Partial<HealthCheckInput>) =>
    request<HealthCheck>(`/healthchecks/${id}`, { method: "PATCH", ...json(body) }),
  deleteHealthCheck: (id: string) => request<void>(`/healthchecks/${id}`, { method: "DELETE" }),
  bulkDeleteHealthChecks: (ids: string[]) =>
    request<BulkDeleteResult>("/healthchecks/bulk-delete", { method: "POST", ...json({ ids }) }),
  checkNow: (id: string) => request<HealthCheck>(`/healthchecks/${id}/check`, { method: "POST" }),
  healthCheckResults: (id: string, limit = 100) =>
    request<HealthCheckResult[]>(`/healthchecks/${id}/results${qs({ limit })}`),

  dashboard: () => request<DashboardData>("/dashboard"),
  activity: (limit = 20) => request<Activity[]>(`/activity${qs({ limit })}`),
  search: (q: string) => request<SearchHit[]>(`/search${qs({ q })}`),
  feedback: (body: { rating: "" | "positive" | "negative"; message: string; page: string }) =>
    request<void>("/feedback", { method: "POST", ...json(body) }),
  cli: (command: string) =>
    request<{ output: string; exit_code: number }>("/cli", { method: "POST", ...json({ command }) }),
};
