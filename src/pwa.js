/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
export const manifest={id:"/",name:"Instagram Reel Automations",short_name:"Reel Automations",start_url:"/",scope:"/",display:"standalone",background_color:"#f3f4f6",theme_color:"#25283a",icons:[{src:"/app-icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]};
export const appIcon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#25283a"/><path d="M40 52h112v78H89l-31 25v-25H40z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><path d="m88 70 30 21-30 21z" fill="#fff"/></svg>';
// Network only: never cache credentials or API responses.
export const serviceWorker="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";
