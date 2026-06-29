/*
 * Login do operador. Valida no servidor (Edge Function) e guarda a sessão
 * localmente. Depois disso o totem opera offline normalmente.
 */
(function () {
  const el = (id) => document.getElementById(id);

  // se já está logado, vai direto para a pesquisa
  if (Sessao.logado()) { window.location.href = "index.html"; return; }

  function mostrarErro(msg) {
    el("erro").hidden = false;
    el("erro").textContent = msg;
  }

  function atualizarOnline() {
    el("offlineAviso").hidden = navigator.onLine;
  }
  window.addEventListener("online", atualizarOnline);
  window.addEventListener("offline", atualizarOnline);
  atualizarOnline();

  // carrega só as localidades do operador informado no campo "login"
  let ultimoLoginCarregado = "";
  function placeholder(txt) { el("loginLocal").innerHTML = '<option value="">' + txt + "</option>"; }
  placeholder("Digite seu login acima");

  async function carregarLocaisDoOperador() {
    const login = el("login").value.trim().toLowerCase();
    if (!login) { placeholder("Digite seu login acima"); ultimoLoginCarregado = ""; return; }
    if (login === ultimoLoginCarregado) return; // evita refazer à toa
    ultimoLoginCarregado = login;
    placeholder("Carregando…");
    try {
      const res = await fetch(window.API.login + "?login=" + encodeURIComponent(login), { method: "GET" });
      const data = await res.json();
      const locais = data.locais || [];
      if (locais.length === 0) {
        placeholder("Nenhuma localidade para este login");
      } else if (locais.length === 1) {
        // operador de uma localidade: já seleciona
        el("loginLocal").innerHTML = '<option value="' + locais[0].id + '" selected>' + locais[0].nome + "</option>";
      } else {
        el("loginLocal").innerHTML = '<option value="">Selecione a localidade…</option>' +
          locais.map((l) => '<option value="' + l.id + '">' + l.nome + "</option>").join("");
      }
    } catch (e) {
      placeholder("Não foi possível carregar");
    }
  }

  // dispara ao sair do campo de login e com um pequeno atraso ao digitar
  let tmr = null;
  el("login").addEventListener("input", () => {
    clearTimeout(tmr);
    tmr = setTimeout(carregarLocaisDoOperador, 500);
  });
  el("login").addEventListener("blur", carregarLocaisDoOperador);

  async function entrar() {
    const login = el("login").value.trim();
    const senha = el("senha").value;
    const local_id = el("loginLocal").value;
    // só exige localidade se o operador tiver alguma (admin/sem localidade não precisa)
    const temLocalidade = [...el("loginLocal").options].some((o) => o.value);
    el("erro").hidden = true;
    if (!login || !senha) { mostrarErro("Preencha login e senha."); return; }
    if (temLocalidade && !local_id) { mostrarErro("Selecione a localidade."); return; }
    if (!navigator.onLine) { mostrarErro("Sem internet. Conecte-se para fazer o primeiro login."); return; }

    el("btnEntrar").disabled = true;
    el("btnEntrar").textContent = "Entrando…";
    try {
      const res = await fetch(window.API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha, local_id }),
      });
      const data = await res.json();
      if (!res.ok) { mostrarErro(data.error || "Falha ao entrar."); return; }
      Sessao.set(data.operador);
      Sessao.setLocalAtivo(data.local_ativo || null);
      // administrador não vota: vai direto ao painel, já autenticado
      if (data.operador.papel === "admin") {
        sessionStorage.setItem("painel_auth", JSON.stringify({ modo: "token", token: data.token }));
        window.location.href = "painel-central.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (e) {
      mostrarErro("Erro de conexão. Tente novamente.");
    } finally {
      el("btnEntrar").disabled = false;
      el("btnEntrar").textContent = "Entrar";
    }
  }

  el("btnEntrar").addEventListener("click", entrar);
  el("senha").addEventListener("keydown", (e) => { if (e.key === "Enter") entrar(); });
  el("login").addEventListener("keydown", (e) => { if (e.key === "Enter") el("senha").focus(); });
})();
