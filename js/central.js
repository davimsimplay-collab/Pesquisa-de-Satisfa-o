/*
 * Painel Central — consolida as respostas de TODOS os totens.
 * Lê os dados via Edge Function protegida por senha (a chave de serviço
 * fica no servidor; aqui só trafega a senha do painel).
 */
(function () {
  const ENDPOINT = "https://aalcpxritnbstojlquxe.supabase.co/functions/v1/painel-resultados";
  const LABELS = { otimo: "Ótimo", bom: "Bom", ruim: "Ruim" };
  const PILL = { otimo: "pill--otimo", bom: "pill--bom", ruim: "pill--ruim" };
  const el = (id) => document.getElementById(id);

  // auth: { modo: 'token', token } OU { modo: 'mestra', senha }
  let auth = null;
  try { auth = JSON.parse(sessionStorage.getItem("painel_auth") || "null"); } catch { auth = null; }
  let timer = null;
  let filtro = { de: null, ate: null, local_id: null, operador_id: null };
  let locaisCarregados = false;
  let operadoresCarregados = false;

  function authHeaders() {
    if (!auth) return {};
    return auth.modo === "token" ? { "x-token": auth.token } : { "x-senha": auth.senha };
  }
  function salvarAuth(a) { auth = a; sessionStorage.setItem("painel_auth", JSON.stringify(a)); }
  function limparAuth() { auth = null; sessionStorage.removeItem("painel_auth"); }

  function pct(p, t) { return t === 0 ? 0 : Math.round((p / t) * 100); }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // converte "YYYY-MM-DDTHH:MM" (hora local) para ISO UTC
  function localToISO(v) { return v ? new Date(v).toISOString() : null; }
  // converte ISO/Date para o formato do input datetime-local (hora local)
  function toLocalInput(d) {
    const x = new Date(d);
    const off = x.getTimezoneOffset();
    return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function scoreLabel(s) {
    if (s === null || s === undefined) return "Sem dados ainda";
    if (s >= 80) return "Excelente 🎉";
    if (s >= 60) return "Bom 👍";
    if (s >= 40) return "Regular — atenção";
    return "Crítico — ação necessária";
  }

  async function fetchData() {
    const qs = new URLSearchParams();
    if (filtro.de) qs.set("de", filtro.de);
    if (filtro.ate) qs.set("ate", filtro.ate);
    if (filtro.local_id) qs.set("local_id", filtro.local_id);
    if (filtro.operador_id) qs.set("operador_id", filtro.operador_id);
    const sep = qs.toString() ? "?" + qs.toString() : "";
    const res = await fetch(ENDPOINT + sep, { headers: authHeaders() });
    if (res.status === 401) { throw new Error("401"); }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function showLogin(msg) {
    el("login").hidden = false;
    el("conteudo").hidden = true;
    if (msg) { el("loginErr").style.display = "block"; el("loginErr").textContent = msg; }
  }

  function render(d) {
    el("login").hidden = true;
    el("conteudo").hidden = false;

    el("cTotal").textContent = d.total;
    el("cOtimo").textContent = d.counts.otimo;
    el("cBom").textContent = d.counts.bom;
    el("cRuim").textContent = d.counts.ruim;
    el("cDisp").textContent = d.dispositivos;

    const pO = pct(d.counts.otimo, d.total), pB = pct(d.counts.bom, d.total), pR = pct(d.counts.ruim, d.total);
    el("barOtimo").style.width = pO + "%"; el("pctOtimo").textContent = pO + "% (" + d.counts.otimo + ")";
    el("barBom").style.width = pB + "%"; el("pctBom").textContent = pB + "% (" + d.counts.bom + ")";
    el("barRuim").style.width = pR + "%"; el("pctRuim").textContent = pR + "% (" + d.counts.ruim + ")";

    el("scoreVal").textContent = d.indice === null ? "—" : d.indice + "/100";
    el("scoreLabel").textContent = scoreLabel(d.indice);

    // gráfico por dia
    const max = Math.max(1, ...d.por_dia.map((x) => x.qtd));
    el("chartDias").innerHTML = d.por_dia.length === 0
      ? '<span class="muted">Sem dados.</span>'
      : d.por_dia.map((x) => {
          const h = Math.round((x.qtd / max) * 130) + 4;
          const dia = x.dia.slice(8, 10) + "/" + x.dia.slice(5, 7);
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">' +
            '<div style="font-size:11px;color:#64748b">' + x.qtd + '</div>' +
            '<div title="' + dia + ': ' + x.qtd + '" style="width:100%;max-width:34px;height:' + h + 'px;background:#0f172a;border-radius:6px 6px 0 0"></div>' +
            '<div style="font-size:10px;color:#94a3b8">' + dia + '</div></div>';
        }).join("");

    // gráfico por hora do dia (0-23)
    if (d.por_hora) {
      const maxH = Math.max(1, ...d.por_hora.map((x) => x.qtd));
      el("chartHoras").innerHTML = d.por_hora.map((x) => {
        const h = Math.round((x.qtd / maxH) * 110) + 2;
        const cor = x.qtd > 0 ? "#0f172a" : "#e2e8f0";
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">' +
          '<div title="' + x.hora + 'h: ' + x.qtd + '" style="width:100%;height:' + h + 'px;background:' + cor + ';border-radius:4px 4px 0 0"></div>' +
          (x.hora % 3 === 0 ? '<div style="font-size:9px;color:#94a3b8">' + x.hora + 'h</div>' : '<div style="font-size:9px">&nbsp;</div>') +
          '</div>';
      }).join("");
    }

    // popular seletor de localidades (uma vez)
    if (!locaisCarregados && d.locais) {
      el("fLocal").innerHTML = '<option value="">Todas</option>' +
        d.locais.map((l) => '<option value="' + l.id + '">' + l.nome + "</option>").join("");
      locaisCarregados = true;
    }
    // popular seletor de operadores (uma vez)
    if (!operadoresCarregados && d.operadores) {
      el("fOperador").innerHTML = '<option value="">Todos</option>' +
        d.operadores.map((o) => '<option value="' + o.id + '">' + escapeHtml(o.nome) + "</option>").join("");
      operadoresCarregados = true;
    }

    // resultados por localidade
    el("tbodyLocais").innerHTML = (d.por_local && d.por_local.length)
      ? d.por_local.map((l) =>
          "<tr><td><strong>" + l.local_nome + "</strong></td><td>" + l.total + "</td>" +
          '<td style="color:var(--otimo)">' + l.otimo + "</td>" +
          '<td style="color:var(--bom)">' + l.bom + "</td>" +
          '<td style="color:var(--ruim)">' + l.ruim + "</td>" +
          "<td><strong>" + (l.indice === null ? "—" : l.indice + "/100") + "</strong></td></tr>"
        ).join("")
      : '<tr><td colspan="6" class="muted">Sem dados.</td></tr>';

    // resultados por operador
    el("tbodyOperadores").innerHTML = (d.por_operador && d.por_operador.length)
      ? d.por_operador.map((o) =>
          "<tr><td><strong>" + o.operador_nome + "</strong></td>" +
          '<td style="color:#94a3b8">' + (o.local_nome || "—") + "</td>" +
          "<td>" + o.total + "</td>" +
          '<td style="color:var(--otimo)">' + o.otimo + "</td>" +
          '<td style="color:var(--bom)">' + o.bom + "</td>" +
          '<td style="color:var(--ruim)">' + o.ruim + "</td>" +
          "<td><strong>" + (o.indice === null ? "—" : o.indice + "/100") + "</strong></td></tr>"
        ).join("")
      : '<tr><td colspan="7" class="muted">Sem dados.</td></tr>';

    // o que melhorar (mais citados) — barras
    const lm = el("listaMelhorias");
    if (lm) {
      const ms = d.por_melhoria || [];
      const maxM = Math.max(1, ...ms.map((m) => m.qtd));
      lm.innerHTML = ms.length === 0
        ? '<p class="muted">Sem dados.</p>'
        : ms.map((m) =>
            '<div class="bar-row"><span class="name">' + escapeHtml(m.nome) + "</span>" +
            '<div class="bar-track"><div class="bar-fill bar-fill--ruim" style="width:' +
              Math.round((m.qtd / maxM) * 100) + '%"></div></div>' +
            '<span class="pct">' + m.qtd + "</span></div>"
          ).join("");
    }

    // comentários
    const lc = el("listaComentarios");
    if (lc) {
      const coms = d.comentarios || [];
      lc.innerHTML = coms.length === 0
        ? '<p class="muted">Sem comentários.</p>'
        : coms.map((c) => {
            const tags = Array.isArray(c.melhorias) && c.melhorias.length
              ? '<div class="coment-tags">' + c.melhorias.map((m) =>
                  '<span class="tag-melhoria">' + escapeHtml(m) + "</span>").join("") + "</div>"
              : "";
            const txt = c.comentario && c.comentario.trim()
              ? '<div class="coment-txt">' + escapeHtml(c.comentario) + "</div>" : "";
            return '<div class="coment-item">' +
              '<span class="pill ' + (PILL[c.valor] || "") + '">' + (LABELS[c.valor] || c.valor) + "</span> " +
              '<span class="coment-meta">' + fmtDate(c.criado_em) +
                (c.local_nome ? " · " + c.local_nome : "") + "</span>" +
              tags + txt + "</div>";
          }).join("");
    }

    // últimas respostas (com localidade e operador)
    el("tbody").innerHTML = d.ultimas.length === 0
      ? '<tr><td colspan="4" class="muted">Sem dados.</td></tr>'
      : d.ultimas.map((r) =>
          "<tr><td>" + fmtDate(r.criado_em) + "</td>" +
          '<td><span class="pill ' + (PILL[r.valor] || "") + '">' + (LABELS[r.valor] || r.valor) + "</span></td>" +
          "<td>" + (r.local_nome || '<span class="muted">—</span>') + "</td>" +
          "<td>" + (r.operador_nome || '<span class="muted">—</span>') + "</td></tr>"
        ).join("");

    const escopoTxt = d.escopo ? d.escopo.nome + " · " : "";
    el("metaInfo").textContent = escopoTxt + "Atualizado em " + fmtDate(d.atualizado_em) +
      " · " + d.total + " respostas · " + d.dispositivos + " totem(ns)";

    // botão de cadastro de usuários: só para administradores
    const ehAdmin = d.escopo && d.escopo.papel === "admin";
    const btnU = el("btnUsuarios");
    if (btnU) btnU.hidden = !ehAdmin;
    // admin não vota: esconde o atalho para a tela de votação
    const btnP = el("btnPesquisa");
    if (btnP) btnP.hidden = ehAdmin;

    // descrição do filtro ativo
    const fa = el("filtroAtivo");
    if (d.filtro && (d.filtro.de || d.filtro.ate)) {
      const de = d.filtro.de ? fmtDate(d.filtro.de) : "início";
      const ate = d.filtro.ate ? fmtDate(d.filtro.ate) : "agora";
      fa.textContent = "Filtro ativo: " + de + " → " + ate;
    } else {
      fa.textContent = "Sem filtro (mostrando todo o período).";
    }
  }

  // define o filtro a partir de um atalho e recarrega
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
    else if (preset === "tudo") { de = null; ate = null; }

    filtro.de = de ? de.toISOString() : null;
    filtro.ate = ate ? ate.toISOString() : null;
    el("fDe").value = de ? toLocalInput(de) : "";
    el("fAte").value = ate ? toLocalInput(ate) : "";
    marcarChip(preset);
    load();
  }

  function marcarChip(preset) {
    document.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("active", preset && c.dataset.preset === preset));
  }

  async function load() {
    if (!auth) { showLogin(); return; }
    try {
      const d = await fetchData();
      render(d);
    } catch (e) {
      if (String(e.message) === "401") {
        limparAuth();
        showLogin("Acesso negado. Verifique login e senha.");
      } else {
        el("metaInfo").textContent = "Falha ao carregar: " + e.message;
      }
    }
  }

  async function entrar() {
    const user = el("loginUser").value.trim();
    const senha = el("senha").value;
    el("loginErr").style.display = "none";
    if (!senha) return;
    el("btnEntrar").disabled = true;
    try {
      if (user) {
        // login de operador -> token assinado
        const res = await fetch(window.API.login, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: user, senha }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          el("loginErr").style.display = "block";
          el("loginErr").textContent = data.error || "Login ou senha inválidos.";
          return;
        }
        salvarAuth({ modo: "token", token: data.token });
      } else {
        // administrador-mestre: senha de administrador
        salvarAuth({ modo: "mestra", senha: senha });
      }
      load();
    } catch (e) {
      el("loginErr").style.display = "block";
      el("loginErr").textContent = "Erro de conexão.";
    } finally {
      el("btnEntrar").disabled = false;
    }
  }

  el("btnEntrar").addEventListener("click", entrar);
  el("senha").addEventListener("keydown", (e) => { if (e.key === "Enter") entrar(); });
  el("loginUser").addEventListener("keydown", (e) => { if (e.key === "Enter") el("senha").focus(); });

  el("btnRefresh").addEventListener("click", load);
  // Sair = logout completo (painel + sessão do operador) e volta à tela de login
  el("btnLogout").addEventListener("click", () => {
    limparAuth();
    sessionStorage.removeItem("admin_senha");
    localStorage.removeItem("operador");
    localStorage.removeItem("local_ativo");
    window.location.href = "login.html";
  });

  // presets de data/hora
  document.querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => aplicarPreset(c.dataset.preset)));

  // intervalo personalizado
  el("btnAplicar").addEventListener("click", () => {
    filtro.de = localToISO(el("fDe").value);
    filtro.ate = localToISO(el("fAte").value);
    filtro.local_id = el("fLocal").value || null;
    filtro.operador_id = el("fOperador").value || null;
    marcarChip(null);
    load();
  });
  el("btnLimpar").addEventListener("click", () => {
    filtro = { de: null, ate: null, local_id: null, operador_id: null };
    el("fDe").value = ""; el("fAte").value = ""; el("fLocal").value = ""; el("fOperador").value = "";
    marcarChip("tudo");
    load();
  });
  // trocar localidade ou operador aplica na hora
  el("fLocal").addEventListener("change", () => {
    filtro.local_id = el("fLocal").value || null;
    load();
  });
  el("fOperador").addEventListener("change", () => {
    filtro.operador_id = el("fOperador").value || null;
    load();
  });

  // auto-atualiza a cada 60s
  timer = setInterval(() => { if (auth) load(); }, 60000);

  load();
})();
