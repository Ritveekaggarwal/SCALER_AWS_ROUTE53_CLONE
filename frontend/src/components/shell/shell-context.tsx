"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type DrawerId = "notifications" | "help" | null;

interface ShellState {
  drawer: DrawerId;
  setDrawer: (d: DrawerId) => void;
  toggleDrawer: (d: Exclude<DrawerId, null>) => void;
  navOpen: boolean | null;
  setNavOpen: (open: boolean) => void;
  cloudShellOpen: boolean;
  setCloudShellOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  feedbackOpen: boolean;
  setFeedbackOpen: (open: boolean) => void;
  searchInput: React.MutableRefObject<HTMLInputElement | null>;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [navOpen, setNavOpen] = useState<boolean | null>(null);
  const [cloudShellOpen, setCloudShellOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement | null>(null);

  const toggleDrawer = useCallback((d: Exclude<DrawerId, null>) => setDrawer((cur) => (cur === d ? null : d)), []);

  const value = useMemo(
    () => ({
      drawer,
      setDrawer,
      toggleDrawer,
      navOpen,
      setNavOpen,
      cloudShellOpen,
      setCloudShellOpen,
      shortcutsOpen,
      setShortcutsOpen,
      feedbackOpen,
      setFeedbackOpen,
      searchInput,
    }),
    [drawer, toggleDrawer, navOpen, cloudShellOpen, shortcutsOpen, feedbackOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}
