"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import AccountMenu, { useClickOutside } from "./account-menu";
import GlobalSearch from "./global-search";
import { AwsLogo, BellIcon, CloudShellIcon, GridIcon, HelpIcon, Route53Icon } from "./icons";
import s from "./shell.module.css";
import { useShell } from "./shell-context";
import { useActivity } from "@/lib/hooks";
import { useLastSeenActivity } from "./drawers";

const SERVICE_LINKS = [
  { title: "Route 53", items: [
    ["Route 53 home", "/"],
    ["Dashboard", "/dashboard"],
    ["Hosted zones", "/hostedzones"],
    ["Health checks", "/healthchecks"],
  ] },
  { title: "Account", items: [
    ["Profile", "/profile"],
  ] },
];

function ServicesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`${s.iconBtn} ${open ? s.iconBtnActive : ""}`}
        aria-label="Services"
        title="Services"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <GridIcon />
      </button>
      {open && (
        <div className={s.panel} style={{ left: 0, width: 280 }} role="menu">
          {SERVICE_LINKS.map((group, gi) => (
            <div key={group.title}>
              {gi > 0 && <div className={s.menuDivider} />}
              <div className={s.searchGroup}>{group.title}</div>
              {group.items.map(([label, href]) => (
                <Link key={href} href={href} className={s.menuItem} role="menuitem" onClick={() => setOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { toggleDrawer, drawer, cloudShellOpen, setCloudShellOpen } = useShell();
  const { data: activity } = useActivity();
  const [lastSeen] = useLastSeenActivity();
  const unread = !!activity?.length && activity[0].id > lastSeen && drawer !== "notifications";

  return (
    <header id="top-nav" className={s.topBar}>
      <Link href="/" className={s.logoLink} aria-label="Route 53 home">
        <AwsLogo />
      </Link>
      <div className={s.sep} />
      <Link href="/dashboard" className={s.logoLink} title="Route 53" aria-label="Route 53 dashboard">
        <Route53Icon size={26} />
      </Link>
      <div className={s.sep} />
      <ServicesMenu />
      <div style={{ width: 12 }} />
      <GlobalSearch />
      <div className={s.spacer} />
      <button
        className={`${s.iconBtn} ${cloudShellOpen ? s.iconBtnActive : ""}`}
        aria-label="CloudShell"
        title="CloudShell"
        aria-pressed={cloudShellOpen}
        onClick={() => setCloudShellOpen(!cloudShellOpen)}
      >
        <CloudShellIcon />
      </button>
      <div className={`${s.sep} ${s.hideNarrow}`} />
      <button
        className={`${s.iconBtn} ${drawer === "notifications" ? s.iconBtnActive : ""}`}
        style={{ position: "relative" }}
        aria-label={unread ? "Notifications, new activity" : "Notifications"}
        title="Notifications"
        onClick={() => toggleDrawer("notifications")}
      >
        <BellIcon />
        {unread && <span className={s.badgeDot} />}
      </button>
      <div className={`${s.sep} ${s.hideNarrow}`} />
      <button
        className={`${s.iconBtn} ${drawer === "help" ? s.iconBtnActive : ""}`}
        aria-label="Help"
        title="Help"
        onClick={() => toggleDrawer("help")}
      >
        <HelpIcon />
      </button>
      <div className={`${s.sep} ${s.hideNarrow}`} />
      <AccountMenu />
    </header>
  );
}
