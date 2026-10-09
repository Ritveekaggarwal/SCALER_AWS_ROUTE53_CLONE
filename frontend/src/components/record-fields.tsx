"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import { useAllHealthChecks } from "@/lib/hooks";
import { checkValue, displayName, RECORD_TYPES, splitValues, TTL_PRESETS, typeDescription } from "@/lib/dns";
import type { RecordType } from "@/lib/types";

export interface RecordDraft {
  key: string;
  name: string;
  type: RecordType;
  ttl: string;
  values: string;
  healthCheckId: string;
}

export const emptyDraft = (): RecordDraft => ({
  key: Math.random().toString(36).slice(2),
  name: "",
  type: "A",
  ttl: "300",
  values: "",
  healthCheckId: "",
});

export function draftErrors(d: RecordDraft): { values: string; ttl: string } {
  const lines = splitValues(d.values);
  const valueErr = lines.length ? lines.map((l) => checkValue(d.type, l)).find(Boolean) ?? "" : "Enter at least one value.";
  const ttlNum = Number(d.ttl);
  const ttlErr = d.ttl === "" || !Number.isInteger(ttlNum) || ttlNum < 0 || ttlNum > 2147483647
    ? "TTL must be an integer between 0 and 2147483647."
    : "";
  return {
    values: valueErr || (d.type === "CNAME" && lines.length > 1 ? "A CNAME record can have only one value." : ""),
    ttl: ttlErr,
  };
}

const typeOption = (t: string) => ({ value: t, label: t, description: typeDescription(t) });

export default function RecordFields({
  draft,
  zoneName,
  onChange,
  showErrors,
  serverError,
  lockIdentity = false,
}: {
  draft: RecordDraft;
  zoneName: string;
  onChange: (d: RecordDraft) => void;
  showErrors: boolean;
  serverError?: string;
  lockIdentity?: boolean;
}) {
  const errors = showErrors ? draftErrors(draft) : { values: "", ttl: "" };
  const placeholder = RECORD_TYPES.find((t) => t.value === draft.type)?.placeholder ?? "";
  const set = (patch: Partial<RecordDraft>) => onChange({ ...draft, ...patch });
  const { data: checks, isLoading: checksLoading } = useAllHealthChecks();
  const checkOptions = [
    { value: "", label: "No health check" },
    ...(checks?.items ?? []).map((c) => ({ value: c.id, label: c.name, description: c.endpoint, tags: [c.disabled ? "Disabled" : c.status] })),
  ];

  return (
    <SpaceBetween size="l">
      <ColumnLayout columns={2}>
        <FormField
          label="Record name"
          description="Keep blank to create a record for the root domain."
          constraintText="Valid characters: a-z, 0-9, hyphen (-), underscore (_), period (.) and * as the first label"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                value={draft.name}
                placeholder="subdomain"
                disabled={lockIdentity}
                onChange={(e) => set({ name: e.detail.value })}
              />
            </div>
            <Box color="text-body-secondary">.{displayName(zoneName)}</Box>
          </div>
        </FormField>
        <FormField label="Record type">
          <Select
            selectedOption={typeOption(draft.type)}
            disabled={lockIdentity}
            options={(lockIdentity ? [{ value: draft.type }] : RECORD_TYPES).map((t) => typeOption(t.value))}
            onChange={(e) => set({ type: e.detail.selectedOption.value as RecordType })}
          />
        </FormField>
      </ColumnLayout>

      <FormField label="Alias" description="Alias records route traffic to AWS resources. Not available in this clone.">
        <Toggle checked={false} disabled>
          Alias
        </Toggle>
      </FormField>

      <FormField
        label="Value"
        description="Enter multiple values on separate lines."
        errorText={errors.values || serverError}
        stretch
      >
        <Textarea
          value={draft.values}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => set({ values: e.detail.value })}
        />
      </FormField>

      <ColumnLayout columns={2}>
        <FormField label="TTL (seconds)" description="Recommended values: 60 to 172800 (two days)" errorText={errors.ttl}>
          <SpaceBetween direction="horizontal" size="xs">
            <div style={{ width: 140 }}>
              <Input type="number" inputMode="numeric" value={draft.ttl} onChange={(e) => set({ ttl: e.detail.value })} />
            </div>
            {TTL_PRESETS.map((p) => (
              <Button key={p.label} formAction="none" onClick={() => set({ ttl: String(p.seconds) })}>
                {p.label}
              </Button>
            ))}
          </SpaceBetween>
        </FormField>
        <FormField label="Routing policy">
          <Select
            selectedOption={{ value: "Simple", label: "Simple routing" }}
            options={[
              { value: "Simple", label: "Simple routing" },
              { value: "Weighted", label: "Weighted", disabled: true, disabledReason: "Not available in this clone" },
              { value: "Geolocation", label: "Geolocation", disabled: true, disabledReason: "Not available in this clone" },
              { value: "Latency", label: "Latency", disabled: true, disabledReason: "Not available in this clone" },
              { value: "Failover", label: "Failover", disabled: true, disabledReason: "Not available in this clone" },
              { value: "Multivalue", label: "Multivalue answer", disabled: true, disabledReason: "Not available in this clone" },
            ]}
            onChange={() => {}}
          />
        </FormField>
      </ColumnLayout>

      <FormField
        label={<>Health check <i>- optional</i></>}
        description="Associate a health check so its status is shown with this record and answered in Test record."
      >
        <Select
          selectedOption={checkOptions.find((o) => o.value === draft.healthCheckId) ?? { value: draft.healthCheckId, label: draft.healthCheckId }}
          options={checkOptions}
          statusType={checksLoading ? "loading" : "finished"}
          filteringType="auto"
          onChange={(e) => set({ healthCheckId: e.detail.selectedOption.value ?? "" })}
        />
      </FormField>
    </SpaceBetween>
  );
}
