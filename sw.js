/*
 * THE KILL SWITCH.
 *
 * The retired app shipped a Workbox service worker that precached its shell and
 * answered every navigation from cache. Replacing index.html is therefore not
 * enough: an installed copy keeps serving the OLD app forever and nobody ever
 * sees that the ledger moved. The cleanup has to live in a service worker,
 * because that is the thing standing between the browser and the network.
 *
 * This file sits at the same path the old sw.js did, so the browser's routine
 * update check finds it, installs it, and hands it control. It then deletes every
 * cache, unregisters itself, and reloads any open window — after which the site
 * is ordinary files again.
 *
 * It does NOT touch IndexedDB. That is where the ledger is, and the whole point
 * of the page this reveals is to hand that ledger back.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    for (const w of windows) {
      try { await w.navigate(w.url); } catch (e) { /* not navigable; next load is clean */ }
    }
  })());
});

// Until the reload lands, never answer a navigation from the dead cache.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => Response.redirect("./", 302)));
  }
});
