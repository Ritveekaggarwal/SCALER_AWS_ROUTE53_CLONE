"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useState } from "react";
import { useFlash } from "./flash";
import { api, ApiError } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useInvalidateZoneData } from "@/lib/hooks";
import type { DnsRecord } from "@/lib/types";

export default function DeleteRecordsModal({
  zoneId,
  records,
  visible,
  onDismiss,
  onDeleted,
}: {
  zoneId: string;
  records: DnsRecord[];
  visible: boolean;
  onDismiss: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const protectedOnes = records.filter((r) => r.protected);
  const deletable = records.filter((r) => !r.protected);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      let deletedCount = 1;
      if (deletable.length === 1) {
        await api.deleteRecord(zoneId, deletable[0].id);
      } else {
        const res = await api.bulkDeleteRecords(zoneId, deletable.map((r) => r.id));
        deletedCount = res.deleted.length;
        res.failed.forEach((f) => notify("error", f.reason, "Couldn't delete record"));
      }
      if (deletedCount) {
        notify(
          "success",
          deletable.length === 1
            ? `Record ${displayName(deletable[0].name)} (${deletable[0].type}) was successfully deleted.`
            : `${deletedCount} records were successfully deleted.`,
        );
      }
      invalidate(zoneId);
      onDeleted();
      onDismiss();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      size="medium"
      header={deletable.length === 1 ? "Delete record" : "Delete records"}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!deletable.length} onClick={submit}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box>
          {deletable.length === 1
            ? "Are you sure you want to delete the following record?"
            : `Are you sure you want to delete the following ${deletable.length} records?`}
        </Box>
        {deletable.length > 0 && (
          <Table
            variant="embedded"
            items={deletable}
            columnDefinitions={[
              { id: "name", header: "Record name", cell: (r) => displayName(r.name) },
              { id: "type", header: "Type", cell: (r) => r.type },
              { id: "value", header: "Value", cell: (r) => r.values.join(", ") },
            ]}
          />
        )}
        {protectedOnes.length > 0 && (
          <Alert type="info">
            The default NS and SOA records for the zone apex can&apos;t be deleted and were left out of this request.
          </Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}
      </SpaceBetween>
    </Modal>
  );
}
