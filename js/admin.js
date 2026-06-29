/*
 * Lógica do painel de resultados.
 * Lê os dados locais (IndexedDB), calcula estatísticas e índice de satisfação.
 */
(function () {
  const LABELS = { otimo: "Ótimo", bom: "Bom", ruim: "Ruim" };
  const PILL = { otimo: "pill--otimo", bom: "pill--bom", ruim: "pill--ruim" };

  const el = (id) => document.getElementById(id);

  let filtro = { de: null, ate: null }; // Date ou null

  function pct(part, total) {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  // converte "YYYY-MM-DDTHH:MM" (hora local) para Date
  function localToDate(v) { return v ? new Date(v) : null; }
  // converte Date para o formato do input datetime-local (hora local)
  function toLocalInput(d) {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  // aplica o filtro de data/hora a uma lista de respostas
  function aplicarFiltro(lista) {
    return lista.filter((r) => {
      const t = new Date(r.criado_em).getTime();
      if (filtro.de && t < filtro.de.getTime()) return false;
      if (filtro.ate && t > filtro.ate.getTime()) return false;
      return true;
    });
  }

  function contar(lista) {
    const c = { otimo: 0, bom: 0, ruim: 0, total: lista.length, pendentes: 0 };
    for (const r of lista) {
      if (c[r.valor] !== undefined) c[r.valor]++;
      if (!r.synced) c.pendentes++;
    }
    return c;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function satisfactionIndex(c) {
    // Ótimo = 100, Bom = 50, Ruim = 0
    if (c.total === 0) return null;
    return Math.round((c.otimo * 100 + c.bom * 50 + c.ruim * 0) / c.total);
  }

  function scoreLabel(score) {
    if (score === null) return "Sem dados ainda";
    if (score >= 80) return "Excelente 🎉";
    if (score >= 60) return "Bom 👍";
    if (score >= 40) return "Regular — atenção";
    return "Crítico — ação necessária";
  }

  async function render() {
    const todas = (await DB.all()).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    const all = aplicarFiltro(todas);
    const c = contar(all);

    el("cTotal").textContent = c.total;
    el("cOtimo").textContent = c.otimo;
    el("cBom").textContent = c.bom;
    el("cRuim").textContent = c.ruim;

    const pO = pct(c.otimo, c.total), pB = pct(c.bom, c.total), pR = pct(c.ruim, c.total);
    el("barOtimo").style.width = pO + "%";
    el("barBom").style.width = pB + "%";
    el("barRuim").style.width = pR + "%";
    el("pctOtimo").textContent = pO + "% (" + c.otimo + ")";
    el("pctBom").textContent = pB + "% (" + c.bom + ")";
    el("pctRuim").textContent = pR + "% (" + c.ruim + ")";

    const score = satisfactionIndex(c);
    el("scoreVal").textContent = score === null ? "—" : score + "/100";
    el("scoreLabel").textContent = scoreLabel(score);

    const tbody = el("tbody");
    if (all.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="muted">Nenhuma resposta ainda.</td></tr>';
    } else {
      tbody.innerHTML = all
        .slice(0, 50)
        .map((r) => {
          const synced = r.synced
            ? '<span class="pill pill--synced">Enviado</span>'
            : '<span class="pill pill--pending">Pendente</span>';
          return (
            "<tr><td>" + fmtDate(r.criado_em) + "</td>" +
            '<td><span class="pill ' + PILL[r.valor] + '">' + (LABELS[r.valor] || r.valor) + "</span></td>" +
            "<td>" + synced + "</td></tr>"
          );
        })
        .join("");
    }

    // meta info (pendentes é sempre o total global, não o filtrado)
    const pendentesGlobal = todas.filter((r) => !r.synced).length;
    const last = Sync.lastSyncAt();
    let meta = "Dispositivo: " + DB.deviceId().slice(0, 8) + " · ";
    if (!Sync.isConfigured()) {
      meta += "Modo somente local (backend não configurado).";
    } else if (last) {
      meta += "Última sincronização: " + fmtDate(last) + " · " + pendentesGlobal + " pendente(s).";
    } else {
      meta += "Backend configurado · " + pendentesGlobal + " pendente(s).";
    }
    el("metaInfo").textContent = meta;

    // descrição do filtro ativo
    if (filtro.de || filtro.ate) {
      const de = filtro.de ? fmtDate(filtro.de.toISOString()) : "início";
      const ate = filtro.ate ? fmtDate(filtro.ate.toISOString()) : "agora";
      el("filtroAtivo").textContent =
        "Filtro ativo: " + de + " → " + ate + " · " + c.total + " de " + todas.length + " respostas.";
    } else {
      el("filtroAtivo").textContent =
        "Sem filtro (mostrando todo o período) · " + todas.length + " respostas.";
    }
  }

  function marcarChip(preset) {
    document.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("active", preset && c.dataset.preset === preset));
  }

  function aplicarPreset(preset) {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    let de = null, ate = null;
    if (preset === "hoje") { de = inicioHoje; ate = agora; }
    else if (preset === "ontem") {
      const ini = new Date(inicioHoje); ini.setDate(ini.getDate() - 1);
      de = ini; ate = new Date(inicioHoje.getTime() - 1000);
    }
    else if (preset === "7d") { de = new Date(agora.getTime() - 7 * 864e5); ate = agora; }
    else if (preset === "30d") { de = new Date(agora.getTime() - 30 * 864e5); ate = agora; }
    // "tudo" => de/ate null
    filtro.de = de; filtro.ate = ate;
    el("fDe").value = de ? toLocalInput(de) : "";
    el("fAte").value = ate ? toLocalInput(ate) : "";
    marcarChip(preset);
    render();
  }

  async function exportCSV() {
    const todas = (await DB.all()).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    const all = aplicarFiltro(todas); // exporta respeitando o filtro atual
    const header = "id,valor,criado_em,dispositivo,enviado\n";
    const rows = all
      .map((r) => [r.id, r.valor, r.criado_em, r.dispositivo, r.synced ? "sim" : "nao"].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pesquisa-satisfacao-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  el("btnSync").addEventListener("click", async () => {
    if (!Sync.isConfigured()) {
      alert("Nenhum servidor configurado.\nEdite js/config.js para ativar a sincronização.");
      return;
    }
    el("btnSync").textContent = "Sincronizando…";
    await Sync.run("manual");
    el("btnSync").textContent = "Sincronizar agora";
    render();
  });

  el("btnExport").addEventListener("click", exportCSV);

  // filtros de data/hora
  document.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => aplicarPreset(c.dataset.preset)));
  el("btnAplicar").addEventListener("click", () => {
    filtro.de = localToDate(el("fDe").value);
    filtro.ate = localToDate(el("fAte").value);
    marcarChip(null);
    render();
  });
  el("btnLimpar").addEventListener("click", () => {
    filtro = { de: null, ate: null };
    el("fDe").value = ""; el("fAte").value = "";
    marcarChip("tudo");
    render();
  });

  el("btnClear").addEventListener("click", async () => {
    if (confirm("Apagar TODAS as respostas deste aparelho? Esta ação não pode ser desfeita.")) {
      await DB.clear();
      render();
    }
  });

  Sync.onChange(render);
  render();
  Sync.start();
})();
