"use client";

import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import RecordFields, { draftErrors, emptyDraft, type RecordDraft } from "@/components/record-fields";
import { api, ApiError } from "@/lib/api";
import { displayName, splitValues } from "@/lib/dns";
import { useInvalidateZoneData, useZone } from "@/lib/hooks";

export default function CreateRecordPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const { data: zone } = useZone(zoneId);
  const [drafts, setDrafts] = useState<RecordDraft[]>([emptyDraft()]);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const zoneLabel = zone ? displayName(zone.name) : zoneId;

  const submit = async () => {
    setShowErrors(true);
    if (drafts.some((d) => { const e = draftErrors(d); return e.values || e.ttl; })) return;
    setBusy(true);
    const failures: Record<string, string> = {};
    const remaining: RecordDraft[] = [];
    let created = 0;
    for (const d of drafts) {
      try {
        await api.createRecord(zoneId, { name: d.name, type: d.type, ttl: Number(d.ttl), values: splitValues(d.values), health_check_id: d.healthCheckId || null });
        created++;
      } catch (e) {
        failures[d.key] = e instanceof ApiError ? e.message : "Couldn't create record.";
        remaining.push(d);
      }
    }
    invalidate(zoneId);
    setBusy(false);
    if (!remaining.length) {
      notify("success", `Record${created > 1 ? "s" : ""} for ${zoneLabel} ${created > 1 ? "were" : "was"} successfully created.`);
      router.push(`/hostedzones/${zoneId}`);
      return;
    }
    if (created) notify("success", `${created} record${created > 1 ? "s were" : " was"} created. Fix the errors below and try again.`);
    setDrafts(remaining);
    setServerErrors(failures);
  };

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Hosted zones", href: "/hostedzones" },
        { text: zoneLabel, href: `/hostedzones/${zoneId}` },
        { text: "Create record", href: `/hostedzones/${zoneId}/records/create` },
      ]}
      content={
        !zone ? (
          <Spinner size="large" />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Form
              header={
                <Header variant="h1" info={<Link variant="info">Info</Link>}>
                  Quick create record
                </Header>
              }
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button formAction="none" variant="link" onClick={() => router.push(`/hostedzones/${zoneId}`)}>
                    Cancel
                  </Button>
                  <Button variant="primary" loading={busy}>
                    Create records
                  </Button>
                </SpaceBetween>
              }
            >
              <SpaceBetween size="l">
                <Alert type="info">
                  Quick create lets you add simple routing records. Alias and advanced routing policies aren&apos;t
                  available in this clone.
                </Alert>
                {drafts.map((d, i) => (
                  <Container
                    key={d.key}
                    header={
                      <Header
                        variant="h2"
                        actions={
                          drafts.length > 1 && (
                            <Button formAction="none" onClick={() => setDrafts(drafts.filter((x) => x.key !== d.key))}>
                              Delete
                            </Button>
                          )
                        }
                      >
                        Record {i + 1}
                      </Header>
                    }
                  >
                    <RecordFields
                      draft={d}
                      zoneName={zone.name}
                      showErrors={showErrors}
                      serverError={serverErrors[d.key]}
                      onChange={(nd) => setDrafts(drafts.map((x) => (x.key === d.key ? nd : x)))}
                    />
                  </Container>
                ))}
                <Button formAction="none" onClick={() => setDrafts([...drafts, emptyDraft()])}>
                  Add another record
                </Button>
              </SpaceBetween>
            </Form>
          </form>
        )
      }
    />
  );
}
