"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Pagination from "@cloudscape-design/components/pagination";
import Select, { type SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import SplitPanel from "@cloudscape-design/components/split-panel";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFollow } from "./console-layout";
import DeleteRecordsModal from "./delete-records-modal";
import { EmptyState, formatDate, TablePreferences, useDebounced, usePersistentState } from "./table-helpers";
import { displayName, RECORD_TYPES } from "@/lib/dns";
import { useAllHealthChecks, useRecords } from "@/lib/hooks";
import Link from "@cloudscape-design/components/link";
import { HealthStatusIndicator } from "./health-status";
import type { DnsRecord, HostedZone } from "@/lib/types";

const COLUMNS = [
  { id: "name", label: "Record name", alwaysVisible: true },
  { id: "type", label: "Type" },
  { id: "routing", label: "Routing policy" },
  { id: "differentiator", label: "Differentiator" },
  { id: "alias", label: "Alias" },
  { id: "value", label: "Value/Route traffic to" },
  { id: "ttl", label: "TTL (seconds)" },
  { id: "healthCheck", label: "Health check ID" },
  { id: "evaluate", label: "Evaluate target health" },
  { id: "recordId", label: "Record ID" },
];

const ALL_TYPES: SelectProps.Option = { value: "", label: "All record types" };
const TYPE_OPTIONS: SelectProps.Options = [
  ALL_TYPES,
  ...[...RECORD_TYPES.map((t) => t.value), "SOA"].sort().map((t) => ({ value: t, label: t })),
];

