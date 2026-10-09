import type { RecordType } from "./types";

export const RECORD_TYPES: { value: RecordType; description: string; placeholder: string }[] = [
  { value: "A", description: "Routes traffic to an IPv4 address and some AWS resources", placeholder: "192.0.2.235" },
  { value: "AAAA", description: "Routes traffic to an IPv6 address and some AWS resources", placeholder: "2001:0db8:85a3:0:0:8a2e:0370:7334" },
  { value: "CAA", description: "Restricts CAs that can create SSL/TLS certifications for the domain", placeholder: '0 issue "caname.com"' },
  { value: "CNAME", description: "Routes traffic to another domain name and to some AWS resources", placeholder: "www.example.com" },
  { value: "MX", description: "Specifies mail servers", placeholder: "10 mailserver.example.com" },
  { value: "NS", description: "Name servers for a hosted zone", placeholder: "ns-1.example.com" },
  { value: "PTR", description: "Maps an IP address to a domain name", placeholder: "hostname.example.com" },
  { value: "SRV", description: "Application-specific values that identify servers", placeholder: "1 10 5269 xmpp-server.example.com" },
  { value: "TXT", description: "Verifies email senders and application-specific values", placeholder: '"Sample Text Entries"' },
];

export const TTL_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "1h", seconds: 3600 },
  { label: "1d", seconds: 86400 },
];

export const typeDescription = (t: string) => RECORD_TYPES.find((r) => r.value === t)?.description ?? "";

export function relativeName(fqdn: string, zoneName: string): string {
  if (fqdn === zoneName) return "";
  return fqdn.endsWith(`.${zoneName}`) ? fqdn.slice(0, -(zoneName.length + 1)) : fqdn;
}

export const displayName = (name: string) => name.replace(/\.$/, "");

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HOST = /^(?!-)[a-z0-9_-]{1,63}(?<!-)(\.(?!-)[a-z0-9_-]{1,63}(?<!-))*\.?$/i;

export function checkValue(type: RecordType, value: string): string {
  const v = value.trim();
  if (!v) return "";
  const parts = v.split(/\s+/);
  switch (type) {
    case "A":
      return IPV4.test(v) ? "" : `${v} is not a valid IPv4 address.`;
    case "AAAA":
      return v.includes(":") && /^[0-9a-f:.]+$/i.test(v) ? "" : `${v} is not a valid IPv6 address.`;
    case "CNAME":
    case "NS":
    case "PTR":
      return HOST.test(v) ? "" : `${v} is not a valid domain name.`;
    case "MX":
      return parts.length === 2 && /^\d+$/.test(parts[0]) && HOST.test(parts[1])
        ? ""
        : "Use the format: priority mail-server, for example 10 mail.example.com";
    case "SRV":
      return parts.length === 4 && parts.slice(0, 3).every((p) => /^\d+$/.test(p)) && HOST.test(parts[3])
        ? ""
        : "Use the format: priority weight port target";
    case "CAA":
      return /^\d+\s+(issue|issuewild|iodef)\s+.+$/i.test(v) ? "" : 'Use the format: flags tag "value"';
    default:
      return "";
  }
}

export function splitValues(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
