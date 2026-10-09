"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import LineChart from "@cloudscape-design/components/line-chart";
import Pagination from "@cloudscape-design/components/pagination";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Tabs from "@cloudscape-design/components/tabs";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { DeleteHealthChecksModal, HealthStatusIndicator, useInvalidateHealthChecks } from "@/components/health-status";
import { timeAgo } from "@/components/shell/drawers";
import { EmptyState, formatDate } from "@/components/table-helpers";
import { api, ApiError } from "@/lib/api";
import { useHealthCheck, useHealthCheckResults } from "@/lib/hooks";
import type { HealthCheck, HealthCheckResult } from "@/lib/types";

const PAGE = 15;

function Monitoring({ results, loading }: { results: HealthCheckResult[]; loading: boolean }) {
  const ordered = [...results].reverse();
  const latency = ordered.filter((r) => r.latency_ms != null).map((r) => ({ x: new Date(r.checked_at), y: r.latency_ms! }));
  const passing = ordered.map((r) => ({ x: new Date(r.checked_at), y: r.success ? 100 : 0 }));
  const ok = results.filter((r) => r.success).length;
  const avg = latency.length ? Math.round(latency.reduce((n, p) => n + p.y, 0) / latency.length) : null;
  const timeFormat = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h2">Summary of recent checks</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Checks</Box>
            <Box variant="awsui-value-large">{results.length}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Passing</Box>
            <Box variant="awsui-value-large">{results.length ? `${Math.round((ok / results.length) * 100)}%` : "-"}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Average latency</Box>
            <Box variant="awsui-value-large">{avg != null ? `${avg} ms` : "-"}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Failed checks</Box>
            <Box variant="awsui-value-large">{results.length - ok}</Box>
          </div>
        </ColumnLayout>
      </Container>
      <ColumnLayout columns={2}>
        <Container header={<Header variant="h2">Health check status</Header>}>
          <LineChart
            series={[{ title: "Endpoints passing (%)", type: "line", data: passing }]}
            xScaleType="time"
            yDomain={[0, 100]}
            xTickFormatter={timeFormat}
            height={200}
            hideFilter
            hideLegend
            statusType={loading ? "loading" : "finished"}
            empty={<Box textAlign="center">No checks yet</Box>}
            ariaLabel="Health check status"
            yTitle="% passing"
          />
        </Container>
        <Container header={<Header variant="h2">Latency</Header>}>
          <LineChart
            series={[{ title: "Latency (ms)", type: "line", data: latency }]}
            xScaleType="time"
            xTickFormatter={timeFormat}
            height={200}
            hideFilter
            hideLegend
            statusType={loading ? "loading" : "finished"}
            empty={<Box textAlign="center">No latency data</Box>}
            ariaLabel="Latency"
            yTitle="ms"
          />
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}

function Checkers({ results, loading }: { results: HealthCheckResult[]; loading: boolean }) {
  const [page, setPage] = useState(1);
  const items = results.slice((page - 1) * PAGE, page * PAGE);
  return (
    <Table
      variant="container"
      header={<Header variant="h2" counter={`(${results.length})`} description="The most recent probe results, newest first.">Health checker results</Header>}
      loading={loading}
      items={items}
      empty={<Box textAlign="center">No results yet</Box>}
      pagination={
        <Pagination currentPageIndex={page} pagesCount={Math.max(1, Math.ceil(results.length / PAGE))} onChange={(e) => setPage(e.detail.currentPageIndex)} />
      }
      columnDefinitions={[
        { id: "time", header: "Time", cell: (r) => formatDate(r.checked_at) },
        {
          id: "result",
          header: "Result",
          cell: (r) => <StatusIndicator type={r.success ? "success" : "error"}>{r.success ? "Success" : "Failure"}</StatusIndicator>,
        },
        { id: "code", header: "Status code", cell: (r) => r.status_code ?? "-" },
        { id: "latency", header: "Latency", cell: (r) => (r.latency_ms != null ? `${r.latency_ms} ms` : "-") },
        { id: "message", header: "Details", cell: (r) => r.message },
      ]}
    />
  );
}