function ValueCell({ values }: { values: string[] }) {
  return (
    <ul className="value-list">
      {values.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  );
}

export default function RecordsTable({
  zone,
  selected,
  onSelectionChange,
}: {
  zone: HostedZone;
  selected: DnsRecord[];
  onSelectionChange: (r: DnsRecord[]) => void;
}) {
  const router = useRouter();
  const follow = useFollow();
  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState<SelectProps.Option>(ALL_TYPES);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [prefs, setPrefs] = usePersistentState("r53-records-prefs", {
    pageSize: 50,
    wrapLines: false,
    stripedRows: false,
    contentDisplay: COLUMNS.map((c) => ({
      id: c.id,
      visible: !["differentiator", "evaluate", "recordId"].includes(c.id),
    })),
  });

  const search = useDebounced(filterText);
  const { data, isLoading, isFetching, refetch, error } = useRecords(zone.id, {
    search,
    type: typeFilter.value || undefined,
    page,
    page_size: prefs.pageSize ?? 50,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const one = selected.length === 1 ? selected[0] : null;
  const { data: checks } = useAllHealthChecks();
  const checkById = new Map((checks?.items ?? []).map((c) => [c.id, c]));

  const columnDefinitions: TableProps.ColumnDefinition<DnsRecord>[] = [
    { id: "name", header: "Record name", cell: (r) => displayName(r.name), isRowHeader: true },
    { id: "type", header: "Type", cell: (r) => r.type },
    { id: "routing", header: "Routing policy", cell: (r) => r.routing_policy },
    { id: "differentiator", header: "Differentiator", cell: () => "-" },
    { id: "alias", header: "Alias", cell: (r) => (r.alias ? "Yes" : "No") },
    { id: "value", header: "Value/Route traffic to", cell: (r) => <ValueCell values={r.values} /> },
    { id: "ttl", header: "TTL (seconds)", cell: (r) => r.ttl },
    {
      id: "healthCheck",
      header: "Health check ID",
      cell: (r) => {
        if (!r.health_check_id) return "-";
        const hc = checkById.get(r.health_check_id);
        return (
          <SpaceBetween size="xxxs">
            <Link href={`/healthchecks/${r.health_check_id}`} onFollow={follow}>
              {hc?.name ?? r.health_check_id.slice(0, 8)}
            </Link>
            {hc && <HealthStatusIndicator hc={hc} />}
          </SpaceBetween>
        );
      },
    },
    { id: "evaluate", header: "Evaluate target health", cell: () => "-" },
    { id: "recordId", header: "Record ID", cell: (r) => r.id },
  ];

  return (
    <>
      <Table
        variant="container"
        loading={isLoading}
        loadingText="Loading records"
        items={items}
        trackBy="id"
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={(e) => onSelectionChange(e.detail.selectedItems)}
        onRowClick={(e) => onSelectionChange([e.detail.item])}
        ariaLabels={{
          selectionGroupLabel: "Record selection",
          itemSelectionLabel: (_, r) => `${displayName(r.name)} ${r.type}`,
          allItemsSelectionLabel: () => "Select all records",
        }}
        columnDefinitions={columnDefinitions}
        columnDisplay={prefs.contentDisplay}
        wrapLines={prefs.wrapLines}
        stripedRows={prefs.stripedRows}
        header={
          <Header
            counter={selected.length ? `(${selected.length}/${total})` : `(${total})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" ariaLabel="Refresh records" loading={isFetching && !isLoading} onClick={() => refetch()} />
                <Button
                  disabled={!selected.length || selected.every((r) => r.protected)}
                  onClick={() => setDeleting(true)}
                >
                  Delete record
                </Button>
                <Button
                  disabled={!one}
                  onClick={() => one && router.push(`/hostedzones/${zone.id}/records/${one.id}/edit`)}
                >
                  Edit record
                </Button>
                <Button href={`/hostedzones/${zone.id}/import`} onFollow={follow}>
                  Import zone file
                </Button>
                <Button variant="primary" href={`/hostedzones/${zone.id}/records/create`} onFollow={follow}>
                  Create record
                </Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <div style={{ minWidth: 320 }}>
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter records by property or value"
                filteringAriaLabel="Filter records"
                countText={search ? `${total} match${total === 1 ? "" : "es"}` : undefined}
                onChange={(e) => {
                  setFilterText(e.detail.filteringText);
                  setPage(1);
                }}
              />
            </div>
            <Select
              selectedOption={typeFilter}
              options={TYPE_OPTIONS}
              ariaLabel="Filter by record type"
              onChange={(e) => {
                setTypeFilter(e.detail.selectedOption);
                setPage(1);
              }}
            />
          </SpaceBetween>
        }
        pagination={
          <Pagination
            currentPageIndex={page}
            pagesCount={Math.max(1, Math.ceil(total / (prefs.pageSize ?? 50)))}
            onChange={(e) => setPage(e.detail.currentPageIndex)}
          />
        }
        preferences={
          <TablePreferences
            preferences={prefs}
            columns={COLUMNS}
            pageSizes={[10, 50, 100, 300]}
            onConfirm={(p) => {
              setPrefs({ ...prefs, ...p } as typeof prefs);
              setPage(1);
            }}
          />
        }
        empty={
          error ? (
            <EmptyState title="Couldn't load records" subtitle={(error as Error).message} />
          ) : (
            <EmptyState
              title="No records"
              subtitle={search || typeFilter.value ? "We can't find a match." : "No records to display."}
              action={
                search || typeFilter.value ? (
                  <Button
                    onClick={() => {
                      setFilterText("");
                      setTypeFilter(ALL_TYPES);
                    }}
                  >
                    Clear filter
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />
      <DeleteRecordsModal
        zoneId={zone.id}
        records={selected}
        visible={deleting}
        onDismiss={() => setDeleting(false)}
        onDeleted={() => onSelectionChange([])}
      />
    </>
  );
}

export function RecordDetailsPanel({
  zone,
  record,
  count,
}: {
  zone: HostedZone;
  record: DnsRecord | null;
  count: number;
}) {
  const router = useRouter();
  const i18n = {
    preferencesTitle: "Split panel preferences",
    preferencesPositionLabel: "Split panel position",
    preferencesPositionDescription: "Choose the default split panel position for the service.",
    preferencesPositionSide: "Side",
    preferencesPositionBottom: "Bottom",
    preferencesConfirm: "Confirm",
    preferencesCancel: "Cancel",
    closeButtonAriaLabel: "Close panel",
    openButtonAriaLabel: "Open panel",
    resizeHandleAriaLabel: "Resize split panel",
  };

  if (!record) {
    return (
      <SplitPanel header={count > 1 ? `${count} records selected` : "Record details"} i18nStrings={i18n} hidePreferencesButton>
        <Box textAlign="center" color="text-body-secondary">
          {count > 1 ? "Select a single record to see its details." : "Select a record to see its details."}
        </Box>
      </SplitPanel>
    );
  }

  return (
    <SplitPanel header="Record details" i18nStrings={i18n} hidePreferencesButton>
      <SpaceBetween size="m">
        <Box float="right">
          <Button onClick={() => router.push(`/hostedzones/${zone.id}/records/${record.id}/edit`)}>Edit record</Button>
        </Box>
        <KeyValuePairs
          columns={3}
          items={[
            { label: "Record name", value: displayName(record.name) },
            { label: "Record type", value: record.type },
            { label: "Value", value: <ValueCell values={record.values} /> },
            { label: "Alias", value: record.alias ? "Yes" : "No" },
            { label: "TTL (seconds)", value: record.ttl },
            { label: "Routing policy", value: record.routing_policy },
            {
              label: "Health check ID",
              value: record.health_check_id ? (
                <Link href={`/healthchecks/${record.health_check_id}`} onFollow={(e) => { e.preventDefault(); router.push(`/healthchecks/${record.health_check_id}`); }}>
                  <span className="mono">{record.health_check_id}</span>
                </Link>
              ) : (
                "-"
              ),
            },
            { label: "Created", value: formatDate(record.created_at) },
            { label: "Last updated", value: formatDate(record.updated_at) },
          ]}
        />
      </SpaceBetween>
    </SplitPanel>
  );
}
