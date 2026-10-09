"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "./account-menu";
import CloudShell from "./cloudshell";
import { CloudShellIcon } from "./icons";
import s from "./shell.module.css";
import { useShell } from "./shell-context";

function LanguageButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className={s.footerBtn} onClick={() => setOpen(!open)} aria-expanded={open}>
        Language
      </button>
      {open && (
        <div className={s.panel} style={{ bottom: "calc(100% + 6px)", top: "auto", left: 0, width: 200 }}>
          <button className={`${s.menuItem} ${s.menuItemActive}`} onClick={() => setOpen(false)}>
            English (US) <span aria-hidden>✓</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ConsoleFooter() {
  const { cloudShellOpen, setCloudShellOpen } = useShell();
  return (
    <div id="console-footer" className={s.footerWrap}>
      <CloudShell />
      <footer className={s.footer}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <button className={s.footerBtn} onClick={() => setCloudShellOpen(!cloudShellOpen)} aria-pressed={cloudShellOpen}>
            <CloudShellIcon size={16} /> CloudShell
          </button>
          <LanguageButton />
        </div>
        <span className={s.footerCenter}>
          Developed by RITVEEK AGGARWAL
        </span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span className={s.footerCopy}>© 2026, Amazon Web Services, Inc. or its affiliates.</span>
          <a className={`${s.footerBtn} ${s.hideNarrow}`} href="https://aws.amazon.com/privacy/" target="_blank" rel="noreferrer">
            Privacy
          </a>
          <a className={`${s.footerBtn} ${s.hideNarrow}`} href="https://aws.amazon.com/terms/" target="_blank" rel="noreferrer">
            Terms
          </a>
          <a className={`${s.footerBtn} ${s.hideNarrow}`} href="https://aws.amazon.com/legal/cookies/" target="_blank" rel="noreferrer">
            Cookie preferences
          </a>
        </div>
      </footer>
    </div>
  );
}
