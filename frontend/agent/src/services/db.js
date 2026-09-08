import Dexie from "dexie";

export const db = new Dexie("PollingUnitDB");

db.version(1).stores({
  registrations:
    "++id, client_id, pvc_number, full_name, sync_status, registered_at",
  syncQueue: "++id, client_id, status, retry_count, last_retry",
  metadata: "key",
});

export async function findLocalByPvc(pvc) {
  return await db.registrations
    .where("pvc_number")
    .equals(pvc)
    .and((r) => r.sync_status !== "conflict")
    .first();
}

export async function storeRegistration(data) {
  const clientId = crypto.randomUUID();
  const record = {
    client_id: clientId,
    ...data,
    sync_status: "pending",
    created_at: new Date().toISOString(),
  };
  await db.registrations.add(record);
  await db.syncQueue.add({
    client_id: clientId,
    payload: record,
    status: "pending",
    retry_count: 0,
    last_retry: null,
  });
  return record;
}

export async function getPendingCount() {
  return await db.registrations.where("sync_status").equals("pending").count();
}

export async function getConflictCount() {
  return await db.registrations.where("sync_status").equals("conflict").count();
}

export async function getSyncedCount() {
  return await db.registrations.where("sync_status").equals("synced").count();
}

export async function getMyRecords() {
  return await db.registrations.reverse().sortBy("created_at");
}

export async function getSyncQueue() {
  return await db.syncQueue.where("status").equals("pending").toArray();
}

export async function markSynced(clientId) {
  await db.registrations
    .where("client_id")
    .equals(clientId)
    .modify({ sync_status: "synced" });
  await db.syncQueue.where("client_id").equals(clientId).delete();
}

export async function markConflict(clientId, metadata) {
  await db.registrations.where("client_id").equals(clientId).modify({
    sync_status: "conflict",
    sync_metadata: metadata,
  });
  await db.syncQueue
    .where("client_id")
    .equals(clientId)
    .modify({ status: "failed" });
}

export async function updateSyncRetry(clientId) {
  const item = await db.syncQueue.where("client_id").equals(clientId).first();
  if (item) {
    await db.syncQueue
      .where("client_id")
      .equals(clientId)
      .modify({
        retry_count: item.retry_count + 1,
        last_retry: new Date().toISOString(),
      });
  }
}

export async function updatePendingRegistration(clientId, updates) {
  await db.registrations.where("client_id").equals(clientId).modify(updates);

  const queueItem = await db.syncQueue
    .where("client_id")
    .equals(clientId)
    .first();
  if (queueItem) {
    await db.syncQueue
      .where("client_id")
      .equals(clientId)
      .modify({
        payload: { ...queueItem.payload, ...updates },
      });
  }
}

export async function deletePendingRegistration(clientId) {
  await db.registrations.where("client_id").equals(clientId).delete();
  await db.syncQueue.where("client_id").equals(clientId).delete();
}
