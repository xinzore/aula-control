import { DeviceError } from "./protocol";
import type { Snapshot } from "./device";

export type Backup = {
  format: "aula-control-v1";
  model: string;
  configId: number;
  createdAt: string;
  data: number[];
};
export function createBackup(
  snapshot: Snapshot,
  block = snapshot.block,
): Backup {
  return {
    format: "aula-control-v1",
    model: snapshot.model,
    configId: snapshot.configId,
    createdAt: new Date().toISOString(),
    data: Array.from(block),
  };
}
export function rememberBackup(snapshot: Snapshot, block: Uint8Array) {
  const key = `aula-control:backup:${snapshot.configId}`;
  try {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify(createBackup(snapshot, block)));
  } catch {
    throw new DeviceError("BACKUP_FAILED");
  }
}
export function downloadBackup(snapshot: Snapshot, initial = false) {
  let backup = createBackup(snapshot);
  if (initial) {
    const saved = localStorage.getItem(
      `aula-control:backup:${snapshot.configId}`,
    );
    if (saved) backup = JSON.parse(saved) as Backup;
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `aula-${snapshot.model.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${initial ? "original" : "settings"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
