"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import HelpPanel from "@cloudscape-design/components/help-panel";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useShell } from "./shell-context";
import { SHORTCUTS } from "./shortcuts";
import { useActivity } from "@/lib/hooks";
import type { Activity } from "@/lib/types";

const LAST_SEEN_KEY = "r53-last-seen-activity";
const LAST_SEEN_EVENT = "r53-last-seen-change";

function readLastSeen() {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function useLastSeenActivity() {
  const [id, setId] = useState(0);
  useEffect(() => {
    setId(readLastSeen());
    const sync = () => setId(readLastSeen());
    window.addEventListener(LAST_SEEN_EVENT, sync);
    return () => window.removeEventListener(LAST_SEEN_EVENT, sync);
  }, []);
  const update = (next: number) => {
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(next));
    } catch {
    }
    setId(next);
    window.dispatchEvent(new Event(LAST_SEEN_EVENT));
  };
  return [id, update] as const;
}

export function timeAgo(iso: string) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function activityHref(a: Activity) {
  if (a.action === "delete") return null;
  if (a.resource_type === "hosted_zone") return `/hostedzones/${a.resource_id}`;
  if (a.resource_type === "health_check") return `/healthchecks/${a.resource_id}`;
  return null;
}

export function activityStatus(a: Activity) {
  if (a.action === "status") return a.message.endsWith("Healthy") ? "success" : "error";
  if (a.action === "delete") return "stopped";
  return "info";
}

export function NotificationsPanel() {
  const { data, isLoading } = useActivity();
  const [, setLastSeen] = useLastSeenActivity();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (data?.length) setLastSeen(data[0].id);
  }, [data?.[0]?.id]);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <HelpPanel header={<Header variant="h2">Notifications</Header>}>
      <span hidden>{tick}</span>
      {isLoading ? (
        <StatusIndicator type="loading">Loading</StatusIndicator>
      ) : !data?.length ? (
        <Box color="text-body-secondary">No notifications yet. Changes you make and health check status changes show up here.</Box>
      ) : (
        <SpaceBetween size="m">
          {data.map((a) => {
            const href = activityHref(a);
            return (
              <div key={a.id}>
                <StatusIndicator type={activityStatus(a)}>
                  {href ? <NextLink href={href}>{a.message}</NextLink> : a.message}
                </StatusIndicator>
                <Box variant="small" color="text-body-secondary">
                  {timeAgo(a.created_at)}
                </Box>
              </div>
            );
          })}
        </SpaceBetween>
      )}
    </HelpPanel>
  );
}

const HELP: { match: RegExp; title: string; body: React.ReactNode }[] = [
  {
    match: /^\/hostedzones\/[^/]+\/records/,
    title: "Creating records",
    body: (
      <p>
        A record tells Route 53 how to answer queries for a name. Enter a subdomain (or leave it blank for the root
        domain), choose a type, and enter one value per line. You can attach a health check so the record is tied to
        an endpoint&apos;s status.
      </p>
    ),
  },
  {
    match: /^\/hostedzones\/[^/]+/,
    title: "Hosted zone details",
    body: (
      <p>
        Records in this hosted zone answer DNS queries for the domain. Use <b>Test record</b> to see the answer Route 53
        would return, <b>Import zone file</b> to add records in bulk, and <b>Export zone</b> to download them.
      </p>
    ),
  },
  {
    match: /^\/hostedzones/,
    title: "Hosted zones",
    body: (
      <p>
        A hosted zone is a container for records that define how traffic is routed for a domain and its subdomains.
        Public hosted zones route internet traffic; private hosted zones route traffic inside VPCs.
      </p>
    ),
  },
  {
    match: /^\/healthchecks/,
    title: "Health checks",
    body: (
      <p>
        Health checks monitor an endpoint over HTTP, HTTPS or TCP. A check becomes Unhealthy after the failure
        threshold number of consecutive failures, and Healthy again after the same number of successes.
      </p>
    ),
  },
  {
    match: /.*/,
    title: "Amazon Route 53",
    body: (
      <p>
        Route 53 is a highly available DNS web service. Use hosted zones and records to route traffic, and health
        checks to monitor your endpoints. Open CloudShell from the top bar to manage everything with the AWS CLI.
      </p>
    ),
  },
];

export function HelpContent() {
  const pathname = usePathname();
  const { setShortcutsOpen, setCloudShellOpen } = useShell();
  const topic = HELP.find((h) => h.match.test(pathname))!;
  return (
    <HelpPanel
      header={<h2>{topic.title}</h2>}
      footer={
        <div>
          <h3>Learn more</h3>
          <ul>
            <li>
              <Link external href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html">
                Route 53 Developer Guide
              </Link>
            </li>
            <li>
              <Link external href="https://docs.aws.amazon.com/cli/latest/reference/route53/">
                AWS CLI reference for Route 53
              </Link>
            </li>
          </ul>
        </div>
      }
    >
      {topic.body}
      <h3>Keyboard shortcuts</h3>
      <dl>
        {SHORTCUTS.slice(0, 6).map((sc) => (
          <div key={sc.keys}>
            <dt>
              <code>{sc.keys}</code>
            </dt>
            <dd>{sc.description}</dd>
          </div>
        ))}
      </dl>
      <SpaceBetween direction="horizontal" size="xs">
        <Button onClick={() => setShortcutsOpen(true)}>All shortcuts</Button>
        <Button onClick={() => setCloudShellOpen(true)}>Open CloudShell</Button>
      </SpaceBetween>
    </HelpPanel>
  );
}
