import mockData from "../data/land-registry-ui-mock-data.json" with { type: "json" };

const TRANSFERS_KEY = "tl_transfers_v1";
const NOTIFICATIONS_KEY = "tl_notifications_v1";
const AUDIT_KEY = "tl_audit_v1";
const NONCES_KEY = "tl_nonces_v1";
const SESSION_KEY = "tl_session_v1";

export function getDemoTransfers() {
  try {
    const raw = localStorage.getItem(TRANSFERS_KEY);
    return raw ? JSON.parse(raw) : [...(mockData.transfer_requests || [])];
  } catch (e) {
    console.error("Error reading transfers from storage", e);
    return [...(mockData.transfer_requests || [])];
  }
}

export function saveDemoTransfers(transfers) {
  try {
    localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers));
  } catch (e) {
    console.error("Error saving transfers", e);
  }
}

export function updateDemoTransfer(requestId, updates) {
  const list = getDemoTransfers();
  const index = list.findIndex((t) => t.request_id === requestId);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    saveDemoTransfers(list);
    return list[index];
  }
  return null;
}

export function getDemoNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [...(mockData.notifications || [])];
  } catch (e) {
    return [...(mockData.notifications || [])];
  }
}

export function markDemoNotificationRead(id) {
  const notifs = getDemoNotifications();
  const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getDemoAuditEvents() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [...(mockData.audit_events || [])];
  } catch (e) {
    return [...(mockData.audit_events || [])];
  }
}

export function appendDemoAuditEvent(event) {
  const events = getDemoAuditEvents();
  const newEvent = {
    id: `AUD-${String(events.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  events.unshift(newEvent);
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(events));
  } catch (e) {}
  return newEvent;
}

export function getConsumedNonces() {
  try {
    const raw = localStorage.getItem(NONCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function consumeNonce(nonce) {
  const nonces = getConsumedNonces();
  if (!nonces.includes(nonce)) {
    nonces.push(nonce);
    try {
      localStorage.setItem(NONCES_KEY, JSON.stringify(nonces));
    } catch (e) {}
  }
}

export function isNonceConsumed(nonce) {
  const nonces = getConsumedNonces();
  return nonces.includes(nonce);
}

export function resetAllDemoData() {
  try {
    localStorage.removeItem(TRANSFERS_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.removeItem(AUDIT_KEY);
    localStorage.removeItem(NONCES_KEY);
    localStorage.removeItem("tl_sell_tokens_v1");
    localStorage.removeItem("titlelock.sellKeys");
    localStorage.removeItem("titlelock.demo.transfers");
    // Preserve session unless explicit logout
  } catch (e) {
    console.error("Error resetting demo data", e);
  }
}
