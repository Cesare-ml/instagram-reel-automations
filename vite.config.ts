// CPAL-1.0; see LICENSE.
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig({ plugins: [cloudflare()] });
