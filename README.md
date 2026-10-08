SEGBEN - site estático (Cloudflare Pages)

Pasta "public" = o que vai pro ar (index.html, clientes.html, img/, _headers). O wrangler.jsonc aponta pra ela, assim .git e README não são publicados.

Opção 1, painel (sem instalar nada)
  Cloudflare > Workers & Pages > Create > Pages > Upload assets
  Nome do projeto: segben  >  arrasta a pasta public  >  Deploy
  Sai em https://segben.pages.dev
  Domínio: no projeto > Custom domains > Set up a domain > segben.com.br (e www)

Opção 2, CLI
  npx wrangler login
  npx wrangler pages deploy ./public --project-name=segben

Opção 3, deploy automático pelo GitHub
  Pages > Connect to Git
  Build command: (vazio)   Deploy command: npx wrangler deploy (padrão do Workers Builds)

Pendências no HTML: [e-mail de contato], [@instagram], CNPJ, endereço, [+X] na página de clientes.

Logos dos clientes: PNG com fundo transparente em public/img/clientes/ com os nomes igel.png, camil.png, geo.png, real.png, caserato.png, dolcci.png, zello.png. Sem o arquivo, o site mostra o nome da empresa.
