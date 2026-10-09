export interface User {
  username: string;
  account_id: string;
  account_alias: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HostedZone {
  id: string;
  name: string;
  is_private: boolean;
  comment: string;
  record_count: number;
  caller_reference: string;
  vpc_region: string | null;
  vpc_id: string | null;
  name_servers: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type RecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "PTR" | "SRV" | "CAA" | "SOA";

export interface DnsRecord {
  id: number;
  name: string;
  type: RecordType;
  ttl: number;
  routing_policy: string;
  values: string[];
  alias: boolean;
  health_check_id: string | null;
  protected: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkDeleteResult {
  deleted: (string | number)[];
  failed: { id: string | number; reason: string }[];
}

export interface ImportedRecord {
  name: string;
  type: string;
  ttl: number;
  values: string[];
  status: "new" | "conflict" | "skipped";
  reason: string;
}

export interface ImportResult {
  records: ImportedRecord[];
  created: number;
  dry_run: boolean;
}

export interface DnsTestResult {
  query_name: string;
  query_type: string;
  response_code: "NOERROR" | "NXDOMAIN";
  protocol: string;
  answers: { name: string; type: string; ttl: number; value: string }[];
}

export type HealthStatus = "Healthy" | "Unhealthy" | "Unknown";

export interface HealthCheck {
  id: string;
  name: string;
  protocol: "HTTP" | "HTTPS" | "TCP";
  ip_address: string | null;
  domain_name: string | null;
  port: number;
  resource_path: string;
  search_string: string;
  request_interval: 10 | 30;
  failure_threshold: number;
  inverted: boolean;
  disabled: boolean;
  status: HealthStatus;
  last_checked_at: string | null;
  last_latency_ms: number | null;
  last_message: string;
  endpoint: string;
  record_count: number;
  created_at: string;
}

export interface HealthCheckInput {
  name: string;
  protocol: "HTTP" | "HTTPS" | "TCP";
  ip_address?: string | null;
  domain_name?: string | null;
  port?: number | null;
  resource_path: string;
  search_string: string;
  request_interval: 10 | 30;
  failure_threshold: number;
  inverted: boolean;
  disabled: boolean;
}

export interface HealthCheckResult {
  checked_at: string;
  success: boolean;
  latency_ms: number | null;
  status_code: number | null;
  message: string;
}

export interface Activity {
  id: number;
  action: string;
  resource_type: "hosted_zone" | "record" | "health_check";
  resource_id: string;
  message: string;
  created_at: string;
}

export interface DashboardData {
  hosted_zones: number;
  public_zones: number;
  private_zones: number;
  records: number;
  records_by_type: Record<string, number>;
  health_checks: number;
  health_by_status: Record<string, number>;
  recent_activity: Activity[];
}

export interface SearchHit {
  kind: "hosted_zone" | "record" | "health_check" | "page";
  title: string;
  subtitle: string;
  href: string;
}

export interface SessionInfo {
  id: string;
  created_at: string;
  expires_at: string;
  current: boolean;
}
