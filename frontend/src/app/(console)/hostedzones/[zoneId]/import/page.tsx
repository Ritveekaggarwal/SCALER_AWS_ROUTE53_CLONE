"use client";

import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FileUpload from "@cloudscape-design/components/file-upload";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { api, ApiError } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useInvalidateZoneData, useZone } from "@/lib/hooks";
import type { ImportResult } from "@/lib/types";

const SAMPLE = `$ORIGIN example.com.
$TTL 300
www      IN  A      192.0.2.1
mail     IN  A      192.0.2.2
@        IN  MX     10 mail.example.com.
@        IN  TXT    "v=spf1 -all"`;

export default function ImportZoneFilePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const { data: zone } = useZone(zoneId);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const zoneLabel = zone ? displayName(zone.name) : zoneId;
  const newCount = preview?.records.filter((r) => r.status === "new").length ?? 0;

  const onFiles = async (fs: File[]) => {
    setFiles(fs);
    if (fs[0]) {
      setText(await fs[0].text());
      setPreview(null);
    }
  };

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.importZoneFile(zoneId, text, dryRun);
      if (dryRun) {
        setPreview(res);
      } else {
        invalidate(zoneId);
        notify("success", `${res.created} record${res.created === 1 ? " was" : "s were"} imported into ${zoneLabel}.`);
        router.push(`/hostedzones/${zoneId}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed.");
    } finally {
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
        { text: "Import zone file", href: `/hostedzones/${zoneId}/import` },
      ]}
      content={
        <Form
          header={
            <Header
              variant="h1"
              description="Import records from a BIND-formatted zone file. Route 53 keeps its own SOA and apex NS records."
            >
              Import zone file
            </Header>
          }
          errorText={error}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => router.push(`/hostedzones/${zoneId}`)}>
                Cancel
              </Button>
              {preview ? (
                <>
                  <Button onClick={() => setPreview(null)}>Back</Button>
                  <Button variant="primary" loading={busy} disabled={!newCount} onClick={() => run(false)}>
                    Import {newCount} record{newCount === 1 ? "" : "s"}
                  </Button>
                </>
              ) : (
                <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={() => run(true)}>
                  Preview records
                </Button>
              )}
            </SpaceBetween>
          }
        >
          {!preview ? (
            <Container header={<Header variant="h2">Zone file</Header>}>
              <SpaceBetween size="l">
                <FormField label="Upload a zone file" description="Choose a .zone or .txt file, or paste the contents below.">
                  <FileUpload
                    value={files}
                    onChange={(e) => onFiles(e.detail.value)}
                    accept=".zone,.txt,.db,text/plain"
                    i18nStrings={{
                      uploadButtonText: () => "Choose file",
                      dropzoneText: () => "Drop file to upload",
                      removeFileAriaLabel: () => "Remove file",
                      limitShowFewer: "Show fewer files",
                      limitShowMore: "Show more files",
                      errorIconAriaLabel: "Error",
                    }}
                    showFileSize
                    showFileLastModified
                  />
                </FormField>
                <FormField label="Zone file" stretch>
                  <Textarea
                    value={text}
                    rows={14}
                    placeholder={SAMPLE}
                    spellcheck={false}
                    onChange={(e) => {
                      setText(e.detail.value);
                      setPreview(null);
                    }}
                  />
                </FormField>
              </SpaceBetween>
            </Container>
          ) : (
            <SpaceBetween size="l">
              {newCount === 0 && <Alert type="warning">There are no new records to import.</Alert>}
              <Table
                variant="container"
                header={
                  <Header variant="h2" counter={`(${preview.records.length})`} description={`${newCount} will be created.`}>
                    Records found
                  </Header>
                }
                items={preview.records}
                columnDefinitions={[
                  { id: "name", header: "Record name", cell: (r) => displayName(r.name) },
                  { id: "type", header: "Type", cell: (r) => r.type },
                  { id: "ttl", header: "TTL", cell: (r) => r.ttl },
                  { id: "value", header: "Value", cell: (r) => r.values.join(", ") },
                  {
                    id: "status",
                    header: "Status",
                    cell: (r) =>
                      r.status === "new" ? (
                        <StatusIndicator type="success">Will be created</StatusIndicator>
                      ) : r.status === "conflict" ? (
                        <StatusIndicator type="warning">{r.reason}</StatusIndicator>
                      ) : (
                        <StatusIndicator type="stopped">{r.reason}</StatusIndicator>
                      ),
                  },
                ]}
                wrapLines
              />
            </SpaceBetween>
          )}
        </Form>
      }
    />
  );
}
