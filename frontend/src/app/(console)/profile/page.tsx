"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Tiles from "@cloudscape-design/components/tiles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ConsoleLayout, { ROOT_CRUMB } from "@/components/console-layout";
import { useFlash } from "@/components/flash";
import { daysRemaining, FREE_PLAN_CREDITS, FREE_PLAN_DAYS } from "@/components/shell/account-menu";
import { formatDate } from "@/components/table-helpers";
import { useTheme, type ThemePreference } from "@/components/theme";
import { api, ApiError } from "@/lib/api";
import { useLogout, useMe } from "@/lib/hooks";

const formatAccountId = (id: string) => id.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3");

function AccountSection() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { notify } = useFlash();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", email: "", account_alias: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (me) setForm({ display_name: me.display_name, email: me.email, account_alias: me.account_alias });
  }, [me, editing]);

  if (!me) return null;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.updateProfile(form);
      qc.setQueryData(["me"], updated);
      notify("success", "Your account settings were saved.");
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="account">
      <Container
        header={
          <Header
            variant="h2"
            actions={!editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
          >
            Account details
          </Header>
        }
      >
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Form
              errorText={error}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button formAction="none" variant="link" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" loading={busy}>
                    Save changes
                  </Button>
                </SpaceBetween>
              }
            >
              <SpaceBetween size="l">
                <FormField label="Name">
                  <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.detail.value })} />
                </FormField>
                <FormField label="Email address">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.detail.value })} />
                </FormField>
                <FormField label="Account alias" description="Shown in the top bar. You can sign in with it instead of the account ID." constraintText="3-63 lowercase letters, numbers and hyphens.">
                  <Input value={form.account_alias} onChange={(e) => setForm({ ...form, account_alias: e.detail.value.toLowerCase() })} />
                </FormField>
              </SpaceBetween>
            </Form>
          </form>
        ) : (
          <KeyValuePairs
            columns={3}
            items={[
              { label: "Account ID", value: <span className="mono">{formatAccountId(me.account_id)}</span> },
              { label: "Account alias", value: me.account_alias },
              { label: "IAM user", value: me.username },
              { label: "Name", value: me.display_name || "-" },
              { label: "Email address", value: me.email || "-" },
              { label: "Member since", value: formatDate(me.created_at) },
            ]}
          />
        )}
      </Container>
    </div>
  );
}

function PlanSection() {
  const { data: me } = useMe();
  if (!me) return null;
  const days = daysRemaining(me.created_at);
  return (
    <div id="plan">
      <Container header={<Header variant="h2" description="Your account is on the Free plan.">Plan and credits</Header>}>
        <SpaceBetween size="l">
          <KeyValuePairs
            columns={3}
            items={[
              { label: "Plan", value: "Free plan" },
              { label: "Credits remaining", value: `$${FREE_PLAN_CREDITS.toFixed(2)} USD` },
              { label: "Days remaining", value: `${days} of ${FREE_PLAN_DAYS}` },
            ]}
          />
          <ProgressBar
            value={Math.round(((FREE_PLAN_DAYS - days) / FREE_PLAN_DAYS) * 100)}
            label="Free plan period used"
            description="Route 53 in this console doesn't charge for hosted zones, queries or health checks."
          />
        </SpaceBetween>
      </Container>
    </div>
  );
}

function SecuritySection() {
  const { notify } = useFlash();
  const qc = useQueryClient();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const errs = {
    current: !f.current ? "Enter your current password." : "",
    next: f.next.length < 8 ? "Use at least 8 characters." : "",
    confirm: f.confirm !== f.next ? "Passwords don't match." : "",
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    setError("");
    try {
      await api.changePassword({ current_password: f.current, new_password: f.next });
      setF({ current: "", next: "", confirm: "" });
      setSubmitted(false);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      notify("success", "Your password was changed. Other sessions were signed out.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="security">
      <Container header={<Header variant="h2" description="Changing your password signs out every other session.">Security credentials</Header>}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Form
            errorText={error}
            actions={
              <Button variant="primary" loading={busy}>
                Change password
              </Button>
            }
          >
            <SpaceBetween size="l">
              <FormField label="Current password" errorText={submitted ? errs.current : ""}>
                <Input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.detail.value })} autoComplete="current-password" />
              </FormField>
              <FormField label="New password" errorText={submitted ? errs.next : ""} constraintText="At least 8 characters.">
                <Input type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.detail.value })} autoComplete="new-password" />
              </FormField>
              <FormField label="Confirm new password" errorText={submitted ? errs.confirm : ""}>
                <Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.detail.value })} autoComplete="new-password" />
              </FormField>
            </SpaceBetween>
          </Form>
        </form>
      </Container>
    </div>
  );
}

function SessionsSection() {
  const { notify } = useFlash();
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ["sessions"], queryFn: api.sessions });
  const [revoking, setRevoking] = useState<string | null>(null);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.revokeSession(id);
      notify("success", "The session was signed out.");
      refetch();
    } catch (e) {
      notify("error", e instanceof ApiError ? e.message : "Couldn't sign out the session.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div id="sessions">
      <Table
        variant="container"
        header={
          <Header variant="h2" counter={`(${data.length})`} description="Browsers that are signed in to this account.">
            Active sessions
          </Header>
        }
        loading={isLoading}
        items={data}
        trackBy="id"
        columnDefinitions={[
          { id: "id", header: "Session", cell: (s) => <span className="mono">{s.id}</span> },
          {
            id: "status",
            header: "Status",
            cell: (s) => (s.current ? <StatusIndicator type="success">This browser</StatusIndicator> : <StatusIndicator type="info">Active</StatusIndicator>),
          },
          { id: "created", header: "Signed in", cell: (s) => formatDate(s.created_at) },
          { id: "expires", header: "Expires", cell: (s) => formatDate(s.expires_at) },
          {
            id: "actions",
            header: "Actions",
            cell: (s) =>
              s.current ? (
                "-"
              ) : (
                <Button variant="inline-link" loading={revoking === s.id} onClick={() => revoke(s.id)}>
                  Sign out
                </Button>
              ),
          },
        ]}
      />
    </div>
  );
}

function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  return (
    <div id="preferences">
      <Container header={<Header variant="h2">Unified settings</Header>}>
        <SpaceBetween size="l">
          <FormField label="Visual mode">
            <Tiles
              value={theme}
              onChange={(e) => setTheme(e.detail.value as ThemePreference)}
              columns={3}
              items={[
                { value: "system", label: "Browser default", description: "Follow your operating system setting." },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </FormField>
          <FormField label="Language">
            <Box>English (US)</Box>
          </FormField>
          <Alert
            type="info"
            action={
              <Button onClick={() => logout.mutate()} loading={logout.isPending}>
                Sign out
              </Button>
            }
          >
            Signing out ends this browser&apos;s session.
          </Alert>
        </SpaceBetween>
      </Container>
    </div>
  );
}

export default function ProfilePage() {
  const { data: me } = useMe();

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && me) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [me]);

  return (
    <ConsoleLayout
      breadcrumbs={[ROOT_CRUMB, { text: "Profile", href: "/profile" }]}
      content={
        <ContentLayout
          header={
            <Header variant="h1" description="Manage your account, password, sessions and console settings.">
              {me ? me.display_name || me.username : "Profile"}
            </Header>
          }
        >
          <SpaceBetween size="l">
            <AccountSection />
            <PlanSection />
            <SecuritySection />
            <SessionsSection />
            <PreferencesSection />
          </SpaceBetween>
        </ContentLayout>
      }
    />
  );
}
