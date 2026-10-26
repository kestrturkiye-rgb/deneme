import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { stdin, stdout } from "node:process";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile, rename, access } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
loadEnvConfig(process.cwd());
const cloud =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;

const dir = path.resolve(process.env.CMS_DATA_DIR || ".cms");
const file = path.join(dir, "admin.json");
if (cloud) {
  const { data, error } = await cloud
    .from("cms_records")
    .select("key")
    .eq("key", "admin")
    .maybeSingle();
  if (error)
    throw new Error(
      "Veritabanına bağlanılamadı. Önce supabase/setup.sql dosyasını çalıştırın.",
    );
  if (data && !process.argv.includes("--reset"))
    throw new Error(
      "Yönetici zaten var. Bilerek değiştirmek için --reset kullanın.",
    );
} else {
  if (process.env.VERCEL)
    throw new Error("Vercel için önce Supabase bağlantısını yapılandırın.");
  try {
    await access(file);
    if (!process.argv.includes("--reset"))
      throw new Error(
        "Yönetici zaten var. Parolayı yenilemek için --reset kullanın.",
      );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
let hidden = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!hidden) stdout.write(chunk, encoding);
    done();
  },
});
const rl = createInterface({
  input: stdin,
  output,
  terminal: Boolean(stdin.isTTY),
});
try {
  const username = (await rl.question("Yönetici kullanıcı adı: ")).trim();
  stdout.write("Parola (en az 12 karakter, yazarken gösterilmez): ");
  hidden = true;
  const password = await rl.question("");
  hidden = false;
  stdout.write("\n");
  if (!/^[a-zA-Z0-9._@-]{3,80}$/.test(username))
    throw new Error(
      "Kullanıcı adı 3–80 karakter olmalı; harf, sayı, nokta, @, - veya _ kullanın.",
    );
  if (password.length < 12 || password.length > 256)
    throw new Error("Parola 12–256 karakter olmalı.");
  const salt = randomBytes(24).toString("hex");
  const account = {
    username,
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
    secret: randomBytes(48).toString("hex"),
    mustChangePassword: process.argv.includes("--temporary"),
  };
  if (cloud) {
    const { error } = await cloud.from("cms_records").upsert({
      key: "admin",
      value: account,
      version: 0,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Yönetici kaydedilemedi.");
  } else {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const tmp = file + ".tmp";
    await writeFile(tmp, JSON.stringify(account), { mode: 0o600 });
    await rename(tmp, file);
  }
  console.log("Yönetici hesabı hazır. /admin adresinden giriş yapabilirsiniz.");
  if (account.mustChangePassword)
    console.log("İlk girişte yeni bir parola belirlenmesi gerekecek.");
} finally {
  hidden = false;
  rl.close();
}
