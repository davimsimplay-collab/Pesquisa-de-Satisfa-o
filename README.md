# Pesquisa de Satisfação

Aplicativo web (PWA) para coletar avaliações de satisfação em um totem/tablet, com **3 opções: Ótimo, Bom e Ruim**.

Funciona **offline**: as respostas são salvas no próprio aparelho e **sincronizadas automaticamente a cada hora** com o servidor quando há internet.

## Recursos

- 🟢 **Tela de pesquisa** estilo totem com botões grandes (Ótimo / Bom / Ruim)
- 📴 **Funciona offline** — service worker + IndexedDB no dispositivo
- 🔄 **Sincronização automática** a cada 1 hora (e ao reconectar à internet)
- 📊 **Painel de resultados** com totais, gráfico de distribuição e índice de satisfação
- 📥 **Exportação CSV** das respostas
- 📲 **Instalável** como app (PWA) no celular/tablet

## Acesso por login e localidade (multi-local)

A pesquisa agora exige **login de operador**, e cada resposta fica vinculada ao **operador** e à **localidade** dele. Assim os resultados ficam separados por login e por local.

**Fluxo:**
1. **Administração** (`cadastro.html`) — com a senha de administrador (`Satisfacao@2026`), cadastre **localidades** (ex.: Loja Centro, Filial Norte) e **operadores** (nome, login, senha, localidade).
2. **Login** (`login.html`) — em cada totem, o operador entra com login e senha. A partir daí o aparelho registra respostas vinculadas a ele e à sua localidade (funciona offline após o 1º login).
3. **Resultados** — o **Painel central** mostra tabelas **por localidade** e **por operador**, e um **filtro por localidade** (além do filtro por data/hora).

> Páginas: `login.html` (entrar), `cadastro.html` (admin), depois a pesquisa (`index.html`) já exige sessão.
>
> Backend: tabelas `pesquisa_locais` e `pesquisa_operadores` (RLS fechado — só o servidor acessa; senhas com hash + salt). Edge Functions: `pesquisa-login` (valida operador) e `pesquisa-admin` (cadastro, protegida pela senha de admin).

## Grupos de acesso aos resultados (papéis)

Cada operador pertence a um **grupo**, que define o que ele enxerga ao entrar no **Painel central** (`painel-central.html`) com seu login:

| Grupo | O que vê |
|---|---|
| **Administrador** | Resultados de **todos** os operadores |
| **Supervisor** | Resultados dos operadores **designados** a ele (marcados no cadastro) |
| **Gerente** | **Apenas os próprios** resultados |

- O grupo é escolhido no cadastro do operador. Para **Supervisor**, marque quais operadores ele acompanha (botão **Acessos** na lista, ou os checkboxes ao criar).
- **Cadastro a partir do painel:** quando um **Administrador** entra no Painel central, aparece o botão **👤 Cadastro de usuários**, que abre a tela de cadastro **já autenticada** (sem pedir senha de novo, usando o token do admin). O `cadastro.html` aceita o token de admin ou a senha de administrador.
- **Administrador-mestre:** no login do painel, deixe o campo *Login* em branco e use a senha de administrador (`Satisfacao@2026`) para acesso total.
- Tecnicamente: o login devolve um **token assinado (HMAC, validade 12h)**; o `painel-resultados` valida o token e filtra os dados conforme o papel. Tabela `pesquisa_supervisionados` liga supervisor → operadores.

## Como rodar

Os service workers exigem `http://` (não funcionam abrindo o arquivo direto). Use o servidor local incluído:

**Opção 1 — clique duplo:**
- Execute `iniciar.bat` (abre o navegador automaticamente).

**Opção 2 — terminal:**
```bash
python servidor.py 8080
```
> Use `servidor.py` (não o `http.server` padrão): ele envia `Cache-Control: no-cache`, garantindo que atualizações dos arquivos apareçam na hora, sem cache velho.
Depois acesse:
- Pesquisa (totem): http://localhost:8080/
- Painel: http://localhost:8080/admin.html

## Estrutura

```
index.html        Tela da pesquisa (totem)
admin.html        Painel de resultados
manifest.webmanifest  Configuração do PWA
sw.js             Service worker (offline)
css/styles.css    Estilos
js/config.js      Configuração da sincronização (backend)
js/db.js          Armazenamento local (IndexedDB)
js/sync.js        Motor de sincronização (1x/hora)
js/survey.js      Lógica da tela de pesquisa
js/admin.js       Lógica do painel
icons/icon.svg    Ícone do app
iniciar.bat       Atalho para iniciar o servidor (Windows)
```

## Onde ficam os dados

As respostas são **sempre salvas primeiro no aparelho** (IndexedDB do navegador) — por isso o app funciona offline. A cada hora (e ao reconectar à internet) as respostas pendentes são enviadas ao **Supabase**.

### Backend já configurado (Supabase)

- **Projeto:** `crm-simplay` (`aalcpxritnbstojlquxe`), região `sa-east-1`
- **Tabela:** `public.respostas_satisfacao`
  ```sql
  id          uuid primary key
  valor       text  -- 'otimo' | 'bom' | 'ruim'
  criado_em   timestamptz  -- quando o cliente respondeu
  dispositivo text         -- id único do aparelho
  recebido_em timestamptz  -- quando o servidor recebeu (default now())
  ```
- **Segurança (RLS):** a chave anônima (no `js/config.js`) **só pode inserir** respostas — não consegue ler nem alterar nenhum dado do CRM. A leitura para relatórios é liberada apenas para usuários autenticados.

A configuração já está em `js/config.js` (`enabled: true`).

## Painel Central (todos os totens)

Página `painel-central.html` — mostra o **consolidado de todos os aparelhos** em tempo real (atualiza a cada 60s): totais, distribuição, índice de satisfação, gráfico por dia, gráfico por hora do dia e últimas respostas. Acesse pelo botão "📊 Painel central" no painel local.

**Filtro por data e hora:** atalhos (Hoje, Ontem, Últimos 7/30 dias, Tudo) ou intervalo personalizado com campos *De* e *Até* (data + hora). A filtragem é feita no servidor (Edge Function) e recalcula todos os números e gráficos.

- É protegido por **senha**. Senha padrão: **`Satisfacao@2026`**
- Os dados são lidos por uma **Edge Function** (`painel-resultados`) que usa a chave de serviço **no servidor** — ela nunca vai para o navegador. A senha é a única credencial que trafega.

### Trocar a senha do painel

Defina o secret `PAINEL_SENHA` no projeto Supabase (Edge Functions → Secrets) com a senha desejada. Enquanto não for definido, vale a senha padrão acima. (A senha padrão está no código da função `painel-resultados`.)

### Ver os dados no Supabase

```sql
-- distribuição
select valor, count(*) from respostas_satisfacao group by valor;
-- índice de satisfação (0 a 100)
select round(avg(case valor when 'otimo' then 100 when 'bom' then 50 else 0 end)) as indice
from respostas_satisfacao;
```

## Personalização rápida

- **Pergunta:** edite o `<h1 class="question">` em `index.html`.
- **Cores:** variáveis no topo de `css/styles.css`.
- **Tempo de agradecimento:** `showThanks()` em `js/survey.js` (2200 ms).
