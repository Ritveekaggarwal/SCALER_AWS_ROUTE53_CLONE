"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import styles from "../login/login.module.css";

const ALIAS = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const USER = /^[A-Za-z0-9+=,.@_-]+$/;

export default function SignupPage() {
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["auth-config"], queryFn: api.authConfig, staleTime: Infinity });
  const [f, setF] = useState({ email: "", account_alias: "", display_name: "", username: "", password: "", confirm: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: { detail: { value: string } }) => setF((p) => ({ ...p, [k]: e.detail.value }));

  const errs = {
    account_alias: !ALIAS.test(f.account_alias) || f.account_alias.length < 3 ? "3-63 lowercase letters, numbers and hyphens." : "",
    username: !USER.test(f.username) || f.username.length < 3 ? "At least 3 characters: letters, numbers and +=,.@_-" : "",
    password: f.password.length < 8 ? "Use at least 8 characters." : "",
    confirm: f.confirm !== f.password ? "Passwords don't match." : "",
    email: f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address." : "",
  };
  const show = (k: keyof typeof errs) => (submitted ? errs[k] : "");

  const submit = async () => {
    setSubmitted(true);
    if (Object.values(errs).some(Boolean)) return;
    setLoading(true);
    setError("");
    try {
      await api.register({
        username: f.username,
        password: f.password,
        account_alias: f.account_alias,
        display_name: f.display_name,
        email: f.email,
      });
      qc.clear();
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create the account.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <img src="/aws-logo.svg" alt="AWS" className={styles.logo} />
      </div>
      <div className={styles.card} style={{ maxWidth: 440 }}>
        <Container>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Form
              header={<Box variant="h1">Sign up for AWS</Box>}
              actions={
                <Button variant="primary" formAction="submit" loading={loading} fullWidth disabled={config?.signup_enabled === false}>
                  Create account
                </Button>
              }
            >
              <SpaceBetween size="l">
                {config?.signup_enabled === false && <Alert type="warning">Sign-up is turned off for this console.</Alert>}
                {error && <Alert type="error">{error}</Alert>}
                <FormField label={<>Email address <i>- optional</i></>} errorText={show("email")}>
                  <Input value={f.email} onChange={set("email")} type="email" autoComplete="email" autoFocus />
                </FormField>
                <FormField
                  label="AWS account name"
                  description="Becomes your account alias. You can sign in with it instead of the 12-digit account ID."
                  errorText={show("account_alias")}
                >
                  <Input value={f.account_alias} onChange={(e) => set("account_alias")({ detail: { value: e.detail.value.toLowerCase() } })} placeholder="my-company" />
                </FormField>
                <FormField label={<>Your name <i>- optional</i></>}>
                  <Input value={f.display_name} onChange={set("display_name")} autoComplete="name" />
                </FormField>
                <FormField label="IAM user name" errorText={show("username")}>
                  <Input value={f.username} onChange={set("username")} autoComplete="username" placeholder="admin" />
                </FormField>
                <FormField label="Password" errorText={show("password")} constraintText="At least 8 characters.">
                  <Input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
                </FormField>
                <FormField label="Confirm password" errorText={show("confirm")}>
                  <Input type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" />
                </FormField>
                <Box textAlign="center" color="text-body-secondary">
                  Already have an account?{" "}
                  <NextLink href="/login" className={styles.link}>
                    Sign in
                  </NextLink>
                </Box>
              </SpaceBetween>
            </Form>
          </form>
        </Container>
      </div>
    </div>
  );
}
