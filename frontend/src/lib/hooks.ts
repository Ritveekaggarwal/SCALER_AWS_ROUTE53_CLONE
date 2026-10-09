"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const keys = {
  me: ["me"] as const,
  zones: (p?: object) => (p ? (["zones", p] as const) : (["zones"] as const)),
  zone: (id: string) => ["zone", id] as const,
  records: (zoneId: string, p?: object) => (p ? (["records", zoneId, p] as const) : (["records", zoneId] as const)),
  record: (zoneId: string, id: number) => ["record", zoneId, id] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.me, retry: false, staleTime: 5 * 60_000 });
}

export function useZones(p: { search: string; type?: string; page: number; page_size: number }) {
  return useQuery({ queryKey: keys.zones(p), queryFn: () => api.listZones(p), placeholderData: keepPreviousData });
}

export function useZone(id: string) {
  return useQuery({ queryKey: keys.zone(id), queryFn: () => api.getZone(id), retry: false });
}

export function useRecords(zoneId: string, p: { search: string; type?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: keys.records(zoneId, p),
    queryFn: () => api.listRecords(zoneId, p),
    placeholderData: keepPreviousData,
  });
}

export function useRecord(zoneId: string, id: number) {
  return useQuery({ queryKey: keys.record(zoneId, id), queryFn: () => api.getRecord(zoneId, id), retry: false });
}

export function useInvalidateZoneData() {
  const qc = useQueryClient();
  return (zoneId?: string) => {
    qc.invalidateQueries({ queryKey: keys.zones() });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
    if (zoneId) {
      qc.invalidateQueries({ queryKey: keys.zone(zoneId) });
      qc.invalidateQueries({ queryKey: keys.records(zoneId) });
      qc.invalidateQueries({ queryKey: ["record", zoneId] });
    }
  };
}

export function useForgetZones() {
  const qc = useQueryClient();
  return (zoneIds: string[]) => {
    for (const id of zoneIds) {
      qc.removeQueries({ queryKey: keys.zone(id) });
      qc.removeQueries({ queryKey: keys.records(id) });
      qc.removeQueries({ queryKey: ["record", id] });
    }
    qc.invalidateQueries({ queryKey: keys.zones() });
  };
}

export function useHealthChecks(p: { search: string; status?: string; page: number; page_size: number }) {
  return useQuery({
    queryKey: ["healthchecks", p],
    queryFn: () => api.listHealthChecks(p),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });
}

export function useAllHealthChecks() {
  return useQuery({
    queryKey: ["healthchecks", "all"],
    queryFn: () => api.listHealthChecks({ page: 1, page_size: 100 }),
  });
}

export function useHealthCheck(id: string) {
  return useQuery({
    queryKey: ["healthcheck", id],
    queryFn: () => api.getHealthCheck(id),
    retry: false,
    refetchInterval: 10_000,
  });
}

export function useHealthCheckResults(id: string) {
  return useQuery({
    queryKey: ["healthcheck", id, "results"],
    queryFn: () => api.healthCheckResults(id, 120),
    refetchInterval: 10_000,
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard, refetchInterval: 30_000 });
}

export function useActivity() {
  return useQuery({ queryKey: ["activity"], queryFn: () => api.activity(30), refetchInterval: 30_000 });
}

export function useRefreshAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      qc.clear();
      window.location.href = "/login";
    },
  });
}
