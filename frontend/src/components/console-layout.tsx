"use client";

import { type AppLayoutProps } from "@cloudscape-design/components/app-layout";
import AppLayoutToolbar from "@cloudscape-design/components/app-layout-toolbar";
import BreadcrumbGroup, { type BreadcrumbGroupProps } from "@cloudscape-design/components/breadcrumb-group";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Notifications } from "./flash";
import { HelpContent, NotificationsPanel } from "./shell/drawers";
import { useShell } from "./shell/shell-context";
import { NAV_ITEMS } from "@/lib/nav";

export function useFollow() {
  const router = useRouter();
  return (e: CustomEvent<{ href?: string; external?: boolean }>) => {
    if (e.detail.href && !e.detail.external) {
      e.preventDefault();
      router.push(e.detail.href);
    }
  };
}

const NAV_KEY = "r53-nav-open";

interface ConsoleLayoutProps {
  breadcrumbs?: BreadcrumbGroupProps.Item[];
  content: ReactNode;
  contentType?: AppLayoutProps.ContentType;
  navigationDefaultOpen?: boolean;
  disableContentPaddings?: boolean;
  splitPanel?: ReactNode;
  splitPanelOpen?: boolean;
  onSplitPanelToggle?: (open: boolean) => void;
}

export default function ConsoleLayout({
  breadcrumbs,
  content,
  contentType = "default",
  navigationDefaultOpen = true,
  disableContentPaddings,
  splitPanel,
  splitPanelOpen,
  onSplitPanelToggle,
}: ConsoleLayoutProps) {
  const pathname = usePathname();
  const follow = useFollow();
  const { drawer, setDrawer } = useShell();
  const [navOpen, setNavOpen] = useState(navigationDefaultOpen);

  useEffect(() => {
    if (!navigationDefaultOpen) return;
    try {
      const saved = localStorage.getItem(NAV_KEY);
      if (saved !== null) setNavOpen(saved === "true");
    } catch {
    }
  }, [navigationDefaultOpen]);

  const active = ["/hostedzones", "/healthchecks"].find((p) => pathname.startsWith(p)) ?? pathname;

  return (
    <AppLayoutToolbar
      headerSelector="#top-nav"
      footerSelector="#console-footer"
      contentType={contentType}
      disableContentPaddings={disableContentPaddings}
      notifications={<Notifications />}
      breadcrumbs={
        breadcrumbs ? <BreadcrumbGroup items={breadcrumbs} onFollow={follow} ariaLabel="Breadcrumbs" /> : undefined
      }
      navigationOpen={navOpen}
      onNavigationChange={(e) => {
        setNavOpen(e.detail.open);
        if (navigationDefaultOpen) {
          try {
            localStorage.setItem(NAV_KEY, String(e.detail.open));
          } catch {
          }
        }
      }}
      navigation={
        <SideNavigation
          header={{ href: "/", text: "Route 53" }}
          activeHref={active}
          items={NAV_ITEMS}
          onFollow={follow}
        />
      }
      activeDrawerId={drawer}
      onDrawerChange={(e) => setDrawer((e.detail.activeDrawerId as typeof drawer) ?? null)}
      drawers={[
        {
          id: "notifications",
          content: <NotificationsPanel />,
          ariaLabels: { drawerName: "Notifications", closeButton: "Close notifications" },
          resizable: true,
          defaultSize: 360,
        },
        {
          id: "help",
          content: <HelpContent />,
          ariaLabels: { drawerName: "Help", closeButton: "Close help" },
          resizable: true,
        },
      ]}
      splitPanel={splitPanel}
      splitPanelOpen={splitPanelOpen}
      onSplitPanelToggle={(e) => onSplitPanelToggle?.(e.detail.open)}
      splitPanelPreferences={{ position: "bottom" }}
      content={content}
    />
  );
}

export const ROOT_CRUMB = { text: "Route 53", href: "/dashboard" };
