"use client";

import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Tiles from "@cloudscape-design/components/tiles";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { api, ApiError } from "@/lib/api";
import { displayName } from "@/lib/dns";
import { useInvalidateZoneData } from "@/lib/hooks";

const REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "eu-west-1",
  "eu-central-1",
].map((r) => ({ value: r, label: r }));

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useFlash();
  const invalidate = useInvalidateZoneData();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [region, setRegion] = useState<{ value: string; label: string } | null>(null);
  const [vpcId, setVpcId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nameError = submitted && !name.trim() ? "Domain name is required." : "";
  const vpcError = submitted && type === "private" && !(region && vpcId.trim()) ? "Choose a Region and enter a VPC ID." : "";

  const submit = async () => {
    setSubmitted(true);
    if (!name.trim() || (type === "private" && !(region && vpcId.trim()))) return;
    setBusy(true);
    setError("");
    try {
      const zone = await api.createZone({
        name: name.trim(),
        comment,
        is_private: type === "private",
        vpc_region: region?.value,
        vpc_id: vpcId.trim() || undefined,
      });
      invalidate();
      notify("success", `Hosted zone ${displayName(zone.name)} was successfully created.`);
      router.push(`/hostedzones/${zone.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create the hosted zone.");
      setBusy(false);
    }
  };

  return (
    <ConsoleLayout
      contentType="form"
      breadcrumbs={[
        ROOT_CRUMB,
        { text: "Hosted zones", href: "/hostedzones" },
        { text: "Create hosted zone", href: "/hostedzones/create" },
      ]}
      content={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Form
            header={
              <Header variant="h1" info={<Link variant="info">Info</Link>}>
                Create hosted zone
              </Header>
            }
            errorText={error}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button formAction="none" variant="link" onClick={() => router.push("/hostedzones")}>
                  Cancel
                </Button>
                <Button variant="primary" loading={busy}>
                  Create hosted zone
                </Button>
              </SpaceBetween>
            }
          >
            <SpaceBetween size="l">
              <Container
                header={
                  <Header
                    variant="h2"
                    description="A hosted zone is a container that holds information about how you want to route traffic for a domain, such as example.com, and its subdomains."
                  >
                    Hosted zone configuration
                  </Header>
                }
              >
                <SpaceBetween size="l">
                  <FormField
                    label="Domain name"
                    description="This is the name of the domain that you want to route traffic for."
                    constraintText="Valid characters: a-z, 0-9, hyphen (-), underscore (_) and period (.)"
                    errorText={nameError}
                  >
                    <Input value={name} placeholder="example.com" onChange={(e) => setName(e.detail.value)} autoFocus />
                  </FormField>
                  <FormField
                    label={
                      <>
                        Description <i>- optional</i>
                      </>
                    }
                    description="This value lets you distinguish hosted zones that have the same name."
                    constraintText={`The description can have up to 256 characters. ${comment.length}/256`}
                  >
                    <Textarea
                      value={comment}
                      placeholder="The hosted zone is used for..."
                      onChange={(e) => setComment(e.detail.value.slice(0, 256))}
                      rows={3}
                    />
                  </FormField>
                  <FormField label="Type" description="The type indicates whether you want to route traffic on the internet or in an Amazon VPC.">
                    <Tiles
                      value={type}
                      onChange={(e) => setType(e.detail.value as "public" | "private")}
                      items={[
                        {
                          value: "public",
                          label: "Public hosted zone",
                          description: "A public hosted zone determines how traffic is routed on the internet.",
                        },
                        {
                          value: "private",
                          label: "Private hosted zone",
                          description: "A private hosted zone determines how traffic is routed within an Amazon VPC.",
                        },
                      ]}
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
              {type === "private" && (
                <Container
                  header={
                    <Header variant="h2" description="To use this hosted zone to resolve DNS queries for one or more VPCs, choose the VPCs.">
                      VPCs to associate with the hosted zone
                    </Header>
                  }
                >
                  <SpaceBetween size="l">
                    <FormField label="Region" errorText={vpcError && !region ? vpcError : ""}>
                      <Select
                        selectedOption={region}
                        options={REGIONS}
                        placeholder="Choose Region"
                        onChange={(e) => setRegion(e.detail.selectedOption as { value: string; label: string })}
                      />
                    </FormField>
                    <FormField label="VPC ID" errorText={vpcError && !vpcId.trim() ? vpcError : ""}>
                      <Input value={vpcId} placeholder="vpc-0a1b2c3d4e5f67890" onChange={(e) => setVpcId(e.detail.value)} />
                    </FormField>
                  </SpaceBetween>
                </Container>
              )}
            </SpaceBetween>
          </Form>
        </form>
      }
    />
  );
}
