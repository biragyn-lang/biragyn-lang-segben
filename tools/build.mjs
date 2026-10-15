// Monta o site em dist/ a partir de content/site.json (editado pelo Pages CMS).
// Uso: node tools/build.mjs        (sem dependências, só Node 18+)
//
// 1. copia public/ (imagens, css, js, vídeo, _headers) pra dist/
// 2. preenche os marcadores {{ ... }} dos modelos em src/ (home, clientes, chat)
// 3. gera as páginas de curso, cursos.html, 404.html, sitemap.xml e robots.txt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://segbemsst.com.br';

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));

// ---------------------------------------------------------------- utilidades
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const img = p => String(p || '').trim().replace(/^\/+/, '');
const digits = s => String(s || '').replace(/\D/g, '');
const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fail = msg => { console.error('Erro no content/site.json: ' + msg); process.exit(1); };

// json.dumps do Python (separadores ", " e ": "), pra manter o JSON-LD igual ao de antes
function pyjson(v) {
  if (Array.isArray(v)) return '[' + v.map(pyjson).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyjson(x)).join(', ') + '}';
  return JSON.stringify(v);
}

function render(tpl, vars, file) {
  return tpl.replace(/\{\{\s*(\w+)\s*(?:\|\s*(raw|json))?\s*\}\}/g, (_, k, f) => {
    if (!(k in vars)) throw new Error(`${file}: marcador desconhecido {{ ${k} }}`);
    return f === 'raw' ? vars[k] : f === 'json' ? JSON.stringify(vars[k]) : esc(vars[k]);
  });
}

