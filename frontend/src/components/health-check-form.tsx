"use client";

import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Container from "@cloudscape-design/components/container";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Tiles from "@cloudscape-design/components/tiles";
import Toggle from "@cloudscape-design/components/toggle";
import { useState } from "react";
import type { HealthCheck, HealthCheckInput } from "@/lib/types";

type Protocol = HealthCheckInput["protocol"];
const DEFAULT_PORT: Record<Protocol, string> = { HTTP: "80", HTTPS: "443", TCP: "" };

interface Draft {
  name: string;
  protocol: Protocol;
  target: "ip" | "domain";
  ip_address: string;
  domain_name: string;
  port: string;
  resource_path: string;
  useSearch: boolean;
  search_string: string;
  request_interval: 10 | 30;
  failure_threshold: number;
  inverted: boolean;
  disabled: boolean;
}

function fromCheck(hc?: HealthCheck): Draft {
  if (!hc) {
    return {
      name: "",
      protocol: "HTTP",
      target: "domain",
      ip_address: "",
      domain_name: "",
      port: "80",
      resource_path: "/",
      useSearch: false,
      search_string: "",
      request_interval: 30,
      failure_threshold: 3,
      inverted: false,
      disabled: false,
    };
  }
  return {
    name: hc.name,
    protocol: hc.protocol,
    target: hc.ip_address ? "ip" : "domain",
    ip_address: hc.ip_address ?? "",
    domain_name: hc.domain_name ?? "",
    port: String(hc.port),
    resource_path: hc.resource_path,
    useSearch: !!hc.search_string,
    search_string: hc.search_string,
    request_interval: hc.request_interval,
    failure_threshold: hc.failure_threshold,
    inverted: hc.inverted,
    disabled: hc.disabled,
  };
}

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;
const HOST = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9-_]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.?$/i;

function errorsOf(d: Draft) {
  const e: Partial<Record<"name" | "ip" | "domain" | "port" | "search", string>> = {};
  if (!d.name.trim()) e.name = "Enter a name for the health check.";
  if (d.target === "ip") {
    if (!d.ip_address.trim()) e.ip = "Enter the IP address of the endpoint.";
    else if (!IPV4.test(d.ip_address.trim()) && !d.ip_address.includes(":")) e.ip = "Enter a valid IPv4 or IPv6 address.";
  } else if (!d.domain_name.trim()) e.domain = "Enter the domain name of the endpoint.";
  else if (!HOST.test(d.domain_name.trim())) e.domain = "Enter a valid domain name, such as www.example.com.";
  const port = Number(d.port);
  if (!d.port.trim() || !Number.isInteger(port) || port < 1 || port > 65535) e.port = "Enter a port from 1 to 65535.";
  if (d.useSearch && !d.search_string) e.search = "Enter the string to search for.";
  return e;
}

export function toInput(d: Draft): HealthCheckInput {
  return {
    name: d.name.trim(),
    protocol: d.protocol,
    ip_address: d.target === "ip" ? d.ip_address.trim() : null,
    domain_name: d.target === "domain" ? d.domain_name.trim() : null,
    port: Number(d.port),
    resource_path: d.resource_path || "/",
    search_string: d.useSearch && d.protocol !== "TCP" ? d.search_string : "",
    request_interval: d.request_interval,
    failure_threshold: d.failure_threshold,
    inverted: d.inverted,
    disabled: d.disabled,
  };
}

