"use client";

import Spinner from "@cloudscape-design/components/spinner";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import HealthCheckForm from "@/components/health-check-form";
import { useInvalidateHealthChecks } from "@/components/health-status";
import { EmptyState } from "@/components/table-helpers";
import { api, ApiError } from "@/lib/api";
import { useHealthCheck } from "@/lib/hooks";

export default function EditHealthCheckPage() {
  const { healthCheckId } = useParams<{ healthCheckId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateHealthChecks();
  const { data: hc, error } = useHealthCheck(healthCheckId);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Health checks", href: "/healthchecks" },
        { text: hc?.name ?? healthCheckId, href: `/healthchecks/${healthCheckId}` },
        { text: "Edit", href: `/healthchecks/${healthCheckId}/edit` },
      ]}
      content={
        error ? (
          <EmptyState title="Health check not found" subtitle={(error as Error).message} />
        ) : !hc ? (
          <Spinner size="large" />
        ) : (
          <HealthCheckForm
            initial={hc}
            title={`Edit health check: ${hc.name}`}
            submitLabel="Save changes"
            busy={busy}
            error={formError}
            onCancel={() => router.push(`/healthchecks/${hc.id}`)}
            onSubmit={async (input) => {
              setBusy(true);
              setFormError("");
              try {
                const { protocol: _p, request_interval: _i, ...rest } = input;
                void _p;
                void _i;
                await api.updateHealthCheck(hc.id, { ...rest, ip_address: rest.ip_address ?? "", domain_name: rest.domain_name ?? "" });
                invalidate();
                notify("success", `Health check ${input.name} was updated.`);
                router.push(`/healthchecks/${hc.id}`);
              } catch (e) {
                setFormError(e instanceof ApiError ? e.message : "Couldn't update the health check.");
                setBusy(false);
              }
            }}
          />
        )
      }
    />
  );
}