function Details({ hc }: { hc: HealthCheck }) {
  return (
    <Container header={<Header variant="h2">Configuration</Header>}>
      <KeyValuePairs
        columns={3}
        items={[
          { label: "Health check ID", value: <span className="mono">{hc.id}</span> },
          { label: "Status", value: <HealthStatusIndicator hc={hc} /> },
          { label: "URL", value: <span className="mono">{hc.endpoint}</span> },
          { label: "Protocol", value: hc.protocol },
          { label: "IP address", value: hc.ip_address ?? "-" },
          { label: "Domain name", value: hc.domain_name ?? "-" },
          { label: "Port", value: hc.port },
          { label: "Path", value: hc.protocol === "TCP" ? "-" : hc.resource_path },
          { label: "Search string", value: hc.search_string || "-" },
          { label: "Request interval", value: `${hc.request_interval} seconds` },
          { label: "Failure threshold", value: hc.failure_threshold },
          { label: "Inverted", value: hc.inverted ? "Yes" : "No" },
          { label: "Disabled", value: hc.disabled ? "Yes" : "No" },
          { label: "Associated records", value: hc.record_count },
          { label: "Created", value: formatDate(hc.created_at) },
          {
            label: "Last checked",
            value: hc.last_checked_at ? `${timeAgo(hc.last_checked_at)}: ${hc.last_message}` : "Not checked yet",
          },
        ]}
      />
    </Container>
  );
}

export default function HealthCheckDetailsPage() {
  const { healthCheckId } = useParams<{ healthCheckId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateHealthChecks();
  const { data: hc, error } = useHealthCheck(healthCheckId);
  const { data: results = [], isLoading } = useHealthCheckResults(healthCheckId);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const checkNow = async () => {
    setChecking(true);
    try {
      const r = await api.checkNow(healthCheckId);
      invalidate();
      notify(r.last_message.startsWith("Success") || r.status === "Healthy" ? "success" : "warning", `Checked ${r.name}: ${r.last_message}`);
    } catch (e) {
      notify("error", e instanceof ApiError ? e.message : "Couldn't run the health check.");
    } finally {
      setChecking(false);
    }
  };

  const toggleDisabled = async () => {
    if (!hc) return;
    setToggling(true);
    try {
      await api.updateHealthCheck(hc.id, { disabled: !hc.disabled });
      invalidate();
      notify("success", `Health check ${hc.name} was ${hc.disabled ? "enabled" : "disabled"}.`);
    } catch (e) {
      notify("error", e instanceof ApiError ? e.message : "Couldn't update the health check.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <ConsoleLayout
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Health checks", href: "/healthchecks" },
        { text: hc?.name ?? healthCheckId, href: `/healthchecks/${healthCheckId}` },
      ]}
      content={
        error ? (
          <EmptyState title="Health check not found" subtitle={(error as Error).message} />
        ) : !hc ? (
          <Spinner size="large" />
        ) : (
          <SpaceBetween size="l">
            <Header
              variant="h1"
              description={<span className="mono">{hc.endpoint}</span>}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setDeleting(true)}>Delete</Button>
                  <Button loading={toggling} onClick={toggleDisabled}>
                    {hc.disabled ? "Enable" : "Disable"}
                  </Button>
                  <Button onClick={() => router.push(`/healthchecks/${hc.id}/edit`)}>Edit health check</Button>
                  <Button variant="primary" iconName="refresh" loading={checking} onClick={checkNow} disabled={hc.disabled}>
                    Check now
                  </Button>
                </SpaceBetween>
              }
            >
              {hc.name}
            </Header>
            <Tabs
              tabs={[
                { id: "monitoring", label: "Monitoring", content: <Monitoring results={results} loading={isLoading} /> },
                { id: "checkers", label: "Health checkers", content: <Checkers results={results} loading={isLoading} /> },
                { id: "details", label: "Details", content: <Details hc={hc} /> },
              ]}
            />
            <DeleteHealthChecksModal
              visible={deleting}
              checks={[hc]}
              onDismiss={() => setDeleting(false)}
              onDeleted={() => router.push("/healthchecks")}
            />
          </SpaceBetween>
        )
      }
    />
  );
}
