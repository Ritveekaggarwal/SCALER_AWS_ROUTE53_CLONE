"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemePreference } from "../theme";
import { CaretDown, ChevronRight, ExternalIcon, MonitorIcon, MoonIcon, SignOutIcon, SunIcon } from "./icons";
import s from "./shell.module.css";
import { useLogout, useMe } from "@/lib/hooks";

export const FREE_PLAN_DAYS = 183;
export const FREE_PLAN_CREDITS = 100;

export function daysRemaining(createdAt?: string) {
  if (!createdAt) return FREE_PLAN_DAYS;
  const used = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  return Math.max(0, FREE_PLAN_DAYS - used);
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [ref, onOutside, active]);
}

export default function AccountMenu() {
  const { data: user, isPending } = useMe();
  const logout = useLogout();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const alias = user?.account_alias ?? "";
  const name = user?.display_name || user?.username || "";
  const modes: { id: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "Browser default", icon: <MonitorIcon /> },
    { id: "light", label: "Light", icon: <SunIcon /> },
    { id: "dark", label: "Dark", icon: <MoonIcon /> },
  ];
  const close = () => setOpen(false);

  if (isPending) return <div style={{ minWidth: 120 }} aria-hidden />;
  if (!user) {
    return (
      <a
        className={s.account}
        href={pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
        <span>Sign in</span>
      </a>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`${s.account} ${open ? s.accountOpen : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${alias}`}
        onClick={() => setOpen(!open)}
      >
        <span className={s.accountTop}>
          {alias} <CaretDown up={open} />
        </span>
        <span className={s.accountBottom}>{name}</span>
      </button>
      {open && (
        <div className={s.panel} role="menu" style={{ right: 0, width: 308 }}>
          <Link href="/profile" className={s.menuItem} role="menuitem" onClick={close}>
            <span>{alias}</span>
            <ExternalIcon />
          </Link>
          <div className={s.menuHeading} style={{ fontSize: 13 }}>
            Free plan status
          </div>
          <div className={s.plan}>
            <div>
              <div className={s.menuMuted}>Credits remaining</div>
              <Link href="/profile#plan" className={s.planLink} onClick={close}>
                ${FREE_PLAN_CREDITS} USD
              </Link>
            </div>
            <div className={s.planDivider} />
            <div>
              <div className={s.menuMuted}>Days remaining</div>
              <div>{daysRemaining(user?.created_at)} days</div>
            </div>
          </div>
          <Link href="/profile#account" className={s.menuItem} role="menuitem" onClick={close}>
            <span>Switch account</span>
            <ExternalIcon />
          </Link>
          <div className={s.menuDivider} />
          {[
            ["Account", "/profile#account"],
            ["Security credentials", "/profile#security"],
            ["Sessions", "/profile#sessions"],
            ["Profile", "/profile"],
          ].map(([label, href]) => (
            <Link key={label} href={href} className={s.menuItem} role="menuitem" onClick={close}>
              <span>{label}</span>
              <ExternalIcon />
            </Link>
          ))}
          <div className={s.menuDivider} />
          <div style={{ position: "relative" }}>
            <button className={s.menuItem} role="menuitem" aria-expanded={langOpen} onClick={() => setLangOpen(!langOpen)}>
              <span>Language</span>
              <ChevronRight />
            </button>
            {langOpen && (
              <div className={s.panel} style={{ right: "100%", top: 0, width: 200, marginRight: 4 }}>
                <button className={`${s.menuItem} ${s.menuItemActive}`} onClick={() => setLangOpen(false)}>
                  English (US) <span aria-hidden>✓</span>
                </button>
              </div>
            )}
          </div>
          <div className={s.menuItem} style={{ cursor: "default" }}>
            <span>Visual mode</span>
            <span className={s.modeButtons} role="radiogroup" aria-label="Visual mode">
              {modes.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={theme === m.id}
                  aria-label={m.label}
                  title={m.label}
                  className={`${s.modeBtn} ${theme === m.id ? s.modeBtnActive : ""}`}
                  onClick={() => setTheme(m.id)}
                >
                  {m.icon}
                </button>
              ))}
            </span>
          </div>
          <div className={s.menuDivider} />
          <button className={s.menuItem} role="menuitem" onClick={() => logout.mutate()}>
            <span>Sign out of {alias}</span>
            <SignOutIcon />
          </button>
        </div>
      )}
    </div>
  );
}
