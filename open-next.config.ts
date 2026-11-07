// Cloudflare (OpenNext) configuration.
// Every page is rendered per request (`dynamic = "force-dynamic"`), so no
// incremental cache (R2) is needed; R2 would also require a payment method.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
