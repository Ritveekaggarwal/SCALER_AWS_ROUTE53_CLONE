"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { displayName, RECORD_TYPES } from "@/lib/dns";
import type { DnsTestResult, HostedZone } from "@/lib/types";

export default function TestRecordModal({
  zone,
  visible,
  initial,
  onDismiss,
}: {
  zone: HostedZone;
  visible: boolean;
  initial?: { name: string; type: string };
  onDismiss: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "A");
  const [result, setResult] = useState<DnsTestResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setResult(await api.testDns(zone.id, name.trim(), type));
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : "Couldn't test the record.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      size="large"
      header="Test record"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Close
            </Button>
            <Button variant="primary" loading={busy} onClick={run}>
              Get response
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <Box color="text-body-secondary">
          Check the response Route 53 returns for a DNS query to {displayName(zone.name)}. Wildcards and CNAME chains are
          followed.
        </Box>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <ColumnLayout columns={2}>
            <FormField label="Record name" description="Leave blank for the zone apex.">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input value={name} placeholder="www" onChange={(e) => setName(e.detail.value)} autoFocus />
                </div>
                <Box color="text-body-secondary">.{displayName(zone.name)}</Box>
              </div>
            </FormField>
            <FormField label="Type">
              <Select
                selectedOption={{ value: type, label: type }}
                options={[...RECORD_TYPES.map((t) => t.value), "SOA"].map((t) => ({ value: t, label: t }))}
                onChange={(e) => setType(e.detail.selectedOption.value ?? "A")}
              />
            </FormField>
          </ColumnLayout>
          <button type="submit" hidden />
        </form>
        {error && <Alert type="error">{error}</Alert>}
        {result && (
          <SpaceBetween size="m">
            <KeyValuePairs
              columns={4}
              items={[
                { label: "DNS query", value: `${displayName(result.query_name)} ${result.query_type}` },
                { label: "Protocol", value: result.protocol },
                {
                  label: "Response code",
                  value: (
                    <StatusIndicator type={result.response_code === "NOERROR" ? "success" : "error"}>
                      {result.response_code}
                    </StatusIndicator>
                  ),
                },
                { label: "Answers", value: result.answers.length },
              ]}
            />
            <Table
              variant="embedded"
              items={result.answers}
              empty={
                <Box textAlign="center" color="text-body-secondary">
                  {result.response_code === "NXDOMAIN"
                    ? "The name doesn't exist in this hosted zone."
                    : "The name exists but has no records of this type."}
                </Box>
              }
              columnDefinitions={[
                { id: "name", header: "Name", cell: (a) => displayName(a.name) },
                { id: "type", header: "Type", cell: (a) => a.type },
                { id: "ttl", header: "TTL", cell: (a) => a.ttl },
                { id: "value", header: "Response returned by Route 53", cell: (a) => <span className="mono">{a.value}</span> },
              ]}
            />
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Modal>
  );
}
