"use client";

import Box from "@cloudscape-design/components/box";
import CollectionPreferences, {
  type CollectionPreferencesProps,
} from "@cloudscape-design/components/collection-preferences";
import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue({ ...initial, ...JSON.parse(raw) });
    } catch {
    }
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
    }
  };
  return [value, update] as const;
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function TablePreferences({
  preferences,
  onConfirm,
  columns,
  pageSizes = [10, 25, 50, 100],
}: {
  preferences: CollectionPreferencesProps.Preferences;
  onConfirm: (p: CollectionPreferencesProps.Preferences) => void;
  columns: { id: string; label: string; alwaysVisible?: boolean }[];
  pageSizes?: number[];
}) {
  return (
    <CollectionPreferences
      title="Preferences"
      confirmLabel="Confirm"
      cancelLabel="Cancel"
      preferences={preferences}
      onConfirm={(e) => onConfirm(e.detail)}
      pageSizePreference={{
        title: "Page size",
        options: pageSizes.map((n) => ({ value: n, label: `${n} resources` })),
      }}
      wrapLinesPreference={{ label: "Wrap lines", description: "Select to see all the text and wrap the lines" }}
      stripedRowsPreference={{ label: "Striped rows", description: "Select to add alternating shaded rows" }}
      contentDisplayPreference={{ title: "Column preferences", options: columns }}
    />
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box textAlign="center" color="inherit" padding={{ vertical: "m" }}>
      <Box variant="strong" color="inherit">
        {title}
      </Box>
      {subtitle && (
        <Box variant="p" padding={{ bottom: "s" }} color="inherit">
          {subtitle}
        </Box>
      )}
      {action}
    </Box>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
