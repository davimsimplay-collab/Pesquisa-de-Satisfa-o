/*
 * Configuração da sincronização com o servidor (backend).
 *
 * O app funciona 100% offline mesmo sem backend configurado:
 * as respostas ficam salvas no aparelho (IndexedDB). Quando um
 * endpoint é configurado abaixo, as respostas pendentes são
 * enviadas automaticamente a cada hora (e ao reconectar à internet).
 *
 * --- Como ligar a sincronização com Supabase ---
 * 1. Crie uma tabela "respostas" no Supabase com as colunas:
 *      id (uuid, pk), valor (text), criado_em (timestamptz), dispositivo (text)
 * 2. Em Project Settings > API copie a URL e a anon key.
 * 3. Preencha abaixo e troque enabled para true.
 */
window.SYNC_CONFIG = {
  enabled: true,

  // Supabase REST — projeto "crm-simplay", tabela "respostas_satisfacao".
  endpoint: "https://aalcpxritnbstojlquxe.supabase.co/rest/v1/respostas_satisfacao",

  // Chave pública (publishable) do Supabase. Pode ficar exposta no client:
  // a tabela tem RLS e só permite INSERT pela chave anônima.
  headers: {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbGNweHJpdG5ic3RvamxxdXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTg3ODQsImV4cCI6MjA4ODY3NDc4NH0.gVNDBcenBmbLnuvFCgkFtQnpAcM_-5IL7OFk1Q0MiXM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbGNweHJpdG5ic3RvamxxdXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTg3ODQsImV4cCI6MjA4ODY3NDc4NH0.gVNDBcenBmbLnuvFCgkFtQnpAcM_-5IL7OFk1Q0MiXM",
    // return=minimal: o servidor não devolve os dados inseridos
    "Prefer": "return=minimal",
  },

  // Intervalo de sincronização: 1 hora.
  syncIntervalMs: 60 * 60 * 1000,
};

// URLs das Edge Functions (login, administração e resultados).
window.API = {
  login: "https://aalcpxritnbstojlquxe.supabase.co/functions/v1/pesquisa-login",
  admin: "https://aalcpxritnbstojlquxe.supabase.co/functions/v1/pesquisa-admin",
  resultados: "https://aalcpxritnbstojlquxe.supabase.co/functions/v1/painel-resultados",
};
