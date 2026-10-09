"use client";

import BarChart from "@cloudscape-design/components/bar-chart";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Grid from "@cloudscape-design/components/grid";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import PieChart from "@cloudscape-design/components/pie-chart";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useRouter } from "next/navigation";
import ConsoleLayout, { ROOT_CRUMB, useFollow } from "@/components/console-layout";
import { activityHref, activityStatus, timeAgo } from "@/components/shell/drawers";
import { useDashboard, useRefreshAll } from "@/lib/hooks";

const STATUS_COLORS: Record<string, string> = { Healthy: "#2bb534", Unhealthy: "#ff5d64", Unknown: "#8d99a8" };

function Counter({ label, value, href }: { label: string; value: number | undefined; href: string }) {
  const follow = useFollow();
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <Link variant="awsui-value-large" href={href} onFollow={follow}>
        {value ?? "-"}
      </Link>
    </div>
  );
}

function ServiceCard({
  title,
  text,
  action,
  href,
  count,
}: {
  title: string;
  text: string;
  action: string;
  href: string;
  count?: string;
}) {
  const router = useRouter();
  return (
    <Container fitHeight header={<Header variant="h2">{title}</Header>}>
      <SpaceBetween size="m">
        <Box color="text-body-secondary">{text}</Box>
        {count && <Box variant="small">{count}</Box>}
        <Button onClick={() => router.push(href)}>{action}</Button>
      </SpaceBetween>
    </Container>
  );
}

function Dashboard() {
  const follow = useFollow();
  const refreshAll = useRefreshAll();
  const { data, isLoading, isFetching } = useDashboard();

  const byType = Object.entries(data?.records_by_type ?? {});
  const byStatus = Object.entries(data?.health_by_status ?? {}).filter(([, n]) => n > 0);

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="An overview of the DNS resources and health checks in this account."
          actions={
            <Button iconName="refresh" ariaLabel="Refresh" loading={isFetching && !isLoading} onClick={refreshAll} />
          }
        >
          Route 53 Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Resources</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <Counter label="Hosted zones" value={data?.hosted_zones} href="/hostedzones" />
            <Counter label="Records" value={data?.records} href="/hostedzones" />
            <Counter label="Health checks" value={data?.health_checks} href="/healthchecks" />
            <Counter label="Unhealthy endpoints" value={data?.health_by_status?.Unhealthy ?? 0} href="/healthchecks?status=Unhealthy" />
          </ColumnLayout>
        </Container>

        <Grid gridDefinition={[3, 3, 3, 3].map(() => ({ colspan: { default: 12, s: 6, l: 3 } }))}>
          <ServiceCard
            title="DNS management"
            text="If you already have a domain name, such as example.com, Route 53 can tell the Domain Name System (DNS) where on the internet to find web servers, mail servers, and other resources for your domain."
            action="Create hosted zone"
            href="/hostedzones/create"
            count={data ? `${data.public_zones} public, ${data.private_zones} private hosted zones` : undefined}
          />
          <ServiceCard
            title="Traffic management"
            text="Create a policy that routes traffic to your resources based on endpoint health, location, and latency, then attach it to DNS records."
            action="Create policy"
            href="/trafficpolicies"
          />
          <ServiceCard
            title="Availability monitoring"
            text="Route 53 can monitor the health and performance of your application, web servers, and other resources, and route traffic only to healthy endpoints."
            action="Create health check"
            href="/healthchecks/create"
            count={data ? `${data.health_checks} health checks` : undefined}
          />
          <ServiceCard
            title="Domain registration"
            text="A domain is the name, such as example.com, that your users use to access your application. You can register a new domain or transfer an existing one."
            action="Register domains"
            href="/domains"
          />
        </Grid>

        <Grid gridDefinition={[{ colspan: { default: 12, m: 7 } }, { colspan: { default: 12, m: 5 } }]}>
          <Container fitHeight header={<Header variant="h2">Records by type</Header>}>
            <BarChart
              series={[{ title: "Records", type: "bar", data: byType.map(([x, y]) => ({ x, y })) }]}
              xScaleType="categorical"
              xTitle="Record type"
              yTitle="Count"
              height={220}
              hideFilter
              hideLegend
              statusType={isLoading ? "loading" : "finished"}
              empty={<Box textAlign="center" color="inherit">No records yet</Box>}
              ariaLabel="Records by type"
            />
          </Container>
          <Container fitHeight header={<Header variant="h2">Health check status</Header>}>
            <PieChart
              variant="donut"
              size="medium"
              data={byStatus.map(([title, value]) => ({ title, value, color: STATUS_COLORS[title] }))}
              innerMetricValue={String(data?.health_checks ?? 0)}
              innerMetricDescription="checks"
              hideFilter
              statusType={isLoading ? "loading" : "finished"}
              empty={
                <Box textAlign="center" color="inherit">
                  <SpaceBetween size="xs">
                    <span>No health checks</span>
                    <Link href="/healthchecks/create" onFollow={follow}>
                      Create health check
                    </Link>
                  </SpaceBetween>
                </Box>
              }
              ariaLabel="Health check status"
            />
          </Container>
        </Grid>

        <Table
          header={<Header variant="h2">Recent activity</Header>}
          loading={isLoading}
          loadingText="Loading activity"
          items={data?.recent_activity ?? []}
          trackBy="id"
          variant="container"
          empty={<Box textAlign="center">No activity yet. Changes you make appear here.</Box>}
          columnDefinitions={[
            {
              id: "event",
              header: "Event",
              cell: (a) => {
                const href = activityHref(a);
                return (
                  <StatusIndicator type={activityStatus(a)}>
                    {href ? (
                      <Link href={href} onFollow={follow}>
                        {a.message}
                      </Link>
                    ) : (
                      a.message
                    )}
                  </StatusIndicator>
                );
              },
            },
            { id: "type", header: "Resource type", cell: (a) => a.resource_type.replace("_", " ") },
            { id: "id", header: "Resource ID", cell: (a) => <span className="mono">{a.resource_id}</span> },
            { id: "when", header: "Time", cell: (a) => timeAgo(a.created_at) },
          ]}
        />
      </SpaceBetween>
    </ContentLayout>
  );
}

export default function DashboardPage() {
  return <ConsoleLayout breadcrumbs={[ROOT_CRUMB, { text: "Dashboard", href: "/dashboard" }]} content={<Dashboard />} />;
}
