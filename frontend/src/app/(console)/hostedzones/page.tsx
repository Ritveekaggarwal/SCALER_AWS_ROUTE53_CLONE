"use client";

import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB, useFollow } from "@/components/console-layout";
import DeleteZonesModal from "@/components/delete-zones-modal";
import { EmptyState, TablePreferences, useDebounced, usePersistentState } from "@/components/table-helpers";
import { displayName } from "@/lib/dns";
import { useZones } from "@/lib/hooks";
import type { HostedZone } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const COLUMNS = [
  { id: "name", label: "Hosted zone name", alwaysVisible: true },
  { id: "type", label: "Type" },
  { id: "createdBy", label: "Created by" },
  { id: "recordCount", label: "Record count" },
  { id: "description", label: "Description" },
  { id: "id", label: "Hosted zone ID" },
];

export default function HostedZonesPage() {
  const router = useRouter();
  const follow = useFollow();
  const [filterText, setFilterText] = useState("");
  const [typeFilter, setTypeFilter] = useState(TYPE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [prefs, setPrefs] = usePersistentState("r53-zones-prefs", {
    pageSize: 10,
    wrapLines: false,
    stripedRows: false,
    contentDisplay: COLUMNS.map((c) => ({ id: c.id, visible: true })),
  });

  const search = useDebounced(filterText);
  const { data, isLoading, isFetching, error, refetch } = useZones({
    search,
    type: typeFilter.value || undefined,
    page,
    page_size: prefs.pageSize ?? 10,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const columnDefinitions: TableProps.ColumnDefinition<HostedZone>[] = [
    {
      id: "name",
      header: "Hosted zone name",
      cell: (z) => (
        <Link href={`/hostedzones/${z.id}`} onFollow={follow}>
          {displayName(z.name)}
        </Link>
      ),
    },
    { id: "type", header: "Type", cell: (z) => (z.is_private ? "Private" : "Public") },
    { id: "createdBy", header: "Created by", cell: (z) => z.created_by },
    { id: "recordCount", header: "Record count", cell: (z) => z.record_count },
    { id: "description", header: "Description", cell: (z) => z.comment || "-" },
    { id: "id", header: "Hosted zone ID", cell: (z) => z.id },
  ];

  const one = selected.length === 1 ? selected[0] : null;

  return (
    <ConsoleLayout
      contentType="table"
      breadcrumbs={[ROOT_CRUMB, { text: "Hosted zones", href: "/hostedzones" }]}
      content={
        <>
          <Table
            variant="full-page"
            stickyHeader
            loading={isLoading}
            loadingText="Loading hosted zones"
            items={items}
            trackBy="id"
            selectionType="multi"
            selectedItems={selected}
            onSelectionChange={(e) => setSelected(e.detail.selectedItems)}
            ariaLabels={{
              selectionGroupLabel: "Hosted zone selection",
              itemSelectionLabel: (_, z) => displayName(z.name),
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
                info={<Link variant="info">Info</Link>}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button iconName="refresh" ariaLabel="Refresh" loading={isFetching && !isLoading} onClick={() => refetch()} />
                    <Button disabled={!one} onClick={() => one && router.push(`/hostedzones/${one.id}`)}>
                      View details
                    </Button>
                    <Button disabled={!one} onClick={() => one && router.push(`/hostedzones/${one.id}/edit`)}>
                      Edit
                    </Button>
                    <Button disabled={!selected.length} onClick={() => setDeleting(true)}>
                      Delete
                    </Button>
                    <Button variant="primary" href="/hostedzones/create" onFollow={follow}>
                      Create hosted zone
                    </Button>
                  </SpaceBetween>
                }
              >
                Hosted zones
              </Header>
            }
            filter={
              <SpaceBetween direction="horizontal" size="xs">
                <div style={{ minWidth: 320 }}>
                  <TextFilter
                    filteringText={filterText}
                    filteringPlaceholder="Filter hosted zones by property or value"
                    filteringAriaLabel="Filter hosted zones"
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
                  onChange={(e) => {
                    setTypeFilter(e.detail.selectedOption as (typeof TYPE_OPTIONS)[number]);
                    setPage(1);
                  }}
                  ariaLabel="Filter by type"
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
                <EmptyState title="Couldn't load hosted zones" subtitle={(error as Error).message} />
              ) : search || typeFilter.value ? (
                <EmptyState
                  title="No matches"
                  subtitle="We can't find a match."
                  action={
                    <Button
                      onClick={() => {
                        setFilterText("");
                        setTypeFilter(TYPE_OPTIONS[0]);
                      }}
                    >
                      Clear filter
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No hosted zones"
                  subtitle="You don't have any hosted zones."
                  action={
                    <Button href="/hostedzones/create" onFollow={follow}>
                      Create hosted zone
                    </Button>
                  }
                />
              )
            }
          />
          <DeleteZonesModal
            visible={deleting}
            zones={selected}
            onDismiss={() => setDeleting(false)}
            onDeleted={() => setSelected([])}
          />
        </>
      }
    />
  );
}
