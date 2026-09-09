import { api } from "../hooks/useAuth";
import { getSyncQueue, markSynced, markConflict, updateSyncRetry } from "./db";
import { dataUrlToBlob } from "./image";

async function resolvePhoto(payload) {
  if (!payload.photograph_url || !payload.photograph_url.startsWith("data:")) {
    return payload;
  }
  const blob = await dataUrlToBlob(payload.photograph_url);
  const formData = new FormData();
  formData.append("photo", blob, "photo.jpg");
  const res = await api.post("/agent/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return { ...payload, photograph_url: res.data.url };
}

export async function syncPendingRecords() {
  const pending = await getSyncQueue();
  if (pending.length === 0) return { synced: 0, conflicts: 0, failed: 0 };

  let synced = 0,
    conflicts = 0,
    failed = 0;

  const ready = [];
  for (const item of pending) {
    try {
      const payload = await resolvePhoto(item.payload);
      ready.push({ ...item, payload });
    } catch (e) {
      await updateSyncRetry(item.client_id);
      failed++;
    }
  }

  if (ready.length === 0) return { synced, conflicts, failed };

  const records = ready.map((item) => item.payload);

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
    for (const item of ready) {
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
