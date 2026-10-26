import "server-only";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
export const dataDir = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.CMS_DATA_DIR ||
      path.join(process.cwd(), ".cms"),
  );
export function atomicWrite(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = file + "." + randomUUID() + ".tmp";
  writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
}
