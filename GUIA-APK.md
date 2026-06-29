# Como transformar a Pesquisa em app no celular (APK)

O app já é um **PWA** (app web instalável). Há 2 caminhos. Os dois precisam que o app esteja
publicado numa **URL HTTPS** (na internet). Use o arquivo **`pesquisa-satisfacao-web.zip`**.

---

## Passo 1 (comum aos dois) — Publicar o app numa URL HTTPS (grátis, sem instalar nada)

**Opção mais fácil — Netlify Drop:**
1. Abra <https://app.netlify.com/drop>
2. Arraste o arquivo **`pesquisa-satisfacao-web.zip`** para a página (ou descompacte e arraste a pasta).
3. Em segundos aparece uma URL tipo `https://algo-aleatorio.netlify.app`.
4. (Opcional) Crie uma conta grátis para a URL ficar permanente e poder trocar o nome.

> Alternativas: Cloudflare Pages (<https://pages.cloudflare.com>) ou Vercel (<https://vercel.com>) — mesma ideia de arrastar/soltar ou conectar um repositório.

Teste a URL no navegador: deve abrir a tela de **login**.

---

## Caminho A — Instalar como app (PWA) — MAIS SIMPLES, recomendado para totem

Não gera um arquivo .apk, mas instala como um app de verdade (ícone, tela cheia, offline).

1. No **Android**, abra a URL HTTPS no **Chrome**.
2. Menu (⋮) → **Instalar app** / **Adicionar à tela inicial**.
3. Pronto: vira um app com ícone, abre em tela cheia, funciona offline.

No iPhone/iPad: Safari → Compartilhar → **Adicionar à Tela de Início**.

**Modo totem (kiosk):** para travar o tablet só nesse app, use um app de kiosk
(ex.: "Fully Kiosk Browser") apontando para a URL — ótimo para o totem de satisfação.

---

## Caminho B — Gerar um APK de verdade (TWA, via PWABuilder) — sem Android Studio

1. Abra <https://www.pwabuilder.com>
2. Cole a sua URL HTTPS e clique **Start**.
3. Ele analisa o PWA (manifest + service worker — já temos). Ajuste ícones se quiser.
4. Aba **Android** → **Generate Package**.
5. Baixe o `.zip` com:
   - `app-release-signed.apk` (instalável direto no celular), e
   - `.aab` (para publicar na Google Play, se quiser).
6. Passe o `.apk` para o celular e instale (permita "instalar de fontes desconhecidas").

> Para o APK abrir **sem a barra do navegador**, o PWABuilder gera um arquivo
> `assetlinks.json`. Coloque-o em `/.well-known/assetlinks.json` no site publicado
> (o PWABuilder mostra o conteúdo e instruções). Sem isso o app funciona, mas pode
> mostrar uma barrinha de endereço.

---

## Caminho C — APK offline embutido (avançado, precisa de ferramentas)

Se quiser um APK que **embute os arquivos** (não depende de hospedagem), use
**Capacitor** ou **Cordova**. Requer instalar **Node.js** e **Android Studio**.
Resumo com Capacitor:

```bash
npm create @capacitor/app
# copie os arquivos do app para a pasta "www" / "dist"
npx cap add android
npx cap copy
npx cap open android   # abre no Android Studio para gerar o APK
```

> Mesmo embutido, login/sincronização continuam usando a internet (Supabase).
> As respostas são salvas offline e sincronizam quando houver conexão.

---

## Observações

- **Identidade visual / logo:** se quiser o ícone e a logo da ALIBRAS no app, me envie o
  arquivo da logo (PNG quadrado, de preferência 512×512) que eu configuro os ícones do PWA/APK.
- **Backend:** o app já aponta para o Supabase (projeto crm-simplay). Funciona de qualquer
  hospedagem, sem mudar nada.
- **Atualizações:** ao publicar uma versão nova do site, o app (PWA/TWA) se atualiza sozinho.
