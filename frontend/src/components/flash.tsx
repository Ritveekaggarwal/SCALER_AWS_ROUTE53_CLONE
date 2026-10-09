"use client";

import Flashbar, { type FlashbarProps } from "@cloudscape-design/components/flashbar";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type FlashType = "success" | "error" | "info" | "warning";

interface FlashApi {
  notify: (type: FlashType, content: ReactNode, header?: ReactNode) => void;
}

const FlashContext = createContext<FlashApi>({ notify: () => {} });
const ItemsContext = createContext<FlashbarProps.MessageDefinition[]>([]);

let counter = 0;

export function FlashProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  const notify = useCallback<FlashApi["notify"]>((type, content, header) => {
    const id = `flash-${++counter}`;
    const dismiss = () => setItems((prev) => prev.filter((i) => i.id !== id));
    setItems((prev) => [{ id, type, header, content, dismissible: true, onDismiss: dismiss }, ...prev].slice(0, 3));
    if (type === "success" || type === "info") setTimeout(dismiss, 8000);
  }, []);

  const apiValue = useMemo(() => ({ notify }), [notify]);
  return (
    <FlashContext.Provider value={apiValue}>
      <ItemsContext.Provider value={items}>{children}</ItemsContext.Provider>
    </FlashContext.Provider>
  );
}

export const useFlash = () => useContext(FlashContext);

export function Notifications() {
  const items = useContext(ItemsContext);
  return <Flashbar items={items} stackItems={items.length > 2} />;
}
