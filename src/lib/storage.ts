import { promises as fs } from "node:fs";
import path from "node:path";

import { getEnv } from "@/lib/env";

export function resolveStoragePath(...segments: string[]) {
  const root = path.resolve(getEnv().STORAGE_ROOT);
  return path.join(root, ...segments);
}

export async function ensureStorageLayout() {
  await Promise.all([
    fs.mkdir(resolveStoragePath("imports"), { recursive: true }),
    fs.mkdir(resolveStoragePath("exports"), { recursive: true }),
    fs.mkdir(resolveStoragePath("jobs"), { recursive: true }),
  ]);
}

export async function removeIfExists(filePath: string) {
  await fs.rm(filePath, { force: true });
}