export default function HealthCheckForm({
  initial,
  title,
  submitLabel,
  error,
  busy,
  onCancel,
  onSubmit,
}: {
  initial?: HealthCheck;
  title: string;
  submitLabel: string;
  error: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: HealthCheckInput) => void;
}) {
  const editing = !!initial;
  const [d, setD] = useState<Draft>(() => fromCheck(initial));
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const errs = submitted ? errorsOf(d) : {};

  const url =
    d.protocol === "TCP"
      ? `tcp://${(d.target === "ip" ? d.ip_address : d.domain_name) || "<endpoint>"}:${d.port || "<port>"}`
      : `${d.protocol.toLowerCase()}://${(d.target === "ip" ? d.ip_address : d.domain_name) || "<endpoint>"}:${d.port}${d.resource_path.startsWith("/") ? "" : "/"}${d.resource_path}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (Object.keys(errorsOf(d)).length === 0) onSubmit(toInput(d));
      }}
    >
      <Form
        header={<Header variant="h1">{title}</Header>}
        errorText={error}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy}>
              {submitLabel}
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Configure health check</Header>}>
            <SpaceBetween size="l">
              <FormField label="Name" errorText={errs.name} constraintText="Up to 255 characters.">
                <Input value={d.name} placeholder="my-website" onChange={(e) => set("name", e.detail.value)} autoFocus={!editing} />
              </FormField>
              <FormField label="What to monitor">
                <Tiles
                  value="endpoint"
                  items={[
                    { value: "endpoint", label: "Endpoint", description: "Route 53 sends requests to an IP address or domain name." },
                    { value: "other", label: "Status of other health checks", description: "Calculated health checks.", disabled: true },
                    { value: "alarm", label: "State of CloudWatch alarm", description: "Uses CloudWatch alarm data.", disabled: true },
                  ]}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">Monitor an endpoint</Header>}>
            <SpaceBetween size="l">
              <FormField label="Specify endpoint by">
                <RadioGroup
                  value={d.target}
                  onChange={(e) => set("target", e.detail.value as Draft["target"])}
                  items={[
                    { value: "ip", label: "IP address" },
                    { value: "domain", label: "Domain name" },
                  ]}
                />
              </FormField>
              <FormField
                label="Protocol"
                description={editing ? "You can't change the protocol after you create a health check." : undefined}
              >
                <Select
                  disabled={editing}
                  selectedOption={{ value: d.protocol, label: d.protocol }}
                  options={(["HTTP", "HTTPS", "TCP"] as const).map((p) => ({ value: p, label: p }))}
                  onChange={(e) => {
                    const p = e.detail.selectedOption.value as Protocol;
                    setD((prev) => ({
                      ...prev,
                      protocol: p,
                      port: prev.port === DEFAULT_PORT[prev.protocol] || !prev.port ? DEFAULT_PORT[p] : prev.port,
                    }));
                  }}
                />
              </FormField>
              {d.target === "ip" ? (
                <FormField label="IP address" errorText={errs.ip} description="Public IPv4 or IPv6 address of the endpoint.">
                  <Input value={d.ip_address} placeholder="192.0.2.44" onChange={(e) => set("ip_address", e.detail.value)} />
                </FormField>
              ) : (
                <FormField label="Domain name" errorText={errs.domain}>
                  <Input value={d.domain_name} placeholder="www.example.com" onChange={(e) => set("domain_name", e.detail.value)} />
                </FormField>
              )}
              <FormField label="Port" errorText={errs.port}>
                <Input inputMode="numeric" value={d.port} onChange={(e) => set("port", e.detail.value.replace(/\D/g, ""))} />
              </FormField>
              {d.protocol !== "TCP" && (
                <FormField label={<>Path <i>- optional</i></>} description="The path that Route 53 requests.">
                  <Input value={d.resource_path} placeholder="/" onChange={(e) => set("resource_path", e.detail.value)} />
                </FormField>
              )}
              <FormField label="URL">
                <span className="mono">{url}</span>
              </FormField>
            </SpaceBetween>
          </Container>

          <Container>
            <ExpandableSection headerText="Advanced configuration" variant="footer" defaultExpanded={editing}>
              <SpaceBetween size="l">
                <FormField label="Request interval" description={editing ? "You can't change the interval after you create a health check." : undefined}>
                  <RadioGroup
                    value={String(d.request_interval)}
                    onChange={(e) => set("request_interval", Number(e.detail.value) as 10 | 30)}
                    items={[
                      { value: "30", label: "Standard (30 seconds)", disabled: editing },
                      { value: "10", label: "Fast (10 seconds)", disabled: editing },
                    ]}
                  />
                </FormField>
                <FormField label="Failure threshold" description="Consecutive checks that must pass or fail to change the status.">
                  <Select
                    selectedOption={{ value: String(d.failure_threshold), label: String(d.failure_threshold) }}
                    options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                    onChange={(e) => set("failure_threshold", Number(e.detail.selectedOption.value))}
                  />
                </FormField>
                {d.protocol !== "TCP" && (
                  <FormField
                    label="String matching"
                    description="Healthy only if the first 5,120 bytes of the response body contain this string."
                    errorText={errs.search}
                  >
                    <SpaceBetween size="xs">
                      <Toggle checked={d.useSearch} onChange={(e) => set("useSearch", e.detail.checked)}>
                        {d.useSearch ? "Yes" : "No"}
                      </Toggle>
                      {d.useSearch && (
                        <Input value={d.search_string} placeholder="OK" onChange={(e) => set("search_string", e.detail.value)} />
                      )}
                    </SpaceBetween>
                  </FormField>
                )}
                <FormField label="Health check status">
                  <SpaceBetween size="xs">
                    <Checkbox checked={d.inverted} onChange={(e) => set("inverted", e.detail.checked)} description="Report healthy when the endpoint is failing, and unhealthy when it is passing.">
                      Invert health check status
                    </Checkbox>
                    <Checkbox checked={d.disabled} onChange={(e) => set("disabled", e.detail.checked)} description="Stop sending requests. Route 53 treats a disabled health check as healthy.">
                      Disable health check
                    </Checkbox>
                  </SpaceBetween>
                </FormField>
              </SpaceBetween>
            </ExpandableSection>
          </Container>
        </SpaceBetween>
      </Form>
    </form>
  );
}
