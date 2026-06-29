/*
 * Lógica da tela de pesquisa (totem/kiosk).
 * Registra a resposta localmente, mostra agradecimento e reinicia.
 */
(function () {
  // exige operador logado; senão, vai para a tela de login
  const operador = Sessao.exigir();
  if (!operador) return;

  // administrador não vota: redireciona ao painel de resultados
  if (operador.papel === "admin") { window.location.href = "painel-central.html"; return; }

  const options = document.querySelectorAll(".option");
  const thanks = document.getElementById("thanks");
  const localCount = document.getElementById("localCount");
  const pendingCount = document.getElementById("pendingCount");
  const syncBadge = document.getElementById("syncBadge");
  const operadorInfo = document.getElementById("operadorInfo");
  const localPicker = document.getElementById("localPicker");
  if (localPicker) localPicker.hidden = true; // localidade é definida no login

  // localidade escolhida no login (ou a única do operador, por compatibilidade)
  const ativo = Sessao.localAtivo() ||
    (operador.local_id ? { id: operador.local_id, nome: operador.local_nome } : null);

  // mostra operador e localidade no topo
  operadorInfo.textContent = operador.nome + " · " + (ativo ? ativo.nome : "(sem localidade)");

  const btnSair = document.getElementById("btnSair");
  if (btnSair) btnSair.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Sair do operador " + operador.nome + "?")) {
      Sessao.limpar();
      window.location.href = "login.html";
    }
  });

  let locked = false;

  async function refreshCounts() {
    const c = await DB.counts();
    localCount.textContent =
      c.total + (c.total === 1 ? " resposta neste aparelho" : " respostas neste aparelho");
    if (c.pendentes > 0 && Sync.isConfigured()) {
      pendingCount.textContent = c.pendentes + " aguardando envio";
    } else {
      pendingCount.textContent = "";
    }
  }

  function updateBadge(status) {
    if (!navigator.onLine) {
      syncBadge.textContent = "Offline";
      syncBadge.className = "badge offline";
      return;
    }
    if (!Sync.isConfigured()) {
      syncBadge.textContent = "Somente local";
      syncBadge.className = "badge";
      return;
    }
    syncBadge.textContent = "Online";
    syncBadge.className = "badge online";
  }

  const melhoriasTela = document.getElementById("melhoriasTela");
  const melhoriasOpcoes = document.getElementById("melhoriasOpcoes");
  const comentarioTela = document.getElementById("comentarioTela");
  const comentarioTexto = document.getElementById("comentarioTexto");
  let pendingValor = null;       // avaliação escolhida, aguardando os próximos passos
  let pendingMelhorias = [];     // itens marcados em "O que podemos melhorar?"
  let comentarioTimer = null;    // auto-conclui se ninguém interagir

  // 1) ao tocar numa opção: Ruim abre as melhorias; demais vão direto ao comentário
  function handleChoice(valor) {
    if (locked) return;
    locked = true;
    pendingValor = valor;
    pendingMelhorias = [];
    if (valor === "ruim") mostrarMelhorias();
    else mostrarComentario();
  }

  function reiniciarTimer(ms) {
    clearTimeout(comentarioTimer);
    comentarioTimer = setTimeout(() => finalizar(""), ms);
  }

  function mostrarMelhorias() {
    melhoriasOpcoes.querySelectorAll(".melhoria").forEach((b) => b.classList.remove("sel"));
    melhoriasTela.hidden = false;
    reiniciarTimer(45000);
  }

  function mostrarComentario() {
    comentarioTexto.value = "";
    comentarioTela.hidden = false;
    reiniciarTimer(30000);
  }

  // 2) salva a avaliação (com melhorias e comentário) e agradece
  async function finalizar(comentario) {
    if (pendingValor === null) return;
    clearTimeout(comentarioTimer);
    const valor = pendingValor;
    const melhorias = pendingMelhorias;
    pendingValor = null;
    pendingMelhorias = [];
    melhoriasTela.hidden = true;
    comentarioTela.hidden = true;
    try {
      await DB.add(valor, comentario, melhorias);
      await refreshCounts();
      if (Sync.isConfigured() && navigator.onLine) Sync.run("resposta");
    } catch (e) {
      console.error("Falha ao salvar resposta:", e);
    }
    showThanks();
  }

  function showThanks() {
    thanks.hidden = false;
    setTimeout(() => {
      thanks.hidden = true;
      locked = false;
    }, 2200);
  }

  options.forEach((btn) => {
    btn.addEventListener("click", () => handleChoice(btn.dataset.value));
  });

  // melhorias: alterna seleção e segue para o comentário
  melhoriasOpcoes.querySelectorAll(".melhoria").forEach((b) => {
    b.addEventListener("click", () => { b.classList.toggle("sel"); reiniciarTimer(45000); });
  });
  document.getElementById("btnMelhoriasContinuar").addEventListener("click", () => {
    pendingMelhorias = [...melhoriasOpcoes.querySelectorAll(".melhoria.sel")].map((b) => b.dataset.melhoria);
    melhoriasTela.hidden = true;
    mostrarComentario();
  });

  document.getElementById("btnSemComentario").addEventListener("click", () => finalizar(""));
  document.getElementById("btnComComentario").addEventListener("click", () => finalizar(comentarioTexto.value));

  Sync.onChange((status) => { updateBadge(status); refreshCounts(); });
  window.addEventListener("online", updateBadge);
  window.addEventListener("offline", updateBadge);

  // inicialização
  updateBadge();
  refreshCounts();
  Sync.start();

  // registra o service worker para funcionar offline
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) =>
      console.warn("Service worker não registrado:", e)
    );
  }
})();
