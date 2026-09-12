import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAuditEvent, normalizeNotification, normalizeTransfer } from "../src/services/liveData.js";

test("normalizes transfer_id to the stable request_id view field", () => {
  const transfer = normalizeTransfer({ transfer_id: "TR-1", buyer: "buyer1", sellers: ["owner1"], status: "READY_TO_COMMIT" });
  assert.deepEqual(transfer, {
    transfer_id: "TR-1", request_id: "TR-1", buyer: "buyer1", buyer_name: "buyer1",
    sellers: ["owner1"], owner_names: ["owner1"], status: "READY_TO_COMMIT",
  });
});

test("normalizes server notifications without inventing severity or actions", () => {
  const notification = normalizeNotification({ notification_id: "N-1", event_type: "TRANSFER_COMPLETED", message: "Done", read: false });
  assert.equal(notification.id, "N-1");
  assert.equal(notification.title, "TRANSFER_COMPLETED");
  assert.equal(notification.severity, undefined);
  assert.equal(notification.action, undefined);
});

test("normalizes audit detail and actor fields", () => {
  const event = normalizeAuditEvent({ event_id: "A-1", actor: "registrar", detail: { tx_hash: "0x1" }, timestamp: "2026-01-01T00:00:00Z" });
  assert.equal(event.id, "A-1");
  assert.equal(event.actor_id, "registrar");
  assert.deepEqual(event.details, { tx_hash: "0x1" });
});