import { api } from "../hooks/useAuth";
import { getSyncQueue, markSynced, markConflict, updateSyncRetry } from "./db";

export async function syncPendingRecords() {
  const pending = await getSyncQueue();
  if (pending.length === 0) return { synced: 0, conflicts: 0, failed: 0 };

  const records = pending.map((item) => item.payload);
  let synced = 0,
    conflicts = 0,
    failed = 0;

  try {
    const res = await api.post("/sync/push", { records });
    for (const result of res.data.results) {
      if (result.status === "synced" || result.status === "already_synced") {
        await markSynced(result.client_id);
        synced++;
      } else if (result.status === "conflict") {
        await markConflict(result.client_id, result);
        conflicts++;
      } else {
        await updateSyncRetry(result.client_id);
        failed++;
      }
    }
  } catch (error) {
    for (const item of pending) {
      await updateSyncRetry(item.client_id);
      failed++;
    }
  }

  return { synced, conflicts, failed };
}

export function startAutoSync() {
  const interval = setInterval(() => {
    if (navigator.onLine) {
      syncPendingRecords();
    }
  }, 30000);
  return () => clearInterval(interval);
}
