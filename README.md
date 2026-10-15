(Nome correto da empresa: Segbem)
SEGBEN - site estático (Cloudflare Workers, só assets)

## Como o site é montado
- `content/site.yml`: tudo que o cliente edita. Textos de todas as páginas, imagens, cores, ordem e
  visibilidade das seções da home, estilo de cada seção, contatos, contadores, clientes, depoimentos e cursos.
  Editado pelo Pages CMS (https://pagescms.org), configurado em `.pages.yml`.
- `src/`: modelos. `index.html` e `clientes.html` viram páginas; `src/_home/` tem uma seção da home por
  arquivo; `src/_partes/` tem o cabeçalho e o rodapé compartilhados; `src/assets/chat.js` recebe o WhatsApp.
- `public/`: copiado como está (img/, assets/, _headers). `public/assets/estilos.css` tem as variações de estilo.
- `tools/build.mjs`: junta tudo em `dist/` e gera as páginas de curso, cursos.html, 404.html, sitemap.xml e robots.txt.

Rodar: `npm install` (uma vez) e `npm run build`. `dist/` não vai pro Git.
O wrangler.jsonc publica `dist/` e roda o build sozinho antes de `wrangler deploy` e `wrangler dev`.

### Modelos
`{{ home.topo.titulo }}` insere texto do site.yml (escapado). Filtros: `| rt` texto formatado do CMS,
`| raw` HTML pronto, `| txt` tira a formatação, `| json`, `| wa` (link do WhatsApp com a mensagem),
`| img` (caminho de imagem). Blocos: `{{#each lista as item}}...{{/each}}` e `{{#if x}}...{{else}}...{{/if}}`.
Um campo que não existe no site.yml dá erro no build, pra pegar erro de digitação.

### Cores
O cliente escolhe a cor principal e a secundária (lista pronta ou código #rrggbb). O build calcula o tom
escuro dos fundos, as versões do modo escuro e a cor do texto por cima de cada uma (branco ou grafite,
o que tiver mais contraste), e avisa no log se a cor escolhida ficar com pouco contraste.
No HTML e no CSS as cores da marca são `var(--c-principal)`, `var(--c-destaque)`, `var(--c-escura)` etc.

### Imagens
Ficam em `public/img/` (é a pasta de mídia do CMS). O build acrescenta `?v=<hash>` em cada imagem e no
vídeo, então trocar um arquivo pelo mesmo nome aparece na hora, mesmo com o cache de 30 dias do `_headers`.
O build avisa se o site.yml apontar pra uma imagem que não existe.

## Pages CMS (edição pelo cliente)
1. Entrar em https://app.pagescms.org com a conta do GitHub que tem acesso ao repositório.
2. Abrir o repositório e a branch main. Aparece "Conteúdo do site" no menu.
3. Ao salvar, o Pages CMS faz um commit, e o deploy automático da Cloudflare publica.
Se faltar um campo obrigatório, o build para com uma mensagem explicando o que falta, e o site no ar
continua o anterior.

O Pages CMS hospedado não tem campo de cor com paleta visual; por isso a cor é uma lista de opções
mais um campo opcional pro código. Um seletor visual de verdade exigiria hospedar o Pages CMS e criar
um campo próprio (https://pagescms.org/docs/guides/creating-custom-field/).

## Publicar
Opção 1, CLI
  npx wrangler login
  npx wrangler deploy        (roda o build e publica)

Opção 2, testar local
  npx wrangler dev           (roda o build e abre em http://localhost:8787; refaz o build quando um arquivo muda)

Opção 3, deploy automático pelo GitHub (necessário pro Pages CMS)
  Workers & Pages > projeto > Settings > Build > Connect to Git
  Build command: (vazio)   Deploy command: npx wrangler deploy
  O build já está no wrangler.jsonc, não precisa colocar nada no painel.

Arrastar a pasta pelo painel não funciona direto: rode `npm run build` antes e arraste a pasta `dist`.

## Outras coisas
A imagem de compartilhamento sai de `python3 tools/og.py`.

## Rollback
A versão anterior ao pacote de melhorias está na branch `backup-v1-antes-melhorias`.
A versão antes de enxugar a home está na branch `backup-v2-antes-enxugar`.
