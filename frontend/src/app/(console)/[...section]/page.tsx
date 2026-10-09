"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { notFound, useParams } from "next/navigation";
import ConsoleLayout, { ROOT_CRUMB, useFollow } from "@/components/console-layout";
import { PLACEHOLDERS } from "@/lib/nav";

export default function ComingSoonPage() {
  const { section } = useParams<{ section: string[] }>();
  const href = "/" + section.join("/");
  const title = PLACEHOLDERS[href];
  const follow = useFollow();
  if (!title) notFound();

  return (
    <ConsoleLayout
      breadcrumbs={[ROOT_CRUMB, { text: title, href }]}
      content={
        <ContentLayout header={<Header variant="h1">{title}</Header>}>
          <Container>
            <Box textAlign="center" padding={{ vertical: "xxl" }}>
              <SpaceBetween size="m">
                <Box variant="h2">Coming soon</Box>
                <Box color="text-body-secondary">
                  {title} isn&apos;t available in this Route 53 clone yet. DNS management lives under hosted zones.
                </Box>
                <Link href="/hostedzones" onFollow={follow}>
                  Go to hosted zones
                </Link>
              </SpaceBetween>
            </Box>
          </Container>
        </ContentLayout>
      }
    />
  );
}
