"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import HealthCheckForm from "@/components/health-check-form";
import { useInvalidateHealthChecks } from "@/components/health-status";
import { api, ApiError } from "@/lib/api";

export default function CreateHealthCheckPage() {
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateHealthChecks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Health checks", href: "/healthchecks" },
        { text: "Create health check", href: "/healthchecks/create" },
      ]}
      content={
        <HealthCheckForm
          title="Create health check"
          submitLabel="Create health check"
          busy={busy}
          error={error}
          onCancel={() => router.push("/healthchecks")}
          onSubmit={async (input) => {
            setBusy(true);
            setError("");
            try {
              const hc = await api.createHealthCheck(input);
              invalidate();
              notify("success", `Health check ${hc.name} was created. First check: ${hc.status}.`);
              router.push(`/healthchecks/${hc.id}`);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Couldn't create the health check.");
              setBusy(false);
            }
          }}
        />
      }
    />
  );
}
