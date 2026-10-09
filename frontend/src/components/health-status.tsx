"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFlash } from "./flash";
import { api, ApiError } from "@/lib/api";
import type { HealthCheck } from "@/lib/types";

export function HealthStatusIndicator({ hc }: { hc: Pick<HealthCheck, "status" | "disabled"> }) {
  if (hc.disabled) return <StatusIndicator type="stopped">Disabled</StatusIndicator>;
  if (hc.status === "Healthy") return <StatusIndicator type="success">Healthy</StatusIndicator>;
  if (hc.status === "Unhealthy") return <StatusIndicator type="error">Unhealthy</StatusIndicator>;
  return <StatusIndicator type="pending">Unknown</StatusIndicator>;
}

export function useInvalidateHealthChecks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["healthchecks"] });
    qc.invalidateQueries({ queryKey: ["healthcheck"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
  };
}

export function DeleteHealthChecksModal({
  visible,
  checks,
  onDismiss,
  onDeleted,
}: {
  visible: boolean;
  checks: HealthCheck[];
  onDismiss: () => void;
  onDeleted: () => void;
}) {
  const { notify } = useFlash();
  const qc = useQueryClient();
  const invalidate = useInvalidateHealthChecks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const linked = checks.reduce((n, c) => n + c.record_count, 0);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      if (checks.length === 1) await api.deleteHealthCheck(checks[0].id);
      else await api.bulkDeleteHealthChecks(checks.map((c) => c.id));
      for (const c of checks) qc.removeQueries({ queryKey: ["healthcheck", c.id] });
      invalidate();
      qc.invalidateQueries({ queryKey: ["records"] });
      notify(
        "success",
        checks.length === 1 ? `Health check ${checks[0].name} was deleted.` : `${checks.length} health checks were deleted.`,
      );
      onDeleted();
      onDismiss();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete the health checks.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={checks.length === 1 ? "Delete health check" : `Delete ${checks.length} health checks`}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={confirm}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box>
          {checks.length === 1 ? (
            <>
              Delete health check <b>{checks[0]?.name}</b> permanently? This action can&apos;t be undone.
            </>
          ) : (
            <>Delete {checks.length} health checks permanently? This action can&apos;t be undone.</>
          )}
        </Box>
        {linked > 0 && (
          <Box color="text-status-warning">
            {linked} record{linked === 1 ? " is" : "s are"} associated with{" "}
            {checks.length === 1 ? "this health check" : "these health checks"}. The association will be removed.
          </Box>
        )}
        {error && <Box color="text-status-error">{error}</Box>}
      </SpaceBetween>
    </Modal>
  );
}
