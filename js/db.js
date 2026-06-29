/*
 * Camada de armazenamento local (IndexedDB).
 * Guarda todas as respostas no próprio aparelho, funcionando offline.
 * Cada resposta tem: id, valor (otimo|bom|ruim), criado_em, dispositivo, synced.
 */
window.DB = (function () {
  const DB_NAME = "pesquisa_satisfacao";
  const STORE = "respostas";
  const VERSION = 1;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("synced", "synced", { unique: false });
          store.createIndex("criado_em", "criado_em", { unique: false });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode) {
    return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function deviceId() {
    let id = localStorage.getItem("device_id");
    if (!id) { id = uuid(); localStorage.setItem("device_id", id); }
    return id;
  }

  return {
    async add(valor, comentario, melhorias) {
      const store = await tx("readwrite");
      const op = (window.Sessao && Sessao.get()) || null;
      // localidade ativa (escolhida no totem) tem prioridade; senão a principal do operador
      const local = (window.Sessao && Sessao.localAtivo()) ||
        (op && op.local_id ? { id: op.local_id, nome: op.local_nome } : null);
      const registro = {
        id: uuid(),
        valor,
        comentario: (comentario || "").trim() || null,
        melhorias: Array.isArray(melhorias) && melhorias.length ? melhorias : null,
        criado_em: new Date().toISOString(),
        dispositivo: deviceId(),
        operador_id: op ? op.id : null,
        operador_nome: op ? op.nome : null,
        local_id: local ? local.id : null,
        local_nome: local ? local.nome : null,
        synced: 0,
      };
      return new Promise((resolve, reject) => {
        const r = store.add(registro);
        r.onsuccess = () => resolve(registro);
        r.onerror = () => reject(r.error);
      });
    },

    async all() {
      const store = await tx("readonly");
      return new Promise((resolve, reject) => {
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    },

    async pending() {
      const all = await this.all();
      return all.filter((r) => !r.synced);
    },

    async markSynced(ids) {
      const store = await tx("readwrite");
      await Promise.all(
        ids.map(
          (id) =>
            new Promise((resolve) => {
              const g = store.get(id);
              g.onsuccess = () => {
                const rec = g.result;
                if (rec) { rec.synced = 1; store.put(rec); }
                resolve();
              };
              g.onerror = () => resolve();
            })
        )
      );
    },

    async counts() {
      const all = await this.all();
      const c = { otimo: 0, bom: 0, ruim: 0, total: all.length, pendentes: 0 };
      for (const r of all) {
        if (c[r.valor] !== undefined) c[r.valor]++;
        if (!r.synced) c.pendentes++;
      }
      return c;
    },

    async clear() {
      const store = await tx("readwrite");
      return new Promise((resolve, reject) => {
        const r = store.clear();
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    },

    deviceId,
  };
})();
