import "server-only";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { readDocument, writeDocument, backend, database } from "./persistence";

type Account = {
  username: string;
  salt: string;
  hash: string;
  secret: string;
  mustChangePassword?: boolean;
  version?: number;
};
export async function account(): Promise<Account | null> {
  let existing = await readDocument<Account>("admin");
  const username = process.env.CMS_BOOTSTRAP_USERNAME || "";
  const password = process.env.CMS_BOOTSTRAP_PASSWORD || "";
  if (
    !existing &&
    backend() === "supabase" &&
    /^[a-zA-Z0-9._@-]{3,80}$/.test(username) &&
    password.length >= 12 &&
    password.length <= 256
  ) {
    const salt = randomBytes(24).toString("hex");
    const initial: Account = {
      username,
      salt,
      hash: scryptSync(password, salt, 64).toString("hex"),
      secret: randomBytes(48).toString("hex"),
      mustChangePassword: true,
      version: 0,
    };
    const { error } = await database()
      .from("cms_records")
      .upsert(
        { key: "admin", value: initial, version: 0 },
        { onConflict: "key", ignoreDuplicates: true },
      );
    if (error) throw new Error("İlk yönetici hesabı kaydedilemedi.");
    // A concurrent instance may have created the account first; use only the persisted winner.
    existing = await readDocument<Account>("admin");
  }
  return existing;
}
export async function checkPassword(
  username: string,
  password: string,
  snapshot?: Account | null,
) {
  const a = snapshot === undefined ? await account() : snapshot;
  if (!a || password.length > 256) return false;
  const actual = scryptSync(password, a.salt, 64);
  return (
    username === a.username &&
    timingSafeEqual(actual, Buffer.from(a.hash, "hex"))
  );
}
export async function changePassword(password: string, snapshot?: Account) {
  if (password.length < 12 || password.length > 256)
    throw new Error("Parola 12–256 karakter olmalı.");
  const a = snapshot || (await account());
  if (!a) throw new Error("Yönetici hesabı oluşturulmamış.");
  const salt = randomBytes(24).toString("hex");
  const next = {
    ...a,
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
    secret: randomBytes(48).toString("hex"),
    mustChangePassword: false,
    version: (a.version || 0) + 1,
  };
  await writeDocument("admin", next, a.version || 0);
  return next;
}
export async function makeSession(snapshot?: Account) {
  const a = snapshot || (await account());
  if (!a) throw new Error("Yönetici hesabı oluşturulmamış.");
  const payload = Buffer.from(
    JSON.stringify({
      expires: Date.now() + 8 * 60 * 60 * 1000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", a.secret).update(payload).digest("base64url")
  );
}
export async function authenticated({ allowPasswordChange = false } = {}) {
  const token = (await cookies()).get("cms_session")?.value;
  const a = await account();
  if (!a || !token || (a.mustChangePassword && !allowPasswordChange))
    return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", a.secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (
    actual.toString("base64url") !== signature ||
    actual.length !== expected.length ||
    !timingSafeEqual(expected, actual)
  )
    return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(data.expires) && data.expires > Date.now();
  } catch {
    return false;
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  // Explicit SITE_ORIGIN supports deployments behind a trusted reverse proxy.
  if (process.env.SITE_ORIGIN) return origin === process.env.SITE_ORIGIN;
  const url = new URL(request.url);
  // Next can use its bind address in request.url. The browser's Host header
  // preserves localhost, 127.0.0.1 and direct domain access without trusting
  // caller-supplied forwarded-host headers.
  return (
    origin === url.protocol + "//" + (request.headers.get("host") || url.host)
  );
}