// ---------------------------------------------------------------- contato
const C = DATA.contato || fail('falta o bloco "contato"');
for (const k of ['whatsapp', 'email', 'endereco', 'cidade', 'uf', 'cep']) if (!String(C[k] || '').trim()) fail(`contato.${k} está vazio`);
const telDigits = digits(C.whatsapp);
const WA = telDigits.startsWith('55') && telDigits.length > 11 ? telDigits : '55' + telDigits;
const telLocal = String(C.whatsapp).trim().replace(/^\+?55\s*/, '');
const instagram = String(C.instagram || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');

const VARS = {
  wa: WA,
  whatsapp: telLocal,
  ld_telefone: '+55 ' + telLocal.replace(/^\((\d\d)\)\s*/, '$1 '),
  email: C.email.trim(),
  cnpj: String(C.cnpj || '').trim(),
  endereco: C.endereco.trim(),
  cidade: C.cidade.trim(),
  uf: C.uf.trim(),
  cep: C.cep.trim(),
  endereco_completo: `${C.endereco.trim()}, ${C.cidade.trim()}/${C.uf.trim()}, CEP ${C.cep.trim()}`,
  instagram,
  instagram_url: `https://www.instagram.com/${instagram}/`,
  google: String(C.google || '').trim(),
};

// ---------------------------------------------------------------- clientes
const CLIENTES = (DATA.clientes || []).map((c, i) => {
  if (!String(c.nome || '').trim()) fail(`o cliente nº ${i + 1} está sem nome`);
  return { ...c, nome: c.nome.trim(), logo: img(c.logo), foto: img(c.foto) };
});

VARS.logos = CLIENTES.filter(c => c.faixa_home !== false).map(c => {
  if (!c.logo) return `<span class="cl nologo"><b>${esc(c.nome)}</b></span>`;
  const h = +c.altura_logo || 60;
  return `<span class="cl"><img src="${esc(c.logo)}" alt="${esc(c.nome)}" height="${h}" style="height: ${h}px" onerror="this.parentNode.classList.add('nologo');this.remove()"><b>${esc(c.nome)}</b></span>`;
}).join('');

VARS.cards_clientes = CLIENTES.filter(c => c.pagina_clientes !== false).map(c => {
  let top;
  if (c.foto) {
    const pos = c.foto_ajuste !== undefined && c.foto_ajuste !== null && c.foto_ajuste !== '' ? ` object-position: center ${+c.foto_ajuste}%;` : '';
    top = `<div style="height: 260px; overflow: hidden;"><img class="card-img" src="${esc(c.foto)}" alt="${esc(c.foto_descricao || 'Turma da ' + c.nome)}" style="width: 100%; height: 100%; object-fit: cover;${pos} display: block;"></div>`;
  } else if (c.logo) {
    top = `<div style="height: 260px; overflow: hidden; background: #eef2ee; display: flex; align-items: center; justify-content: center;"><img class="card-img" src="${esc(c.logo)}" alt="Logo da ${esc(c.nome)}" style="height: 150px; width: auto; display: block;"></div>`;
  } else {
    top = `<div style="height: 260px; background: #14201a; display: flex; align-items: center; justify-content: center; padding: 0 24px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 44px; line-height: 1; text-align: center; text-transform: uppercase; color: #f2c200;">${esc(c.nome)}</span></div>`;
  }
  const seg = c.segmento ? `\n<div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);">${esc(c.segmento)}</div>` : '';
  const tag = c.destaque ? `\n<div style="display: flex; flex-wrap: wrap; gap: 6px;"><span style="background: var(--tag-bg); color: var(--tag-ink); font-weight: 600; font-size: 13px; padding: 6px 10px; border-radius: 4px;">${esc(c.destaque)}</span></div>` : '';
  return `<article class="card" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
${top}
<div style="padding: 24px 26px 28px; display: flex; flex-direction: column; gap: 10px;">${seg}
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 32px; text-transform: uppercase; line-height: 1;">${esc(c.nome)}</h2>${tag}
</div>
</article>`;
}).join('\n\n');

// ---------------------------------------------------------------- contadores
VARS.contadores = (DATA.contadores || []).map(c => {
  const n = Math.round(+c.numero || 0);
  return `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 52px; color: #f2c200; line-height: 1;"><span data-count="${n}">+${n.toLocaleString('pt-BR')}</span></span><span style="font-size: 15px; color: #d5e4d8;">${esc(c.texto)}</span></div>`;
}).join('\n');

// ---------------------------------------------------------------- depoimentos
// Três colunas que sobem no PC (distribuídas 1-2-3, 1-2-3...) e uma coluna só no celular.
// Cada coluna repete os cards (aria-hidden) pra animação dar a volta sem emenda.
const STAR = fill => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;
const G_ICON = '<span style="color: var(--muted);"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg></span>';
const AVATAR = ['#17752f', '#0d3b24', '#b88a00', '#2d5a3d'];
const DEPO = (DATA.depoimentos || []).filter(d => String(d.texto || '').trim()).map((d, i) => ({
  ...d,
  nome: String(d.nome || 'Cliente').trim(),
  origem: String(d.origem ?? 'Avaliação no Google').trim(),
  estrelas: Math.max(1, Math.min(5, Math.round(+d.estrelas || 5))),
  cor: AVATAR[i % AVATAR.length],
}));
function depoCard(d, dup) {
  const ini = d.nome.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const stars = Array.from({ length: 5 }, (_, i) => STAR(i < d.estrelas ? '#f2c200' : 'var(--line)')).join('');
  return `<figure class="tms-card"${dup ? ' aria-hidden="true"' : ''} style="margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 28px 28px 22px; display: flex; flex-direction: column; gap: 16px;">
<div style="display: flex; gap: 2px;" aria-label="${d.estrelas} de 5 estrelas">${stars}</div>
<blockquote style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--ink); flex: 1;">${esc(d.texto.trim())}</blockquote>
<figcaption style="display: flex; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line);">
<span aria-hidden="true" style="width: 40px; height: 40px; border-radius: 50%; background: ${d.cor}; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex: none;">${esc(ini)}</span>
<span style="display: flex; flex-direction: column; line-height: 1.25; flex: 1; min-width: 0;"><strong style="font-size: 15px;">${esc(d.nome)}</strong><span style="font-size: 13px; color: var(--muted);">${esc(d.origem)}</span></span>${/google/i.test(d.origem) ? '\n' + G_ICON : ''}
</figcaption>
</figure>`;
}
function depoCol(cls, segPorCard, lista) {
  const dur = Math.round(segPorCard * lista.length);
  const cards = [...lista.map(d => depoCard(d, false)), ...lista.map(d => depoCard(d, true))].join('\n');
  return `<div class="tms-col ${cls}" style="--dur: ${dur}s;"><div class="tms-track">\n${cards}\n</div></div>`;
}
VARS.depoimentos = [
  depoCol('tms-a', 17, DEPO.filter((_, i) => i % 3 === 0)),
  depoCol('tms-b', 23, DEPO.filter((_, i) => i % 3 === 1)),
  depoCol('tms-c', 19, DEPO.filter((_, i) => i % 3 === 2)),
  depoCol('tms-m', 70 / 6, DEPO),
].join('\n');

// ---------------------------------------------------------------- cursos
const CURSOS = (DATA.cursos || []).map((c, i) => {
  for (const k of ['codigo', 'nome', 'descricao', 'carga_horaria', 'validade']) if (!String(c[k] || '').trim()) fail(`o curso nº ${i + 1} (${c.nome || c.codigo || 'sem nome'}) está sem "${k}"`);
  return {
    slug: slugify(c.pagina || '') || 'curso-' + slugify(c.codigo),
    code: c.codigo.trim(), nome: c.nome.trim(), foto: img(c.foto) || null,
    titulo: c.codigo_no_titulo === false ? c.nome.trim() : `${c.codigo.trim()} ${c.nome.trim()}`,
    lead: c.descricao.trim(), carga: c.carga_horaria.trim(), reciclagem: c.validade.trim(),
    quando: String(c.observacao || '').trim(),
    publico: (c.publico || []).filter(Boolean), conteudo: (c.conteudo || []).filter(Boolean),
    pratica: String(c.pratica || '').trim() || null,
    home: !!c.home, nome_curto: String(c.nome_curto || '').trim() || c.nome.trim(),
    resumo: String(c.resumo || '').trim(), foto_descricao: String(c.foto_descricao || '').trim(),
  };
});
const slugs = CURSOS.map(c => c.slug);
for (const s of slugs) if (slugs.indexOf(s) !== slugs.lastIndexOf(s)) fail(`dois cursos com a mesma página "${s}"`);
const OUTROS = (DATA.outros_cursos || []).filter(Boolean);

VARS.cards_cursos = CURSOS.filter(c => c.home).map(c => {
  const top = c.foto
    ? `<div style="height: 220px; overflow: hidden;"><img class="card-img" src="${esc(c.foto)}" alt="${esc(c.foto_descricao)}" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
    : `<div style="height: 220px; background: #14201a; display: flex; align-items: center; justify-content: center;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 72px; color: #f2c200;">${esc(c.code)}</span></div>`;
  return `<a class="card" href="${c.slug}.html" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; text-decoration: none; color: inherit;">
${top}
<div style="padding: 22px 24px 26px; display: flex; flex-direction: column; gap: 6px;"><div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">${esc(c.code)}</div><h3 style="margin: 0; font-size: 20px; font-weight: 700;">${esc(c.nome_curto)}</h3><p style="margin: 0; font-size: 15px; line-height: 1.5; color: var(--muted);">${esc(c.resumo)}</p></div>
</a>`;
}).join('\n');

// ---------------------------------------------------------------- saída
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), text); };

// modelos em src/ (home, clientes, chat...)
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(path.join(ROOT, 'src'))) {
  const rel = path.relative(path.join(ROOT, 'src'), f).split(path.sep).join('/');
  write(rel, render(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), VARS, rel));
}

// ---------------------------------------------------------------- páginas de curso (antigo tools/cursos.py)
// O <style>, o script do tema, o cabeçalho e o rodapé são copiados da home já montada.
const home = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const STYLE = home.match(/<style>[\s\S]*?<\/style>/)[0];
const THEME = home.match(/<script>\(function\(\)\{var t;try[\s\S]*?<\/script>/)[0];
const HEADER = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
const FOOTER = home.match(/<footer[\s\S]*?<\/footer>/)[0];
const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>';
const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; margin-top: 2px; color: var(--brand-ink);"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const wa = msg => `https://wa.me/${WA}?text=` + msg.replace(/%/g, '%25').replace(/ /g, '%20').replace(/!/g, '%21').replace(/,/g, '%2C');

function header(active) {
  let h = HEADER.split(' aria-current="page"').join('');
  if (active) h = h.replace(`<a href="${active}">`, `<a href="${active}" aria-current="page">`);
  return h;
}

function page(slug, title, desc, body, { active = null, ld = null, image = 'img/og.jpg', noindex = false } = {}) {
  const url = slug === 'index' ? `${SITE}/` : `${SITE}/${slug}`;
  const extraLd = ld ? `\n<script type="application/ld+json">${pyjson(ld)}</script>` : '';
  const robots = noindex ? '\n<meta name="robots" content="noindex">' : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${robots}
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/${image}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d3b24">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/png" href="img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&amp;family=Barlow:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
${STYLE}
${THEME}
<link rel="stylesheet" href="assets/theme.css">
<link rel="stylesheet" href="assets/anim.css">
<link rel="stylesheet" href="assets/chat.css">${extraLd}
</head>
<body>
<div style="font-family: 'Barlow', system-ui, sans-serif; color: var(--ink); background: var(--surface); min-height: 100%;">

${header(active)}

${body}

${FOOTER}

</div>
<script src="assets/anim.js" defer></script>
<script src="assets/chat.js" defer></script>
</body>
</html>
`;
}

const FAQ = [
  ['O certificado vale na fiscalização?', 'Vale. O certificado sai com o que a norma pede: nome do trabalhador, conteúdo, carga horária, data, local, instrutor e assinatura do responsável técnico. Junto vão a lista de presença e o registro da parte prática.'],
  ['Qual a diferença entre capacitado e autorizado?', 'Capacitado é quem fez o treinamento. Autorizado é quem, além de capacitado e apto no exame médico, recebeu autorização formal da empresa pra fazer aquela atividade. Em NRs como a 10, a 33 e a 35, o trabalhador só pode executar o serviço se estiver autorizado.'],
  ['De quanto em quanto tempo precisa reciclar?', 'Depende da norma. A NR-35 pede reciclagem a cada 2 anos, a NR-10 também, e a NR-33 todo ano. Também precisa refazer quando muda o procedimento ou a função, ou quando o trabalhador fica afastado por mais de 90 dias. A gente avisa a empresa quando estiver chegando a hora.'],
  ['Vocês fazem o treinamento dentro da minha empresa?', 'Sim. A maior parte das turmas é in company, com a parte prática feita nos equipamentos e no ambiente da própria empresa. Também organizamos turmas presenciais.'],
  ['Tem número mínimo de pessoas pra turma in company?', 'Depende do curso e da logística. Chama no WhatsApp com o curso e a quantidade de pessoas que a gente monta a proposta certa pra você.'],
  ['Atendem fora de Goiânia?', 'Sim. Temos clientes em Goiás, Tocantins, Maranhão e Mato Grosso. Pra outras regiões, fala com a gente que avaliamos.'],
  ['Como funciona o orçamento?', 'É só chamar no WhatsApp ou usar o atendimento no canto da tela. Com o curso, a quantidade de pessoas e a cidade, a gente já consegue te passar uma proposta.'],
];

function faqBlock() {
  const items = FAQ.map(([q, a]) => `<details class="faq-item" style="border-bottom: 1px solid var(--line);">
<summary style="list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 0; font-size: 19px; font-weight: 700;">${esc(q)}<span class="faq-ic" aria-hidden="true"></span></summary>
<p style="margin: 0 0 22px; font-size: 17px; line-height: 1.65; color: var(--muted); max-width: 760px;">${esc(a)}</p>
</details>`).join('\n');
  return `<section id="duvidas" style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 88px 24px; display: flex; flex-wrap: wrap; gap: 48px;">
<div style="flex: 1 1 300px; min-width: 0;">
<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 12px;">Dúvidas</div>
<h2 style="margin: 0 0 16px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 4.5vw, 54px); line-height: 1;">Perguntas sobre os cursos.</h2>
<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">Não achou a sua? <a href="https://wa.me/${WA}" style="font-weight: 700;">Pergunta direto no WhatsApp</a>.</p>
</div>
<div style="flex: 2 1 560px; min-width: 0; border-top: 1px solid var(--line);">
${items}
</div>
</div>
</section>`;
}

const fact = (label, value) => `<div style="background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;">
<span style="font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted);">${label}</span>
<span style="font-size: 17px; font-weight: 600; line-height: 1.4;">${esc(value)}</span>
</div>`;

const eyebrow = (t, color = 'var(--brand-ink)') => `<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: ${color}; margin-bottom: 12px;">${t}</div>`;

function cursoPage(c) {
  const titulo = c.titulo;
  const msg = `Olá, Segbem! Vim pelo site e quero orçamento do curso ${titulo}.`;
  const media = c.foto
    ? `<div class="hero-media" style="flex: 1 1 400px; min-width: 0;"><img fetchpriority="high" src="${c.foto}" alt="Turma em treinamento de ${esc(c.nome.toLowerCase())}" style="width: 100%; height: 400px; object-fit: cover; border-radius: 10px; display: block;"></div>`
    : `<div style="flex: 1 1 400px; min-width: 0; height: 400px; border-radius: 10px; background: #14201a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(90px, 14vw, 170px); color: #f2c200; line-height: 1;">${esc(c.code)}</span>
<div class="hz" style="position: absolute; left: 0; right: 0; bottom: 0; height: 14px;"></div>
</div>`;
  const publico = c.publico.map(p => `<li style="display: flex; gap: 10px; font-size: 17px; line-height: 1.5;">${CHECK}<span>${esc(p)}</span></li>`).join('\n');
  const conteudo = c.conteudo.map((x, i) => `<li style="padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 17px; line-height: 1.5; display: flex; gap: 14px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; color: var(--brand-ink); min-width: 26px;">${String(i + 1).padStart(2, '0')}</span><span>${esc(x)}</span></li>`).join('\n');
  const pratica = c.pratica ? `<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">${esc(c.pratica)}</p>` : '';
  const outros = CURSOS.filter(o => o.slug !== c.slug).slice(0, 4);
  const rel = outros.map(o => `<a class="card" href="${o.slug}.html" style="background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">${esc(o.code)}</span><span style="font-weight: 700; font-size: 17px;">${esc(o.nome)}</span></a>`).join('\n');
  const quando = c.quando ? `\n<p style="max-width: 1240px; margin: -24px auto 0; padding: 0 24px 48px; font-size: 15px; line-height: 1.6; color: var(--muted);">${esc(c.quando)}</p>` : '';
  const body = `<section style="background: #0d3b24; color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 56px 24px 64px; display: flex; flex-wrap: wrap; align-items: center; gap: 48px;">
<div style="flex: 1 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
<nav aria-label="Você está em" style="font-size: 14px; color: #b9cbbd;"><a href="index.html" style="color: #b9cbbd;">Início</a> / <a href="cursos.html" style="color: #b9cbbd;">Cursos</a> / ${esc(c.code)}</nav>
<div style="display: inline-flex; align-self: flex-start; background: rgba(242,194,0,0.14); color: #f2c200; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px;">Curso ${esc(c.code)} em Goiânia e Goiás</div>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(42px, 5.6vw, 70px); line-height: 0.98; text-transform: uppercase;">${esc(titulo)}</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8; max-width: 560px;">${esc(c.lead)} Turma in company, com teoria e prática, ou turma presencial.</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px;">
<a class="btn-main" href="${wa(msg)}" style="background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}Pedir orçamento deste curso</a>
</div>
</div>
${media}
</div>
</section>
<div class="hz" style="height: 12px;"></div>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 48px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
${fact('Carga horária', c.carga)}
${fact('Reciclagem', c.reciclagem)}
${fact('Modalidade', 'In company ou turma presencial')}
${fact('Certificado', 'Ao final, com lista de presença')}
</div>${quando}
</section>

<section style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 80px 24px; display: flex; flex-wrap: wrap; gap: 56px;">
<div style="flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
${eyebrow('Pra quem é')}
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">Quem precisa fazer</h2>
<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;">
${publico}
</ul>
${pratica}
</div>
<div style="flex: 1.3 1 460px; min-width: 0;">
${eyebrow('Conteúdo')}
<h2 style="margin: 0 0 12px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">O que a turma aprende</h2>
<ol style="list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line);">
${conteudo}
</ol>
</div>
</div>
</section>

<section style="background: #17752f; color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 28px;">
<div style="flex: 1 1 480px; min-width: 0;">
<h2 style="margin: 0 0 10px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 4vw, 48px); line-height: 1.02;">Monte a turma da sua equipe.</h2>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #e1efe3;">Manda o curso, a quantidade de pessoas e a cidade que a gente responde com a proposta.</p>
</div>
<a class="btn-main" href="${wa(msg)}" style="background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 18px; padding: 18px 28px; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}Chamar no WhatsApp</a>
</div>
</section>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 80px; display: flex; flex-direction: column; gap: 24px;">
<div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px;">
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1;">Outros cursos</h2>
<a href="cursos.html" style="font-weight: 700; padding: 10px 0;">Ver todos →</a>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px;">
${rel}
</div>
</div>
</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Course', name: `Curso ${titulo}`, description: c.lead,
    inLanguage: 'pt-BR', provider: { '@type': 'Organization', name: 'Segbem Assessoria em Segurança do Trabalho', sameAs: SITE + '/' } };
  const desc = `Curso ${titulo} em Goiânia, Goiás e região, in company ou presencial. ${c.lead} Carga horária: ${c.carga.toLowerCase()}. Orçamento pelo WhatsApp.`;
  return page(c.slug, `Curso ${titulo} em Goiânia | Segbem`, desc, body, { active: 'cursos.html', ld, image: c.foto || 'img/og.jpg' });
}

function indice() {
  const cards = CURSOS.map(c => {
    const top = c.foto
      ? `<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="${c.foto}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
      : `<div style="height: 180px; background: #14201a; display: flex; align-items: center; justify-content: center;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 72px; color: #f2c200;">${esc(c.code)}</span></div>`;
    return `<a class="card" href="${c.slug}.html" style="background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; display: flex; flex-direction: column;">
${top}
<div style="padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">${esc(c.code)}</span>
<h2 style="margin: 0; font-size: 21px; font-weight: 700; line-height: 1.25;">${esc(c.nome)}</h2>
<dl style="margin: 6px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 14px; line-height: 1.45;">
<dt style="color: var(--muted);">Carga</dt><dd style="margin: 0;">${esc(c.carga)}</dd>
<dt style="color: var(--muted);">Reciclagem</dt><dd style="margin: 0;">${esc(c.reciclagem)}</dd>
</dl>
<span style="margin-top: auto; padding-top: 12px; font-weight: 700; color: var(--brand-ink);">Ver detalhes →</span>
</div>
</a>`;
  });
  const brig = `<a class="card" href="index.html#brigada" style="background: #14201a; color: #ffffff; border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column;">
<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="img/brigada.webp" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>
<div style="padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: #f2c200;">Brigada</span>
<h2 style="margin: 0; font-size: 21px; font-weight: 700; line-height: 1.25;">Brigada de emergência</h2>
<p style="margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #c9d3cb;">Básica 4h, intermediária 8h e avançada 24h. Credenciada junto ao Corpo de Bombeiros Militar de Goiás.</p>
<span style="margin-top: auto; padding-top: 12px; font-weight: 700; color: #f2c200;">Ver detalhes →</span>
</div>
</a>`;
  const naoachou = `<div class="card" style="background: #17752f; color: #ffffff; border-radius: 12px; padding: 28px 26px; display: flex; flex-direction: column; gap: 14px; justify-content: center;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1.02;">Não achou o seu curso?</span>
<span style="font-size: 16px; line-height: 1.55; color: #e1efe3;">Esses são os principais. A Segbem realiza outros treinamentos de NR conforme a necessidade da sua empresa. Fala com a gente que a gente monta a turma.</span>
<a class="btn-main" href="${wa('Olá, Segbem! Vim pelo site e procuro um curso que não achei na lista.')}" style="align-self: flex-start; background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}Consultar outro curso</a>
</div>`;
  const outros = OUTROS.map(o => `<a href="${wa('Olá, Segbem! Vim pelo site e quero orçamento do curso ' + o + '.')}" style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px; color: var(--ink); text-decoration: none;">${esc(o)}</a>`).join('\n');
  const body = `<section style="background: #0d3b24; color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 72px; display: flex; flex-direction: column; gap: 20px;">
<div style="display: inline-flex; align-self: flex-start; background: rgba(242,194,0,0.14); color: #f2c200; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px;">Principais cursos</div>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(44px, 6vw, 76px); line-height: 0.98; text-transform: uppercase; max-width: 900px;">Treinamentos de NR em Goiânia e todo Goiás.</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8; max-width: 640px;">Os principais cursos com carga horária, reciclagem e conteúdo. Não achou o seu? A gente realiza outros, é só chamar. Turmas in company, com a prática feita nos equipamentos da sua empresa, ou turmas presenciais.</p>
</div>
</section>
<div class="hz" style="height: 12px;"></div>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 96px; display: flex; flex-direction: column; gap: 36px;">
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
${cards.join('\n')}
${brig}
${naoachou}
</div>
<div class="extra" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
<span style="font-weight: 700; font-size: 15px; color: var(--muted); margin-right: 4px;">Outros cursos que realizamos</span>
${outros}
</div>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--muted); max-width: 820px;">As cargas horárias informadas seguem o mínimo previsto em cada norma. A turma pode ter mais horas conforme a necessidade da empresa.</p>
</div>
</section>

` + faqBlock();
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return page('cursos', 'Cursos de NR em Goiânia: NR-35, NR-33, NR-11, NR-10 e mais | Segbem',
    'Treinamentos de NR em Goiânia e todo Goiás: NR-35, NR-33, NR-11, NR-10, NR-12, NR-20, CIPA, Lei Lucas, plataforma elevatória, primeiros socorros e brigada. In company ou presencial.',
    body, { active: 'cursos.html', ld: faqLd });
}

function p404() {
  const body = `<section style="background: #0d3b24; color: #ffffff;">
<div style="max-width: 900px; margin: 0 auto; padding: 120px 24px; display: flex; flex-direction: column; gap: 22px; align-items: flex-start;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 120px; line-height: 0.9; color: #f2c200;">404</span>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 5vw, 56px); line-height: 1;">Área isolada. Essa página não existe.</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8;">O link pode estar errado ou a página mudou de lugar.</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px;">
<a class="btn-main" href="/" style="background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px;">Voltar pro início</a>
<a class="btn-ghost" href="/cursos" style="border: 2px solid rgba(255,255,255,0.5); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 17px; padding: 14px 24px; border-radius: 6px;">Ver cursos</a>
</div>
</div>
</section>
<div class="hz" style="height: 12px;"></div>`;
  // na 404 os caminhos precisam ser absolutos, porque ela pode aparecer em qualquer URL
  return page('404', 'Página não encontrada | Segbem', 'Página não encontrada.', body, { noindex: true })
    .replace(/(href|src)="(?!https?:|\/|#|mailto:|data:)([^"]+)"/g, '$1="/$2"');
}

for (const c of CURSOS) write(`${c.slug}.html`, cursoPage(c));
write('cursos.html', indice());
write('404.html', p404());

const urls = ['/', '/cursos', '/clientes', ...CURSOS.map(c => `/${c.slug}`)];
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + '\n</urlset>\n');
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`ok: ${CURSOS.length} cursos, ${CLIENTES.length} clientes, ${DEPO.length} depoimentos -> dist/`);
