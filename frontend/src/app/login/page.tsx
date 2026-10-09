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
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiError } from "@/lib/api";
import styles from "./login.module.css";

const svgProps = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function EyeIcon() {
  return (
    <svg {...svgProps} aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...svgProps} aria-hidden="true">
      <path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a19.9 19.9 0 0 1-3.17 4.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["auth-config"], queryFn: api.authConfig, staleTime: Infinity });
  const [accountId, setAccountId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) {
      setError("Enter your IAM user name and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.login({ account_id: accountId, username, password });
      qc.clear();
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign-in failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <NextLink href="/" aria-label="Back to home">
          <img src="/aws-logo.svg" alt="AWS" className={styles.logo} />
        </NextLink>
      </div>
      <div className={styles.card}>
        <Container>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Form
              header={
                <SpaceBetween size="xxs">
                  <Box variant="h1">Sign in as IAM user</Box>
                </SpaceBetween>
              }
              actions={
                <Button variant="primary" formAction="submit" loading={loading} fullWidth>
                  Sign in
                </Button>
              }
            >
              <SpaceBetween size="l">
                {error && <Alert type="error">{error}</Alert>}
                <FormField label="Account ID (12 digits) or account alias">
                  <Input value={accountId} onChange={(e) => setAccountId(e.detail.value)} autoComplete="off" autoFocus />
                </FormField>
                <FormField label="IAM user name">
                  <Input value={username} onChange={(e) => setUsername(e.detail.value)} autoComplete="username" />
                </FormField>
                <FormField label="Password">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.detail.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <Button
                      variant="icon"
                      formAction="none"
                      iconSvg={showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      ariaLabel={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                    />
                  </div>
                </FormField>
                <Box variant="small" color="text-body-secondary">
                  Demo credentials: account ID <b>123456789012</b>, IAM user name <b>demo</b>, password{" "}
                  <b>demo1234</b>.{" "}
                  <Button
                    variant="inline-link"
                    formAction="none"
                    onClick={() => {
                      setAccountId("123456789012");
                      setUsername("demo");
                      setPassword("demo1234");
                    }}
                  >
                    Fill in
                  </Button>
                </Box>
                {config?.signup_enabled && (
                  <Box textAlign="center" color="text-body-secondary">
                    New to the console? <NextLink href="/signup" className={styles.link}>Create a new account</NextLink>
                  </Box>
                )}
              </SpaceBetween>
            </Form>
          </form>
        </Container>
      </div>
      <Box variant="small" color="text-body-secondary" textAlign="center" padding={{ top: "l" }}>
        Route 53 console clone. Accounts and data are stored in this app&apos;s own database.
      </Box>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
