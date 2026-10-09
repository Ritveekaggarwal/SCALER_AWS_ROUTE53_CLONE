"use client";

import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import Textarea from "@cloudscape-design/components/textarea";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { api, ApiError } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useInvalidateZoneData, useZone } from "@/lib/hooks";

export default function EditHostedZonePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const { data: zone } = useZone(zoneId);
  const [comment, setComment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (zone && comment === null) setComment(zone.comment);
  }, [zone, comment]);

  const zoneLabel = zone ? displayName(zone.name) : zoneId;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.updateZone(zoneId, { comment: comment ?? "" });
      invalidate(zoneId);
      notify("success", `Hosted zone ${zoneLabel} was successfully updated.`);
      router.push(`/hostedzones/${zoneId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save changes.");
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
        { text: "Edit hosted zone", href: `/hostedzones/${zoneId}/edit` },
      ]}
      content={
        !zone || comment === null ? (
          <Spinner size="large" />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Form
              header={<Header variant="h1">Edit hosted zone</Header>}
              errorText={error}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button formAction="none" variant="link" onClick={() => router.push(`/hostedzones/${zoneId}`)}>
                    Cancel
                  </Button>
                  <Button variant="primary" loading={busy}>
                    Save changes
                  </Button>
                </SpaceBetween>
              }
            >
              <Container header={<Header variant="h2">Hosted zone configuration</Header>}>
                <SpaceBetween size="l">
                  <FormField label="Domain name" description="You can't change the domain name of a hosted zone.">
                    <Input value={zoneLabel} disabled />
                  </FormField>
                  <FormField
                    label={
                      <>
                        Description <i>- optional</i>
                      </>
                    }
                    description="This value lets you distinguish hosted zones that have the same name."
                    constraintText={`The description can have up to 256 characters. ${comment.length}/256`}
                  >
                    <Textarea value={comment} rows={3} onChange={(e) => setComment(e.detail.value.slice(0, 256))} />
                  </FormField>
                  <FormField label="Type">
                    <Input value={zone.is_private ? "Private hosted zone" : "Public hosted zone"} disabled />
                  </FormField>
                </SpaceBetween>
              </Container>
            </Form>
          </form>
        )
      }
    />
  );
}
