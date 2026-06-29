/*
 * Administração: cadastro de localidades e operadores.
 * Protegido pela senha de administrador (mesma do painel central).
 */
(function () {
  const el = (id) => document.getElementById(id);
  let cache = { locais: [], operadores: [] };

  // auth: { modo:'senha', senha } OU { modo:'token', token }
  // Se o usuário veio do painel central logado como admin, reaproveita o token.
  let auth = null;
  const senhaSalva = sessionStorage.getItem("admin_senha");
  if (senhaSalva) {
    auth = { modo: "senha", senha: senhaSalva };
  } else {
    try {
      const pa = JSON.parse(sessionStorage.getItem("painel_auth") || "null");
      if (pa && pa.modo === "token" && pa.token) auth = { modo: "token", token: pa.token };
      else if (pa && pa.modo === "mestra" && pa.senha) auth = { modo: "senha", senha: pa.senha };
    } catch { /* ignora */ }
  }

  function authHeaders() {
    if (!auth) return {};
    return auth.modo === "token" ? { "x-token": auth.token } : { "x-senha-admin": auth.senha };
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  async function api(acao, payload) {
    const res = await fetch(window.API.admin, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ acao, ...(payload || {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { throw new Error("401"); }
    if (!res.ok) throw new Error(data.error || "Erro " + res.status);
    return data;
  }

  function mostrarLogin(msg) {
    el("login").hidden = false;
    el("conteudo").hidden = true;
    el("btnSair").hidden = true;
    if (msg) { el("loginErr").style.display = "block"; el("loginErr").textContent = msg; }
  }

  let editandoLocalId = null; // id da localidade em edição inline

  function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  function renderLocais() {
    el("tbodyLocais").innerHTML = cache.locais.length === 0
      ? '<tr><td colspan="3" class="muted">Nenhuma localidade cadastrada.</td></tr>'
      : cache.locais.map((l) => {
          if (l.id === editandoLocalId) {
            return "<tr><td><input class='edit-inline' id='editLocalInput' value='" + escapeAttr(l.nome) + "'></td>" +
              "<td>" + fmtDate(l.criado_em) + "</td>" +
              '<td style="white-space:nowrap">' +
                '<button class="btn btn--primary btn-mini" data-salvar-local="' + l.id + '">Salvar</button> ' +
                '<button class="btn btn-mini" data-cancelar-local="1">Cancelar</button></td></tr>';
          }
          return "<tr><td><strong>" + l.nome + "</strong></td>" +
            "<td>" + fmtDate(l.criado_em) + "</td>" +
            '<td style="white-space:nowrap">' +
              '<button class="btn btn-mini" data-edit-local="' + l.id + '">Editar</button> ' +
              '<button class="btn btn--danger btn-mini" data-del-local="' + l.id + '">Excluir</button></td></tr>';
        }).join("");

    // popular os checkboxes de localidades do formulário de novo operador
    locaisCheckboxes("opLocais", []);

    el("tbodyLocais").querySelectorAll("[data-del-local]").forEach((b) =>
      b.addEventListener("click", () => excluirLocal(b.dataset.delLocal)));
    el("tbodyLocais").querySelectorAll("[data-edit-local]").forEach((b) =>
      b.addEventListener("click", () => { editandoLocalId = b.dataset.editLocal; mostrarLocalErro(null); renderLocais(); el("editLocalInput").focus(); }));
    el("tbodyLocais").querySelectorAll("[data-cancelar-local]").forEach((b) =>
      b.addEventListener("click", () => { editandoLocalId = null; renderLocais(); }));
    el("tbodyLocais").querySelectorAll("[data-salvar-local]").forEach((b) =>
      b.addEventListener("click", () => salvarLocal(b.dataset.salvarLocal)));
    const inp = el("editLocalInput");
    if (inp) inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") salvarLocal(editandoLocalId);
      if (e.key === "Escape") { editandoLocalId = null; renderLocais(); }
    });
  }

  async function salvarLocal(id) {
    const nome = (el("editLocalInput").value || "").trim();
    if (!nome) { mostrarLocalErro("Informe o nome da localidade."); return; }
    try {
      await api("editar_local", { id, nome });
      editandoLocalId = null;
      carregar();
    } catch (e) {
      mostrarLocalErro(e.message === "401" ? "Sessão expirada." : e.message);
    }
  }

  const PAPEL_LABEL = {
    admin: '<span class="pill pill--admin">Administrador</span>',
    supervisor: '<span class="pill pill--supervisor">Supervisor</span>',
    gerente: '<span class="pill pill--gerente">Gerente</span>',
  };

  function renderOperadores() {
    el("tbodyOperadores").innerHTML = cache.operadores.length === 0
      ? '<tr><td colspan="5" class="muted">Nenhum operador cadastrado.</td></tr>'
      : cache.operadores.map((o) => {
          const grupo = (PAPEL_LABEL[o.papel] || o.papel) +
            (o.papel === "supervisor"
              ? ' <span class="muted">(' + (o.supervisionados ? o.supervisionados.length : 0) + ")</span>"
              : "");
          const btnAcessos = o.papel === "supervisor"
            ? '<button class="btn btn-mini" data-acessos="' + o.id + '">Acessos</button> '
            : "";
          const locaisTxt = (o.locais && o.locais.length)
            ? o.locais.map((l) => l.nome).join(", ")
            : '<span class="muted">—</span>';
          return "<tr><td><strong>" + o.nome + "</strong></td>" +
            "<td>" + o.login + "</td>" +
            "<td>" + grupo + "</td>" +
            "<td>" + locaisTxt + "</td>" +
            '<td style="white-space:nowrap">' +
              '<button class="btn btn-mini" data-edit-op="' + o.id + '">Editar</button> ' + btnAcessos +
              '<button class="btn btn-mini" data-senha="' + o.id + '">Senha</button> ' +
              '<button class="btn btn--danger btn-mini" data-del-op="' + o.id + '">Excluir</button>' +
            "</td></tr>";
        }).join("");

    el("tbodyOperadores").querySelectorAll("[data-del-op]").forEach((b) =>
      b.addEventListener("click", () => excluirOperador(b.dataset.delOp)));
    el("tbodyOperadores").querySelectorAll("[data-senha]").forEach((b) =>
      b.addEventListener("click", () => trocarSenha(b.dataset.senha)));
    el("tbodyOperadores").querySelectorAll("[data-acessos]").forEach((b) =>
      b.addEventListener("click", () => abrirAcessos(b.dataset.acessos)));
    el("tbodyOperadores").querySelectorAll("[data-edit-op]").forEach((b) =>
      b.addEventListener("click", () => abrirEditarOperador(b.dataset.editOp)));
  }

  // ---- edição de operador (painel) ----
  let editOpId = null;
  function abrirEditarOperador(id) {
    const o = cache.operadores.find((x) => x.id === id);
    if (!o) return;
    editOpId = id;
    el("edNome").value = o.nome;
    el("edLogin").value = o.login;
    el("edPapel").value = o.papel;
    locaisCheckboxes("edLocais", o.local_ids || []);
    el("edErr").style.display = "none";
    el("painelEditarOp").hidden = false;
    el("painelEditarOp").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function salvarEditarOperador() {
    const nome = el("edNome").value.trim();
    const login = el("edLogin").value.trim();
    const papel = el("edPapel").value;
    const local_ids = idsMarcados("edLocais");
    el("edErr").style.display = "none";
    if (!nome || !login) { el("edErr").style.display = "block"; el("edErr").textContent = "Preencha nome e login."; return; }
    try {
      await api("editar_operador", { id: editOpId, nome, login, papel, local_ids });
      el("painelEditarOp").hidden = true;
      carregar();
    } catch (e) {
      el("edErr").style.display = "block";
      el("edErr").textContent = e.message === "401" ? "Sessão expirada." : e.message;
    }
  }

  // checkboxes de localidades (operador pode pertencer a várias)
  function locaisCheckboxes(containerId, marcados) {
    const sel = new Set(marcados || []);
    el(containerId).innerHTML = cache.locais.length === 0
      ? '<span class="muted">Cadastre localidades primeiro.</span>'
      : cache.locais.map((l) =>
          '<label class="chk"><input type="checkbox" value="' + l.id + '"' +
          (sel.has(l.id) ? " checked" : "") + "> " + l.nome + "</label>"
        ).join("");
  }

  // checkboxes de operadores (para supervisor escolher quem vê)
  function checkboxesOperadores(containerId, marcados, excluirId) {
    const sel = new Set(marcados || []);
    const lista = cache.operadores.filter((o) => o.id !== excluirId);
    el(containerId).innerHTML = lista.length === 0
      ? '<span class="muted">Cadastre operadores primeiro.</span>'
      : lista.map((o) =>
          '<label class="chk"><input type="checkbox" value="' + o.id + '"' +
          (sel.has(o.id) ? " checked" : "") + "> " + o.nome +
          ' <span class="muted">(' + o.login + ")</span></label>"
        ).join("");
  }
  function idsMarcados(containerId) {
    return [...el(containerId).querySelectorAll("input:checked")].map((i) => i.value);
  }

  // painel de edição de acessos de um supervisor existente
  let acessosId = null;
  function abrirAcessos(id) {
    const op = cache.operadores.find((o) => o.id === id);
    if (!op) return;
    acessosId = id;
    el("acessosNome").textContent = op.nome;
    checkboxesOperadores("acessosLista", op.supervisionados, id);
    el("painelAcessos").hidden = false;
    el("painelAcessos").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function salvarAcessos() {
    try {
      await api("definir_supervisionados", { id: acessosId, supervisionados: idsMarcados("acessosLista") });
      el("painelAcessos").hidden = true;
      carregar();
    } catch (e) { alert("Erro: " + e.message); }
  }

  async function carregar() {
    if (!auth) { mostrarLogin(); return; }
    try {
      const data = await api("listar");
      cache = data;
      el("login").hidden = true;
      el("conteudo").hidden = false;
      el("btnSair").hidden = false;
      el("metaInfo").textContent =
        cache.locais.length + " localidade(s) · " + cache.operadores.length + " operador(es).";
      renderLocais();
      renderOperadores();
    } catch (e) {
      if (e.message === "401") {
        // token de não-admin ou senha incorreta: volta ao login por senha
        sessionStorage.removeItem("admin_senha");
        auth = null;
        mostrarLogin(senhaSalva ? "Senha incorreta." : "Faça login como administrador.");
      } else {
        el("metaInfo").textContent = "Falha: " + e.message;
      }
    }
  }

  function mostrarLocalErro(msg) {
    const e = el("localErr");
    if (!msg) { e.hidden = true; e.textContent = ""; return; }
    e.hidden = false; e.textContent = msg;
  }

  async function addLocal() {
    const nome = el("novoLocal").value.trim();
    mostrarLocalErro(null);
    if (!nome) { mostrarLocalErro("Informe o nome da localidade."); return; }
    try {
      await api("criar_local", { nome });
      el("novoLocal").value = "";
      carregar();
    } catch (e) {
      mostrarLocalErro(e.message === "401" ? "Sessão expirada. Entre novamente." : e.message);
    }
  }

  async function excluirLocal(id) {
    if (!confirm("Excluir esta localidade? Operadores ligados a ela ficarão sem localidade.")) return;
    try { await api("excluir_local", { id }); carregar(); }
    catch (e) { alert("Erro: " + e.message); }
  }

  async function addOperador() {
    const nome = el("opNome").value.trim();
    const login = el("opLogin").value.trim();
    const senhaOp = el("opSenha").value;
    const local_ids = idsMarcados("opLocais");
    const papel = el("opPapel").value;
    el("formErr").style.display = "none";
    if (!nome || !login || senhaOp.length < 4) {
      el("formErr").style.display = "block";
      el("formErr").textContent = "Preencha nome, login e senha (mín. 4 caracteres).";
      return;
    }
    const payload = { nome, login, senha: senhaOp, local_ids, papel };
    if (papel === "supervisor") payload.supervisionados = idsMarcados("supervisaoLista");
    try {
      await api("criar_operador", payload);
      el("opNome").value = ""; el("opLogin").value = ""; el("opSenha").value = "";
      el("opPapel").value = "gerente"; el("supervisaoNovo").hidden = true;
      carregar();
    } catch (e) {
      el("formErr").style.display = "block";
      el("formErr").textContent = "Erro: " + e.message;
    }
  }

  async function excluirOperador(id) {
    if (!confirm("Excluir este operador? Ele não poderá mais fazer login.")) return;
    try { await api("excluir_operador", { id }); carregar(); }
    catch (e) { alert("Erro: " + e.message); }
  }

  async function trocarSenha(id) {
    const nova = prompt("Nova senha (mín. 4 caracteres):");
    if (nova === null) return;
    if (nova.length < 4) { alert("Senha muito curta."); return; }
    try { await api("redefinir_senha", { id, senha: nova }); alert("Senha atualizada."); }
    catch (e) { alert("Erro: " + e.message); }
  }

  el("btnEntrar").addEventListener("click", () => {
    const s = el("senhaAdmin").value.trim();
    if (!s) return;
    auth = { modo: "senha", senha: s };
    sessionStorage.setItem("admin_senha", s);
    el("loginErr").style.display = "none";
    carregar();
  });
  el("senhaAdmin").addEventListener("keydown", (e) => { if (e.key === "Enter") el("btnEntrar").click(); });
  el("btnSair").addEventListener("click", () => {
    sessionStorage.removeItem("admin_senha"); auth = null;
    mostrarLogin();
  });
  el("btnAddLocal").addEventListener("click", addLocal);
  el("novoLocal").addEventListener("keydown", (e) => { if (e.key === "Enter") addLocal(); });
  el("novoLocal").addEventListener("input", () => mostrarLocalErro(null));
  el("btnAddOperador").addEventListener("click", addOperador);

  // mostra a lista de supervisionados quando o papel for "supervisor"
  el("opPapel").addEventListener("change", () => {
    const ehSup = el("opPapel").value === "supervisor";
    el("supervisaoNovo").hidden = !ehSup;
    if (ehSup) checkboxesOperadores("supervisaoLista", [], null);
  });

  el("btnSalvarAcessos").addEventListener("click", salvarAcessos);
  el("btnFecharAcessos").addEventListener("click", () => { el("painelAcessos").hidden = true; });

  el("btnSalvarEdicao").addEventListener("click", salvarEditarOperador);
  el("btnCancelarEdicao").addEventListener("click", () => { el("painelEditarOp").hidden = true; });

  carregar();
})();
