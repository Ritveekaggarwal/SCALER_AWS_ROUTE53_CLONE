"use client";

import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ConsoleLayout, { ROOT_CRUMB, useFollow } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { DeleteHealthChecksModal, HealthStatusIndicator, useInvalidateHealthChecks } from "@/components/health-status";
import { timeAgo } from "@/components/shell/drawers";
import { EmptyState, TablePreferences, useDebounced, usePersistentState } from "@/components/table-helpers";
import { api, ApiError } from "@/lib/api";
import { useHealthChecks } from "@/lib/hooks";
import type { HealthCheck } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Healthy", label: "Healthy" },
  { value: "Unhealthy", label: "Unhealthy" },
  { value: "Unknown", label: "Unknown" },
  { value: "Disabled", label: "Disabled" },
];

const COLUMNS = [
  { id: "name", label: "Name", alwaysVisible: true },
  { id: "status", label: "Status" },
  { id: "description", label: "Description" },
  { id: "protocol", label: "Protocol" },
  { id: "interval", label: "Interval" },
  { id: "latency", label: "Latency" },
  { id: "checked", label: "Last checked" },
  { id: "records", label: "Associated records" },
  { id: "id", label: "Health check ID" },
];

function HealthChecks() {
  const router = useRouter();
  const follow = useFollow();
  const params = useSearchParams();
  const { notify } = useFlash();
  const invalidate = useInvalidateHealthChecks();
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    STATUS_OPTIONS.find((o) => o.value && o.value === params.get("status")) ?? STATUS_OPTIONS[0],
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HealthCheck[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [prefs, setPrefs] = usePersistentState("r53-hc-prefs", {
    pageSize: 10,
    wrapLines: false,
    stripedRows: false,
    contentDisplay: COLUMNS.map((c) => ({ id: c.id, visible: c.id !== "interval" })),
  });

  const search = useDebounced(filterText);
  const { data, isLoading, isFetching, error, refetch } = useHealthChecks({
    search,
    status: statusFilter.value || undefined,
    page,
    page_size: prefs.pageSize ?? 10,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const one = selected.length === 1 ? selected[0] : null;

  const checkNow = async () => {
    setChecking(true);
    try {
      const results = await Promise.all(selected.map((c) => api.checkNow(c.id)));
      invalidate();
      notify(
        "success",
        results.length === 1
          ? `Checked ${results[0].name}: ${results[0].last_message}`
          : `Ran ${results.length} health checks.`,
      );
    } catch (e) {
      notify("error", e instanceof ApiError ? e.message : "Couldn't run the health check.");
    } finally {
      setChecking(false);
    }
  };

  const columnDefinitions: TableProps.ColumnDefinition<HealthCheck>[] = [
    {
      id: "name",
      header: "Name",
      cell: (c) => (
        <Link href={`/healthchecks/${c.id}`} onFollow={follow}>
          {c.name}
        </Link>
      ),
    },
    { id: "status", header: "Status", cell: (c) => <HealthStatusIndicator hc={c} /> },
    { id: "description", header: "Description", cell: (c) => <span className="mono">{c.endpoint}</span> },
    { id: "protocol", header: "Protocol", cell: (c) => c.protocol },
    { id: "interval", header: "Interval", cell: (c) => `${c.request_interval}s` },
    { id: "latency", header: "Latency", cell: (c) => (c.last_latency_ms != null ? `${c.last_latency_ms} ms` : "-") },
    { id: "checked", header: "Last checked", cell: (c) => (c.last_checked_at ? timeAgo(c.last_checked_at) : "Never") },
    { id: "records", header: "Associated records", cell: (c) => c.record_count },
    { id: "id", header: "Health check ID", cell: (c) => <span className="mono">{c.id}</span> },
  ];

  return (
    <>
      <Table
        variant="full-page"
        stickyHeader
        loading={isLoading}
        loadingText="Loading health checks"
        items={items}
        trackBy="id"
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={(e) => setSelected(e.detail.selectedItems)}
        ariaLabels={{
          selectionGroupLabel: "Health check selection",
          itemSelectionLabel: (_, c) => c.name,
          allItemsSelectionLabel: () => "Select all",
        }}
        columnDefinitions={columnDefinitions}
        columnDisplay={prefs.contentDisplay}
        wrapLines={prefs.wrapLines}
        stripedRows={prefs.stripedRows}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={selected.length ? `(${selected.length}/${total})` : `(${total})`}
            description="Route 53 probes each endpoint on its interval and marks it healthy or unhealthy."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh" loading={isFetching && !isLoading} onClick={() => refetch()} />
                <Button disabled={!selected.length} loading={checking} onClick={checkNow}>
                  Check now
                </Button>
                <Button disabled={!one} onClick={() => one && router.push(`/healthchecks/${one.id}/edit`)}>
                  Edit
                </Button>
                <Button disabled={!selected.length} onClick={() => setDeleting(true)}>
                  Delete
                </Button>
                <Button variant="primary" href="/healthchecks/create" onFollow={follow}>
                  Create health check
                </Button>
              </SpaceBetween>
            }
          >
            Health checks
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <div style={{ minWidth: 320 }}>
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter health checks by name or endpoint"
                filteringAriaLabel="Filter health checks"
                countText={search ? `${total} match${total === 1 ? "" : "es"}` : undefined}
                onChange={(e) => {
                  setFilterText(e.detail.filteringText);
                  setPage(1);
                }}
              />
            </div>
            <Select
              selectedOption={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(e) => {
                setStatusFilter(e.detail.selectedOption as (typeof STATUS_OPTIONS)[number]);
                setPage(1);
              }}
              ariaLabel="Filter by status"
            />
          </SpaceBetween>
        }
        pagination={
          <Pagination
            currentPageIndex={page}
            pagesCount={Math.max(1, Math.ceil(total / (prefs.pageSize ?? 10)))}
            onChange={(e) => setPage(e.detail.currentPageIndex)}
          />
        }
        preferences={
          <TablePreferences
            preferences={prefs}
            columns={COLUMNS}
            onConfirm={(p) => {
              setPrefs({ ...prefs, ...p } as typeof prefs);
              setPage(1);
            }}
          />
        }
        empty={
          error ? (
            <EmptyState title="Couldn't load health checks" subtitle={(error as Error).message} />
          ) : search || statusFilter.value ? (
            <EmptyState
              title="No matches"
              subtitle="We can't find a match."
              action={
                <Button
                  onClick={() => {
                    setFilterText("");
                    setStatusFilter(STATUS_OPTIONS[0]);
                  }}
                >
                  Clear filter
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No health checks"
              subtitle="Create a health check to monitor a web server or other endpoint."
              action={
                <Button href="/healthchecks/create" onFollow={follow}>
                  Create health check
                </Button>
              }
            />
          )
        }
      />
      <DeleteHealthChecksModal
        visible={deleting}
        checks={selected}
        onDismiss={() => setDeleting(false)}
        onDeleted={() => setSelected([])}
      />
    </>
  );
}

export default function HealthChecksPage() {
  return (
    <ConsoleLayout
      contentType="table"
      breadcrumbs={[ROOT_CRUMB, { text: "Health checks", href: "/healthchecks" }]}
      content={
        <Suspense>
          <HealthChecks />
        </Suspense>
      }
    />
  );
}
