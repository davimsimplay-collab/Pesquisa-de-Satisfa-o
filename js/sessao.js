/*
 * Sessão do operador logado (guardada localmente para funcionar offline).
 * Depois do login, o totem continua operando mesmo sem internet.
 */
window.Sessao = (function () {
  const KEY = "operador";

  return {
    get() {
      try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
      catch { return null; }
    },
    set(operador) {
      localStorage.setItem(KEY, JSON.stringify(operador));
    },
    limpar() {
      localStorage.removeItem(KEY);
      localStorage.removeItem("local_ativo");
    },

    // localidade atualmente selecionada no totem (quando o operador tem várias)
    localAtivo() {
      try { return JSON.parse(localStorage.getItem("local_ativo") || "null"); }
      catch { return null; }
    },
    setLocalAtivo(l) {
      if (l) localStorage.setItem("local_ativo", JSON.stringify(l));
      else localStorage.removeItem("local_ativo");
    },
    logado() {
      return !!this.get();
    },
    // garante login; se não houver, manda para a tela de login
    exigir() {
      if (!this.logado()) {
        window.location.href = "login.html";
        return null;
      }
      return this.get();
    },
  };
})();
