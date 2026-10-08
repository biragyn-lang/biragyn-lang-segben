SEGBEN - site estático (Cloudflare Pages)

A raiz do repo é o que vai pro ar (index.html, clientes.html, img/, _headers).

Opção 1, painel (sem instalar nada)
  Cloudflare > Workers & Pages > Create > Pages > Upload assets
  Nome do projeto: segben  >  arrasta a pasta do repo  >  Deploy
  Sai em https://segben.pages.dev
  Domínio: no projeto > Custom domains > Set up a domain > segben.com.br (e www)

Opção 2, CLI
  npx wrangler login
  npx wrangler pages deploy . --project-name=segben

Opção 3, deploy automático pelo GitHub
  Pages > Connect to Git
  Build command: (vazio)   Output directory: /

Pendências no HTML: [e-mail de contato], [@instagram], CNPJ, endereço, [+X] na página de clientes.
