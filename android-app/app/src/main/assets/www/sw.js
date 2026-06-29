/*
 * Service Worker — permite que o app funcione offline.
 * Estratégia: cache-first para os arquivos do app (app shell).
 */
const CACHE = "pesquisa-satisfacao-v18";
const ASSETS = [
  "./",
  "index.html",
  "admin.html",
  "painel-central.html",
  "login.html",
  "cadastro.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/config.js",
  "js/sessao.js",
  "js/db.js",
  "js/sync.js",
  "js/survey.js",
  "js/admin.js",
  "js/central.js",
  "js/login.js",
  "js/cadastro.js",
  "icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // não cacheia POST de sincronização
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          // atualiza o cache em segundo plano (somente mesma origem)
          if (res && res.ok && req.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
