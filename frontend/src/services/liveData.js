import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api.js";

export const parcelService = {
  list: (token) => apiGet("/properties", token),
  get: (ulpin, token) => apiGet(`/properties/${encodeURIComponent(ulpin)}`, token),
  timeline: (ulpin, token) => apiGet(`/parcels/${encodeURIComponent(ulpin)}/timeline`, token),
  graph: (ulpin, token) => apiGet(`/parcels/${encodeURIComponent(ulpin)}/ownership-graph`, token),
  integrity: (ulpin, token) => apiGet(`/parcels/${encodeURIComponent(ulpin)}/integrity`, token),
  insights: (ulpin, token) => apiGet(`/parcels/${encodeURIComponent(ulpin)}/insights`, token),
  verification: (ulpin, token) => apiGet(`/verification/${encodeURIComponent(ulpin)}`, token),
};

export const transferService = {
  list: (token, statuses) => apiGet(`/v2/transfers${statuses ? `?statuses=${encodeURIComponent(statuses.join(","))}` : ""}`, token),
  get: (transferId, token) => apiGet(`/v2/transfers/${encodeURIComponent(transferId)}`, token),
  create: (payload, token) => apiPost("/v2/transfers", payload, token),
  approve: (transferId, payload, token) => apiPost(`/v2/transfers/${encodeURIComponent(transferId)}/approve`, payload, token),
  challenge: (transferId, token) => apiPost(`/v2/transfers/${encodeURIComponent(transferId)}/approval-challenge`, {}, token),
  approveSignature: (payload, token) => apiPost("/v2/transfers/approve-signature", payload, token),
  submit: (transferId, token) => apiPost(`/v2/transfers/${encodeURIComponent(transferId)}/submit`, {}, token),
};

export const notificationService = {
  list: (token) => apiGet("/notifications", token),
};

export const auditService = {
  list: (token) => apiGet("/audit", token),
  search: (query, token) => apiGet(`/audit/search?${new URLSearchParams(query)}`, token),
};

export const workspaceService = {
  registrar: (token) => apiGet("/workspaces/registrar", token),
  nominee: (token) => apiGet("/workspaces/nominee", token),
  bankReport: (ulpin, token) => apiGet(`/reports/parcel/${encodeURIComponent(ulpin)}`, token),
};

export const successionService = {
  list: (token) => apiGet("/succession", token),
  verify: (caseId, evidenceReference, token) => apiPost(`/succession/${encodeURIComponent(caseId)}/verify`, { evidence_reference: evidenceReference }, token),
  activate: (caseId, token) => apiPost(`/succession/${encodeURIComponent(caseId)}/activate`, {}, token),
};

export function useLiveResource(loader, token, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    loader(token)
      .then((data) => active && setState({ data, loading: false, error: "" }))
      .catch((error) => active && setState({ data: null, loading: false, error: error.message || "Unable to load live data." }));
    return () => { active = false; };
  }, [token, ...dependencies]);

  return state;
}

export function useLiveParcels(token) {
  const result = useLiveResource((sessionToken) => parcelService.list(sessionToken), token);
  return { ...result, data: result.data || [] };
}

export function useLiveTransfers(token) {
  const result = useLiveResource((sessionToken) => transferService.list(sessionToken), token);
  return { ...result, data: (result.data || []).map(normalizeTransfer) };
}

export function useLiveAudit(token) {
  const result = useLiveResource((sessionToken) => auditService.list(sessionToken), token);
  return { ...result, data: (result.data || []).map(normalizeAuditEvent) };
}

export const blockchainService = {
  activity: (token) => apiGet("/chain/all", token),
  health: (token) => apiGet("/ops/blockchain-health", token),
};

export function normalizeTransfer(transfer) {
  if (!transfer) return null;
  return { ...transfer, request_id: transfer.transfer_id, buyer_name: transfer.buyer, owner_names: transfer.sellers || [] };
}

export function normalizeNotification(notification) {
  if (!notification) return null;
  return { ...notification, id: notification.notification_id, title: notification.event_type, created_at: notification.created_at, read: Boolean(notification.read) };
}

export function normalizeAuditEvent(event) {
  if (!event) return null;
  return { ...event, id: event.event_id, actor_id: event.actor, details: event.detail || {}, timestamp: event.timestamp };
}
