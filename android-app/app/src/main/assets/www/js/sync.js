/*
 * Motor de sincronização.
 * Envia as respostas pendentes para o servidor:
 *   - ao carregar a página (se online),
 *   - sempre que a internet voltar (evento "online"),
 *   - automaticamente a cada hora (intervalo configurável).
 * Se não houver backend configurado, mantém tudo localmente sem erros.
 */
window.Sync = (function () {
  const cfg = window.SYNC_CONFIG || { enabled: false };
  let timer = null;
  const listeners = [];

  function onChange(fn) { listeners.push(fn); }
  function emit(status) { listeners.forEach((fn) => fn(status)); }

  function isConfigured() {
    return cfg.enabled && cfg.endpoint && cfg.endpoint.trim() !== "";
  }

  function lastSyncAt() {
    return localStorage.getItem("last_sync_at") || null;
  }

  async function run(reason) {
    if (!navigator.onLine) { emit({ ok: false, reason: "offline" }); return; }
    if (!isConfigured()) { emit({ ok: false, reason: "no-backend" }); return; }

    const pendentes = await DB.pending();
    if (pendentes.length === 0) { emit({ ok: true, sent: 0, reason }); return; }

    // remove o campo de controle "synced" antes de enviar
    const clean = (r) => { const { synced, ...rest } = r; return rest; };

    function post(body) {
      return fetch(cfg.endpoint, {
        method: "POST",
        headers: cfg.headers || { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    try {
      // 1) tenta enviar tudo de uma vez (lote)
      const res = await post(pendentes.map(clean));
      if (res.ok) {
        await DB.markSynced(pendentes.map((r) => r.id));
        localStorage.setItem("last_sync_at", new Date().toISOString());
        emit({ ok: true, sent: pendentes.length, reason });
        return;
      }
      // 2) conflito de duplicata (409): reenvia um a um, ignorando os que já existem
      if (res.status === 409) {
        const ok = [];
        for (const r of pendentes) {
          const one = await post([clean(r)]);
          if (one.ok || one.status === 409) ok.push(r.id); // 409 = já estava no servidor
        }
        if (ok.length) await DB.markSynced(ok);
        localStorage.setItem("last_sync_at", new Date().toISOString());
        emit({ ok: true, sent: ok.length, reason });
        return;
      }
      throw new Error("HTTP " + res.status);
    } catch (err) {
      emit({ ok: false, reason: "error", error: String(err) });
    }
  }

  function start() {
    // tenta ao iniciar
    run("startup");
    // a cada hora
    if (timer) clearInterval(timer);
    timer = setInterval(() => run("interval"), cfg.syncIntervalMs || 3600000);
    // quando a conexão voltar
    window.addEventListener("online", () => { emit({ ok: true, reason: "reconnect" }); run("online"); });
    window.addEventListener("offline", () => emit({ ok: false, reason: "offline" }));
  }

  return { start, run, onChange, isConfigured, lastSyncAt };
})();
