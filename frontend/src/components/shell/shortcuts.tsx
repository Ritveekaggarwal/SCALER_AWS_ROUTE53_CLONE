"use client";

import Box from "@cloudscape-design/components/box";
import Modal from "@cloudscape-design/components/modal";
import Table from "@cloudscape-design/components/table";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTheme } from "../theme";
import { useShell } from "./shell-context";

export const SHORTCUTS = [
  { keys: "Alt+S", description: "Search the console" },
  { keys: "Alt+T", description: "Open or close CloudShell" },
  { keys: "/", description: "Filter the current table" },
  { keys: "c", description: "Create (hosted zone, record or health check, depending on the page)" },
  { keys: "?", description: "Show keyboard shortcuts" },
  { keys: "g then h", description: "Go to Route 53 home" },
  { keys: "g then d", description: "Go to the dashboard" },
  { keys: "g then z", description: "Go to hosted zones" },
  { keys: "g then c", description: "Go to health checks" },
  { keys: "g then p", description: "Go to your profile" },
  { keys: "Alt+M", description: "Switch between light and dark mode" },
  { keys: "Esc", description: "Close menus, dialogs and panels" },
];

const GO: Record<string, string> = { h: "/", d: "/dashboard", z: "/hostedzones", c: "/healthchecks", p: "/profile" };

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function createHref(pathname: string): string | null {
  const zone = /^\/hostedzones\/([^/]+)$/.exec(pathname);
  if (zone && zone[1] !== "create") return `/hostedzones/${zone[1]}/records/create`;
  if (pathname === "/hostedzones") return "/hostedzones/create";
  if (pathname === "/healthchecks") return "/healthchecks/create";
  return null;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const { searchInput, setCloudShellOpen, cloudShellOpen, setShortcutsOpen, setDrawer } = useShell();
  const { theme, setTheme } = useTheme();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "s" || e.code === "KeyS") {
          e.preventDefault();
          searchInput.current?.focus();
          return;
        }
        if (k === "t" || e.code === "KeyT") {
          e.preventDefault();
          setCloudShellOpen(!cloudShellOpen);
          return;
        }
        if (k === "m" || e.code === "KeyM") {
          e.preventDefault();
          const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
          setTheme(dark ? "light" : "dark");
          return;
        }
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (pendingG.current) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const href = GO[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "/") {
        const filter = document.querySelector<HTMLInputElement>('main input[type="search"], main input[placeholder^="Filter"]');
        if (filter) {
          e.preventDefault();
          filter.focus();
        }
      } else if (e.key === "c") {
        const href = createHref(window.location.pathname);
        if (href) {
          e.preventDefault();
          router.push(href);
        }
      } else if (e.key === "Escape") {
        setDrawer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, searchInput, cloudShellOpen, setCloudShellOpen, setShortcutsOpen, setDrawer, theme, setTheme]);

  return null;
}

export function ShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useShell();
  return (
    <Modal visible={shortcutsOpen} onDismiss={() => setShortcutsOpen(false)} header="Keyboard shortcuts" size="medium">
      <Table
        variant="embedded"
        items={SHORTCUTS}
        columnDefinitions={[
          { id: "keys", header: "Shortcut", cell: (s) => <Box variant="code">{s.keys}</Box>, width: 140 },
          { id: "desc", header: "Action", cell: (s) => s.description },
        ]}
      />
    </Modal>
  );
}
