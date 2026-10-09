"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useState } from "react";
import { useFlash } from "./flash";
import { api, ApiError } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useForgetZones } from "@/lib/hooks";
import type { HostedZone } from "@/lib/types";

export default function DeleteZonesModal({
  zones,
  visible,
  onDismiss,
  onDeleted,
}: {
  zones: HostedZone[];
  visible: boolean;
  onDismiss: () => void;
  onDeleted?: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useFlash();
  const forget = useForgetZones();

  const close = () => {
    setConfirm("");
    setError("");
    onDismiss();
  };

  const withRecords = zones.filter((z) => z.record_count > 2);
  const single = zones.length === 1;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (single) {
        await api.deleteZone(zones[0].id);
        notify("success", `Hosted zone ${displayName(zones[0].name)} was successfully deleted.`);
      } else {
        const res = await api.bulkDeleteZones(zones.map((z) => z.id));
        if (res.deleted.length) notify("success", `${res.deleted.length} hosted zones were successfully deleted.`);
        res.failed.forEach((f) => notify("error", f.reason, "Couldn't delete hosted zone"));
      }
      setConfirm("");
      onDeleted?.();
      onDismiss();
      forget(zones.map((z) => z.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={close}
      header={single ? "Delete hosted zone?" : `Delete ${zones.length} hosted zones?`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={confirm !== "delete"} onClick={submit}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box>
          {single ? (
            <>
              Permanently delete hosted zone <b>{displayName(zones[0]?.name ?? "")}</b>? You can&apos;t undo this action.
            </>
          ) : (
            <>Permanently delete {zones.length} hosted zones? You can&apos;t undo this action.</>
          )}
        </Box>
        {withRecords.length > 0 && (
          <Alert type="warning">
            {withRecords.map((z) => displayName(z.name)).join(", ")}{" "}
            {withRecords.length === 1 ? "contains" : "contain"} records other than the default NS and SOA records. You
            must delete those records before you can delete the hosted zone.
          </Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}
        <FormField label={<>To confirm deletion, enter <i>delete</i> in the text input field.</>}>
          <Input value={confirm} placeholder="delete" onChange={(e) => setConfirm(e.detail.value)} />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
