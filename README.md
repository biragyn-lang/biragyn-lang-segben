(Nome correto da empresa: Segbem)
SEGBEN - site estático (Cloudflare Workers, só assets)

## Como o site é montado
- `content/site.json`: o que o cliente edita (contato, contadores, clientes, depoimentos, cursos).
  Editado pelo Pages CMS (https://pagescms.org), configurado em `.pages.yml`.
- `src/`: modelos da home, da página de clientes e do chat, com marcadores `{{ ... }}` preenchidos com o site.json.
- `public/`: arquivos copiados como estão (img/, assets/, video/, _headers).
- `tools/build.mjs`: junta tudo em `dist/` e gera as páginas de curso, cursos.html, 404.html, sitemap.xml e robots.txt.
  Sem dependências, só Node 18+. Rodar: `node tools/build.mjs` (ou `npm run build`).

`dist/` não vai pro Git. O wrangler.jsonc publica `dist/` e roda o build sozinho antes de
`wrangler deploy` e `wrangler dev`.

## Pages CMS (edição pelo cliente)
1. Entrar em https://app.pagescms.org com a conta do GitHub que tem acesso ao repositório.
2. Abrir o repositório e a branch main. Aparece "Conteúdo do site" no menu.
3. Ao salvar, o Pages CMS faz um commit, e o deploy automático da Cloudflare (opção 3 abaixo) publica.
Logos sobem pra `public/img/clientes/`, fotos pra `public/img/`.
Se faltar um campo obrigatório no site.json, o build para com uma mensagem explicando o que falta,
e o site no ar continua o anterior.

## Publicar
Opção 1, CLI
  npx wrangler login
  npx wrangler deploy        (roda o build e publica)

Opção 2, testar local
  npx wrangler dev           (roda o build e abre em http://localhost:8787)

Opção 3, deploy automático pelo GitHub (necessário pro Pages CMS)
  Workers & Pages > projeto > Settings > Build > Connect to Git
  Build command: (vazio)   Deploy command: npx wrangler deploy
  O build já está no wrangler.jsonc, não precisa colocar nada no painel.

Arrastar a pasta pelo painel não funciona mais direto: rode `node tools/build.mjs` antes e arraste a pasta `dist`.

## Outras coisas
A imagem de compartilhamento sai de `python3 tools/og.py`.
Os textos fixos (serviços, brigada, perguntas frequentes, setores) continuam no HTML de `src/`
e, no caso do FAQ da página de cursos, em `tools/build.mjs`.

## Rollback
A versão anterior ao pacote de melhorias está na branch `backup-v1-antes-melhorias`.
A versão antes de enxugar a home está na branch `backup-v2-antes-enxugar`.
