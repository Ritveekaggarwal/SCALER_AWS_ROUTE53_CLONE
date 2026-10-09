"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Tabs from "@cloudscape-design/components/tabs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ConsoleLayout, { ROOT_CRUMB, useFollow } from "@/components/console-layout";
import DeleteZonesModal from "@/components/delete-zones-modal";
import { useFlash } from "@/components/flash";
import RecordsTable, { RecordDetailsPanel } from "@/components/records-table";
import { downloadBlob, EmptyState } from "@/components/table-helpers";
import TestRecordModal from "@/components/test-record-modal";
import { api } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useZone } from "@/lib/hooks";
import type { DnsRecord } from "@/lib/types";

export default function HostedZoneDetailsPage() {
  return (
    <Suspense>
      <HostedZoneDetails />
    </Suspense>
  );
}

function HostedZoneDetails() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const follow = useFollow();
  const { notify } = useFlash();
  const { data: zone, isLoading, error } = useZone(zoneId);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const params = useSearchParams();
  const linkedRecord = params.get("record");

  useEffect(() => {
    if (!linkedRecord) return;
    api
      .getRecord(zoneId, Number(linkedRecord))
      .then((r) => {
        setSelected([r]);
        setPanelOpen(true);
      })
      .catch(() => {});
  }, [zoneId, linkedRecord]);
  const selectRecords = (records: DnsRecord[]) => {
    setSelected(records);
    if (records.length === 1) setPanelOpen(true);
  };

  const crumbs = [
    ROOT_CRUMB,
    { text: "Hosted zones", href: "/hostedzones" },
    { text: zone ? displayName(zone.name) : zoneId, href: `/hostedzones/${zoneId}` },
  ];

  if (isLoading || !zone) {
    return (
      <ConsoleLayout
        breadcrumbs={crumbs}
        content={
          <Box padding="xxl" textAlign="center">
            {error ? (
              <EmptyState
                title="Hosted zone not found"
                subtitle={(error as Error).message}
                action={<Button onClick={() => router.push("/hostedzones")}>Back to hosted zones</Button>}
              />
            ) : (
              <Spinner size="large" />
            )}
          </Box>
        }
      />
    );
  }

  const exportZone = async (format: "json" | "bind") => {
    try {
      const { blob, filename } = await api.exportZone(zone.id, format);
      downloadBlob(blob, filename);
      notify("success", `Exported ${displayName(zone.name)} as ${format === "json" ? "JSON" : "a BIND zone file"}.`);
    } catch {
      notify("error", "Export failed. Try again.");
    }
  };

  const selectedRecord = selected.length === 1 ? selected[0] : null;

  return (
    <ConsoleLayout
      breadcrumbs={crumbs}
      splitPanelOpen={panelOpen}
      onSplitPanelToggle={setPanelOpen}
      splitPanel={<RecordDetailsPanel zone={zone} record={selectedRecord} count={selected.length} />}
      content={
        <ContentLayout
          header={
            <Header
              variant="h1"
              info={<Link variant="info">Info</Link>}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setDeleting(true)}>Delete zone</Button>
                  <Button onClick={() => setTesting(true)}>Test record</Button>
                  <ButtonDropdown
                    items={[
                      { id: "bind", text: "BIND zone file (.zone)" },
                      { id: "json", text: "JSON (.json)" },
                    ]}
                    onItemClick={(e) => exportZone(e.detail.id as "json" | "bind")}
                  >
                    Export zone
                  </ButtonDropdown>
                </SpaceBetween>
              }
            >
              {displayName(zone.name)}
            </Header>
          }
        >
          <SpaceBetween size="l">
            <Container>
              <ExpandableSection
                defaultExpanded
                variant="footer"
                headerText="Hosted zone details"
                headerActions={
                  <Button href={`/hostedzones/${zone.id}/edit`} onFollow={follow}>
                    Edit hosted zone
                  </Button>
                }
              >
                <KeyValuePairs
                  columns={3}
                  items={[
                    { label: "Hosted zone name", value: displayName(zone.name) },
                    {
                      label: "Hosted zone ID",
                      value: (
                        <CopyToClipboard
                          variant="inline"
                          textToCopy={zone.id}
                          copySuccessText="Hosted zone ID copied"
                          copyErrorText="Failed to copy"
                        />
                      ),
                    },
                    { label: "Description", value: zone.comment || "-" },
                    { label: "Query log", value: "-" },
                    { label: "Type", value: zone.is_private ? "Private hosted zone" : "Public hosted zone" },
                    { label: "Record count", value: zone.record_count },
                    {
                      label: "Name servers",
                      value: (
                        <ul className="value-list">
                          {zone.name_servers.map((ns) => (
                            <li key={ns}>{displayName(ns)}</li>
                          ))}
                        </ul>
                      ),
                    },
                    ...(zone.is_private
                      ? [{ label: "VPC", value: `${zone.vpc_id} (${zone.vpc_region})` }]
                      : [{ label: "DNSSEC signing", value: <StatusIndicator type="stopped">Not signing</StatusIndicator> }]),
                  ]}
                />
              </ExpandableSection>
            </Container>

            <Tabs
              tabs={[
                {
                  id: "records",
                  label: `Records (${zone.record_count})`,
                  content: <RecordsTable zone={zone} selected={selected} onSelectionChange={selectRecords} />,
                },
                {
                  id: "dnssec",
                  label: "DNSSEC signing",
                  content: (
                    <Container header={<Header variant="h2">DNSSEC signing</Header>}>
                      <Box color="text-body-secondary">Coming soon. DNSSEC signing isn&apos;t available in this clone.</Box>
                    </Container>
                  ),
                },
                {
                  id: "tags",
                  label: "Hosted zone tags",
                  content: (
                    <Container header={<Header variant="h2" counter="(0)">Tags</Header>}>
                      <Box color="text-body-secondary">Coming soon. No tags are associated with this resource.</Box>
                    </Container>
                  ),
                },
              ]}
            />
          </SpaceBetween>
          {testing && (
            <TestRecordModal
              zone={zone}
              visible
              initial={
                selectedRecord
                  ? { name: selectedRecord.name === zone.name ? "" : selectedRecord.name.slice(0, -zone.name.length - 1), type: selectedRecord.type }
                  : undefined
              }
              onDismiss={() => setTesting(false)}
            />
          )}
          <DeleteZonesModal
            visible={deleting}
            zones={[zone]}
            onDismiss={() => setDeleting(false)}
            onDeleted={() => router.push("/hostedzones")}
          />
        </ContentLayout>
      }
    />
  );
}
