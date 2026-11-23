// CPAL-1.0; see LICENSE.
import { bindings, defineConfig, triggers } from "cf/config";
export default defineConfig({
  worker: {
    name: "instagram-reel-automations",
    entrypoint: "./src/index.js",
    compatibilityDate: "2026-11-23",
    env: {
      DB: bindings.d1({ name: "instagram-reel-automations" }),
      ADMIN_TOKEN: bindings.secret(),
      META_APP_SECRET: bindings.secret(),
      META_VERIFY_TOKEN: bindings.secret(),
      IG_ACCESS_TOKEN: bindings.secret(),
      IG_ACCOUNT_ID: bindings.secret(),
      GRAPH_VERSION: bindings.text("v24.0"),
      LIVE_SENDS: bindings.text("0"),
    },
    triggers: [triggers.scheduled({ schedule: "*/1 * * * *" })],
  },
});
