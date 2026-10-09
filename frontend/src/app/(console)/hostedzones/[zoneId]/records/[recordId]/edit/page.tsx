"use client";

import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import RecordFields, { draftErrors, type RecordDraft } from "@/components/record-fields";
import { api, ApiError } from "@/lib/api";
import { displayName, relativeName, splitValues } from "@/lib/dns";
import { useInvalidateZoneData, useRecord, useZone } from "@/lib/hooks";

export default function EditRecordPage() {
  const { zoneId, recordId } = useParams<{ zoneId: string; recordId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const { data: zone } = useZone(zoneId);
  const { data: record, error } = useRecord(zoneId, Number(recordId));
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (record && zone && !draft) {
      setDraft({
        key: String(record.id),
        name: relativeName(record.name, zone.name),
        type: record.type,
        ttl: String(record.ttl),
        values: record.values.join("\n"),
        healthCheckId: record.health_check_id ?? "",
      });
    }
  }, [record, zone, draft]);

  const zoneLabel = zone ? displayName(zone.name) : zoneId;
  const back = () => router.push(`/hostedzones/${zoneId}`);

  const submit = async () => {
    if (!draft) return;
    setShowErrors(true);
    const errs = draftErrors(draft);
    if (errs.values || errs.ttl) return;
    setBusy(true);
    setServerError("");
    try {
      await api.updateRecord(zoneId, Number(recordId), {
        ttl: Number(draft.ttl),
        values: splitValues(draft.values),
        health_check_id: draft.healthCheckId,
      });
      invalidate(zoneId);
      notify("success", `Record ${displayName(record!.name)} (${record!.type}) was successfully updated.`);
      back();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Couldn't save the record.");
      setBusy(false);
    }
  };

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Hosted zones", href: "/hostedzones" },
        { text: zoneLabel, href: `/hostedzones/${zoneId}` },
        { text: "Edit record", href: `/hostedzones/${zoneId}/records/${recordId}/edit` },
      ]}
      content={
        error ? (
          <Container>Record not found.</Container>
        ) : !draft || !zone ? (
          <Spinner size="large" />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Form
              header={<Header variant="h1">Edit record</Header>}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button formAction="none" variant="link" onClick={back}>
                    Cancel
                  </Button>
                  <Button variant="primary" loading={busy}>
                    Save
                  </Button>
                </SpaceBetween>
              }
            >
              <Container header={<Header variant="h2">Record details</Header>}>
                <RecordFields
                  draft={draft}
                  zoneName={zone.name}
                  onChange={setDraft}
                  showErrors={showErrors}
                  serverError={serverError}
                  lockIdentity
                />
              </Container>
            </Form>
          </form>
        )
      }
    />
  );
}
