// Monta o site em dist/ a partir de content/site.yml (editado pelo Pages CMS).
// Uso: npm install (uma vez) e depois node tools/build.mjs
//
// 1. copia public/ (imagens, vídeo, css, js, _headers) pra dist/
// 2. renderiza os modelos de src/ (home, clientes, chat). Pastas e arquivos começando com _ são partes,
//    não viram página: src/_home/ tem uma seção da home por arquivo, src/_partes/ o cabeçalho e o rodapé.
// 3. gera as páginas de curso, cursos.html, 404.html, sitemap.xml e robots.txt
// 4. acrescenta ?v=<hash> nas imagens e no vídeo, pra troca de arquivo aparecer mesmo com cache longo
//
// Modelos: {{ caminho.no.yml }} escapa o texto, {{ x | raw }} insere HTML pronto, {{ x | rt }} insere
// texto formatado do CMS (rich-text), {{ x | txt }} tira a formatação, {{ x | json }} gera JSON,
// {{ x | wa }} vira link do WhatsApp com a mensagem x. Blocos: {{#each lista as item}}...{{/each}}
// (com item_n = posição, começando em 1) e {{#if x}}...{{else}}...{{/if}}.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const SITE = 'https://segbemsst.com.br';

const fail = msg => { console.error('\nErro no content/site.yml: ' + msg + '\n'); process.exit(1); };
const avisos = [];
const aviso = msg => avisos.push(msg);

let DATA;
try { DATA = parseYaml(fs.readFileSync(path.join(ROOT, 'content/site.yml'), 'utf8')); }
catch (e) { fail('o arquivo não pôde ser lido (' + e.message.split('\n')[0] + ')'); }

// ---------------------------------------------------------------- utilidades
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const img = p => String(p || '').trim().replace(/^\/+/, '');
const str = s => String(s ?? '').trim();
const digits = s => String(s || '').replace(/\D/g, '');
const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lista = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== '') : [];

// json.dumps do Python (separadores ", " e ": "), pra manter o JSON-LD no mesmo formato de antes
function pyjson(v) {
  if (Array.isArray(v)) return '[' + v.map(pyjson).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyjson(x)).join(', ') + '}';
  return JSON.stringify(v);
}

// ---------------------------------------------------------------- contato
const C = DATA.contato || fail('falta o bloco "contato"');
for (const k of ['whatsapp', 'email', 'endereco', 'cidade', 'uf', 'cep']) if (!str(C[k])) fail(`contato.${k} está vazio`);
const telDigits = digits(C.whatsapp);
const WA = telDigits.startsWith('55') && telDigits.length > 11 ? telDigits : '55' + telDigits;
const telLocal = str(C.whatsapp).replace(/^\+?55\s*/, '');
const instagram = str(C.instagram).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
const waLink = msg => `https://wa.me/${WA}` + (str(msg) ? '?text=' + encodeURIComponent(str(msg)) : '');

// ---------------------------------------------------------------- texto formatado (rich-text do CMS)
// O CMS grava HTML. Fica só a formatação simples (negrito, itálico, link, lista) e o texto entra
// dentro do <p> que já existe no layout: parágrafos viram quebra de linha dupla e listas viram linhas com •.
const RT_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li']);
function rtLimpo(html) {
  let h = String(html ?? '').replace(/<(script|style|iframe|object|embed|svg)\b[\s\S]*?<\/\1>/gi, '');
  h = h.replace(/\{whatsapp\}|%7Bwhatsapp%7D/gi, WA);
  return h.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!RT_TAGS.has(tag)) return '';
    if (m.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i) || [])[1] || '';
      if (!href || /^\s*(javascript|data|vbscript):/i.test(href)) return '<a>';
      const fora = /^https?:/i.test(href) && !href.startsWith(SITE);
      return `<a href="${href.replace(/"/g, '&quot;')}"${fora ? ' target="_blank" rel="noopener"' : ''}>`;
    }
    return `<${tag}>`;
  });
}
function rt(html) {
  let h = rtLimpo(html).trim();
  h = h.replace(/<li>/g, '• ').replace(/<\/li>\s*/g, '<br>').replace(/<\/?(ul|ol)>\s*/g, '');
  const partes = h.split(/<\/p>\s*/).map(x => x.replace(/<p>/g, '').trim()).filter(Boolean);
  return partes.join('<br><br>').replace(/(<br>\s*)+$/, '');
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: ' ' };
const txt = html => String(html ?? '').replace(/<br\s*\/?>|<\/p>|<\/li>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e) => ENT[e]).replace(/\{whatsapp\}/g, WA).replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- motor dos modelos
function lookup(p, scope, file) {
  if (p === '.') return scope['.'];
  const [head, ...rest] = p.split('.');
  if (!(head in scope)) throw new Error(`${file}: marcador desconhecido "${p}"`);
  return rest.reduce((v, k) => (v === null || v === undefined ? undefined : v[k]), scope[head]);
}
const truthy = v => Array.isArray(v) ? v.length > 0 : !!(typeof v === 'string' ? v.trim() : v);
const FILTROS = {
  esc: v => esc(v), raw: v => String(v ?? ''), json: v => JSON.stringify(v ?? ''),
  rt: v => rt(v), txt: v => esc(txt(v)), wa: v => esc(waLink(v)), img: v => esc(img(v)),
};

function parseTpl(tpl, file) {
  // linha que só tem um marcador de bloco não deixa linha em branco no resultado
  tpl = tpl.replace(/\r\n/g, '\n').replace(/^[ \t]*(\{\{(?:#each|#if|else|\/each|\/if)\b[^}]*\}\})[ \t]*\n/gm, '$1');
  const raiz = [];
  const pilha = [{ tipo: 'raiz', arr: raiz }]; // cada nível guarda o nó e a lista onde os filhos entram
  const topo = () => pilha[pilha.length - 1];
  for (const t of tpl.split(/(\{\{[^}]*\}\})/)) {
    const m = t.match(/^\{\{\s*(#each|#if|else|\/each|\/if)?\s*(.*?)\s*\}\}$/);
    if (!m) { if (t) topo().arr.push(t); continue; }
    const [, tag, arg] = m;
    if (!tag) {
      const [p, f = 'esc'] = arg.split('|').map(s => s.trim());
      if (!FILTROS[f]) throw new Error(`${file}: filtro desconhecido "${f}"`);
      topo().arr.push({ p, f });
    } else if (tag === '#if') {
      const n = { tipo: 'if', p: arg, sim: [], nao: [] };
      topo().arr.push(n); pilha.push({ tipo: 'if', n, arr: n.sim });
    } else if (tag === '#each') {
      const [, p, nome] = arg.match(/^(\S+)\s+as\s+(\w+)$/) || [];
      if (!p) throw new Error(`${file}: use {{#each lista as item}}`);
      const n = { tipo: 'each', p, nome, body: [] };
      topo().arr.push(n); pilha.push({ tipo: 'each', n, arr: n.body });
    } else if (tag === 'else') {
      if (topo().tipo !== 'if') throw new Error(`${file}: {{else}} fora de um {{#if}}`);
      topo().arr = topo().n.nao;
    } else {
      if (tag !== '/' + topo().tipo) throw new Error(`${file}: {{${tag}}} fora de lugar`);
      pilha.pop();
    }
  }
  if (pilha.length > 1) throw new Error(`${file}: falta fechar {{#${topo().tipo}}}`);
  return raiz;
}
function evalTpl(nodes, scope, file) {
  let out = '';
  for (const n of nodes) {
    if (typeof n === 'string') out += n;
    else if (n.f) out += FILTROS[n.f](lookup(n.p, scope, file));
    else if (n.tipo === 'if') out += evalTpl(truthy(lookup(n.p, scope, file)) ? n.sim : n.nao, scope, file);
    else lista(lookup(n.p, scope, file)).forEach((item, i) => {
      out += evalTpl(n.body, { ...scope, [n.nome]: item, [n.nome + '_n']: i + 1 }, file);
    });
  }
  return out;
}
const render = (tpl, scope, file) => evalTpl(parseTpl(tpl, file), scope, file);
const parte = (rel, scope) => render(fs.readFileSync(path.join(SRC, rel), 'utf8'), scope, rel);

// ---------------------------------------------------------------- cores
// O cliente escolhe a cor principal e a de destaque. O resto (tom escuro, versões pro modo escuro,
// cor do texto por cima) sai daqui. As cores da paleta pronta já vêm com o tom escuro escolhido a mão;
// o verde original guarda os valores exatos que o site sempre teve.
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => rgb2hex(hex2rgb(a).map((x, i) => x + (hex2rgb(b)[i] - x) * t));
const lum = h => { const [r, g, b] = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const textoSobre = bg => contraste(bg, '#ffffff') >= contraste(bg, '#14201a') ? '#ffffff' : '#14201a';
const HEX = /^#[0-9a-fA-F]{6}$/;

const PALETA_PRINCIPAL = {
  '#17752f': { escura: '#0d3b24', claro: '#5fcf7c', tag: '#e6f1e7', tagEscuro: '#1d3a27', tagInkEscuro: '#bfe8c8' },
  '#1d5fa8': { escura: '#0f2f57' },
  '#13646e': { escura: '#0a3439' },
  '#b3261e': { escura: '#5c1310' },
  '#c2410c': { escura: '#5f2006' },
  '#374151': { escura: '#1a202b' },
};
const PALETA_DESTAQUE = { '#f2c200': { hover: '#ffd633' } };

function escolheCor(sel, outra, padrao, nome) {
  const o = str(outra);
  if (o) { if (HEX.test(o)) return o.toLowerCase(); aviso(`${nome}: "${o}" não é um código de cor (#rrggbb), usei a cor da lista`); }
  const s = str(sel).toLowerCase();
  return HEX.test(s) ? s : padrao;
}
const ID = DATA.identidade || {};
const principal = escolheCor(ID.cor_principal, ID.cor_principal_outra, '#17752f', 'Cor principal');
const destaque = escolheCor(ID.cor_secundaria, ID.cor_secundaria_outra, '#f2c200', 'Cor secundária');
const P = PALETA_PRINCIPAL[principal] || {};
let claro = principal;
for (let t = 0; t <= 1 && contraste(claro, '#141d17') < 6; t += 0.05) claro = mix(principal, '#ffffff', t);
const CORES = {
  principal, destaque,
  escura: P.escura || mix(principal, '#000000', 0.5),
  claro: P.claro || claro,
  tag: P.tag || mix(principal, '#ffffff', 0.88),
  tagEscuro: P.tagEscuro || mix(principal, '#141d17', 0.75),
  tagInkEscuro: P.tagInkEscuro || mix(principal, '#ffffff', 0.7),
  hover: (PALETA_DESTAQUE[destaque] || {}).hover || mix(destaque, '#ffffff', 0.2),
};
if (contraste(principal, '#ffffff') < 4.5) aviso(`a cor principal ${principal} é clara demais: textos e links nessa cor ficam difíceis de ler no fundo branco`);
if (contraste(CORES.escura, '#ffffff') < 7) aviso(`o tom escuro calculado (${CORES.escura}) não dá bom contraste com texto branco; escolha uma cor principal mais escura`);
const CORES_CSS = `<style id="cores">:root{--c-principal:${principal};--c-principal-txt:${textoSobre(principal)};--c-principal-claro:${CORES.claro};--c-escura:${CORES.escura};--c-destaque:${destaque};--c-destaque-txt:${textoSobre(destaque)};--c-destaque-hover:${CORES.hover};--c-tag-bg:${CORES.tag};--c-tag-bg-escuro:${CORES.tagEscuro};--c-tag-ink-escuro:${CORES.tagInkEscuro}}</style>`;

// ---------------------------------------------------------------- clientes
const CLIENTES = lista(DATA.clientes).map((c, i) => {
  if (!str(c.nome)) fail(`o cliente nº ${i + 1} está sem nome`);
  return { ...c, nome: str(c.nome), logo: img(c.logo), foto: img(c.foto) };
});

const LOGOS = CLIENTES.filter(c => c.faixa_home !== false).map(c => {
  if (!c.logo) return `<span class="cl nologo"><b>${esc(c.nome)}</b></span>`;
  const h = +c.altura_logo || 60;
  return `<span class="cl"><img src="${esc(c.logo)}" alt="${esc(c.nome)}" height="${h}" style="height: ${h}px" onerror="this.parentNode.classList.add('nologo');this.remove()"><b>${esc(c.nome)}</b></span>`;
}).join('');

const CARDS_CLIENTES = CLIENTES.filter(c => c.pagina_clientes !== false).map(c => {
  let top;
  if (c.foto) {
    const pos = c.foto_ajuste !== undefined && c.foto_ajuste !== null && c.foto_ajuste !== '' ? ` object-position: center ${+c.foto_ajuste}%;` : '';
    top = `<div style="height: 260px; overflow: hidden;"><img class="card-img" src="${esc(c.foto)}" alt="${esc(c.foto_descricao || 'Turma da ' + c.nome)}" style="width: 100%; height: 100%; object-fit: cover;${pos} display: block;"></div>`;
  } else if (c.logo) {
    top = `<div style="height: 260px; overflow: hidden; background: #eef2ee; display: flex; align-items: center; justify-content: center;"><img class="card-img" src="${esc(c.logo)}" alt="Logo da ${esc(c.nome)}" style="height: 150px; width: auto; display: block;"></div>`;
  } else {
    top = `<div style="height: 260px; background: #14201a; display: flex; align-items: center; justify-content: center; padding: 0 24px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 44px; line-height: 1; text-align: center; text-transform: uppercase; color: var(--c-destaque);">${esc(c.nome)}</span></div>`;
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
const PC = DATA.pagina_clientes || fail('falta o bloco "pagina_clientes"');
const CONTADORES = lista(PC.contadores).map(c => {
  const n = Math.round(+c.numero || 0);
  return `<div style="display: flex; flex-direction: column; gap: 4px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 52px; color: var(--c-destaque); line-height: 1;"><span data-count="${n}">+${n.toLocaleString('pt-BR')}</span></span><span style="font-size: 15px; color: #d5e4d8;">${esc(c.texto)}</span></div>`;
}).join('\n');

// ---------------------------------------------------------------- ícones dos setores (página Clientes)
const ICONE = p => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONES = {
  industria: ICONE('<path d="M3 21V10l6 4V10l6 4V6h4v15z"/><path d="M7 17h2M12 17h2M17 17h1"/>'),
  logistica: ICONE('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
  alimentacao: ICONE('<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8M7 3v6"/><path d="M17 21V3c-2 1-3 3.5-3 7h3"/>'),
  saude: ICONE('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'),
  educacao: ICONE('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'),
  construcao: ICONE('<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 15h20v3H2z"/><path d="M12 7V4"/>'),
};
for (const s of lista((PC.setores || {}).itens)) s.svg = ICONES[str(s.icone)] || ICONES.industria;

// ---------------------------------------------------------------- depoimentos
// "colunas": três colunas que sobem no PC (distribuídas 1-2-3, 1-2-3...) e uma no celular; cada coluna
// repete os cards (aria-hidden) pra animação dar a volta sem emenda. "grade": cards parados lado a lado.
const STAR = cor => `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color: ${cor};"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;
const G_ICON = '<span style="color: var(--muted);"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg></span>';
const AVATAR = ['var(--c-principal)', 'var(--c-escura)', '#b88a00', '#2d5a3d'];
const DEPO = lista(DATA.depoimentos).filter(d => str(d.texto)).map((d, i) => ({
  ...d,
  nome: str(d.nome) || 'Cliente',
  origem: d.origem === null || d.origem === undefined ? 'Avaliação no Google' : str(d.origem),
  estrelas: Math.max(1, Math.min(5, Math.round(+d.estrelas || 5))),
  cor: AVATAR[i % AVATAR.length],
}));
function depoCard(d, dup, extra = '') {
  const ini = d.nome.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const stars = Array.from({ length: 5 }, (_, i) => STAR(i < d.estrelas ? 'var(--c-destaque)' : 'var(--line)')).join('');
  return `<figure class="tms-card${extra}"${dup ? ' aria-hidden="true"' : ''} style="margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 22px; padding: 28px 28px 22px; display: flex; flex-direction: column; gap: 16px;">
<div style="display: flex; gap: 2px;" aria-label="${d.estrelas} de 5 estrelas">${stars}</div>
<blockquote style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--ink); flex: 1;">${esc(str(d.texto))}</blockquote>
<figcaption style="display: flex; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line);">
<span aria-hidden="true" style="width: 40px; height: 40px; border-radius: 50%; background: ${d.cor}; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex: none;">${esc(ini)}</span>
<span style="display: flex; flex-direction: column; line-height: 1.25; flex: 1; min-width: 0;"><strong style="font-size: 15px;">${esc(d.nome)}</strong><span style="font-size: 13px; color: var(--muted);">${esc(d.origem)}</span></span>${/google/i.test(d.origem) ? '\n' + G_ICON : ''}
</figcaption>
</figure>`;
}
function depoCol(cls, segPorCard, itens) {
  const dur = Math.round(segPorCard * itens.length);
  const cards = [...itens.map(d => depoCard(d, false)), ...itens.map(d => depoCard(d, true))].join('\n');
  return `<div class="tms-col ${cls}" style="--dur: ${dur}s;"><div class="tms-track">\n${cards}\n</div></div>`;
}
function depoimentos(estilo) {
  if (estilo === 'grade') return `<div class="reviews" role="region" aria-label="Avaliações de clientes no Google">\n${DEPO.map(d => depoCard(d, false, ' review')).join('\n')}\n</div>`;
  return `<div class="tms" role="region" aria-label="Avaliações de clientes no Google">\n` + [
    depoCol('tms-a', 17, DEPO.filter((_, i) => i % 3 === 0)),
    depoCol('tms-b', 23, DEPO.filter((_, i) => i % 3 === 1)),
    depoCol('tms-c', 19, DEPO.filter((_, i) => i % 3 === 2)),
    depoCol('tms-m', 70 / 6, DEPO),
  ].join('\n') + '\n</div>';
}

// ---------------------------------------------------------------- cursos
const CURSOS = lista(DATA.cursos).map((c, i) => {
  for (const k of ['codigo', 'nome', 'descricao', 'carga_horaria', 'validade']) if (!str(c[k])) fail(`o curso nº ${i + 1} (${c.nome || c.codigo || 'sem nome'}) está sem "${k}"`);
  return {
    slug: slugify(c.pagina || '') || 'curso-' + slugify(c.codigo),
    code: str(c.codigo), nome: str(c.nome), foto: img(c.foto) || null,
    titulo: c.codigo_no_titulo === false ? str(c.nome) : `${str(c.codigo)} ${str(c.nome)}`,
    lead: txt(c.descricao), carga: str(c.carga_horaria), reciclagem: str(c.validade),
    quando: str(c.observacao), publico: lista(c.publico).map(str), conteudo: lista(c.conteudo).map(str),
    pratica: str(c.pratica) || null,
    home: !!c.home, nome_curto: str(c.nome_curto) || str(c.nome),
    resumo: str(c.resumo), foto_descricao: str(c.foto_descricao),
  };
});
const slugs = CURSOS.map(c => c.slug);
for (const s of slugs) if (slugs.indexOf(s) !== slugs.lastIndexOf(s)) fail(`dois cursos com a mesma página "${s}"`);

const CARDS_CURSOS = CURSOS.filter(c => c.home).map(c => {
  const top = c.foto
    ? `<div style="height: 220px; overflow: hidden;"><img class="card-img" src="${esc(c.foto)}" alt="${esc(c.foto_descricao)}" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
    : `<div style="height: 220px; background: #14201a; display: flex; align-items: center; justify-content: center;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 72px; color: var(--c-destaque);">${esc(c.code)}</span></div>`;
  return `<a class="card" href="${c.slug}.html" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; text-decoration: none; color: inherit;">
${top}
<div style="padding: 22px 24px 26px; display: flex; flex-direction: column; gap: 6px;"><div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">${esc(c.code)}</div><h3 style="margin: 0; font-size: 20px; font-weight: 700;">${esc(c.nome_curto)}</h3><p style="margin: 0; font-size: 15px; line-height: 1.5; color: var(--muted);">${esc(c.resumo)}</p></div>
</a>`;
}).join('\n');

// ---------------------------------------------------------------- home: seções, ordem e estilos
const H = DATA.home || fail('falta o bloco "home"');
const ESTILOS = {
  topo: ['padrao', 'invertido', 'centro'],
  assessoria: ['padrao', 'cinza', 'escuro'],
  treinamentos: ['padrao', 'branco', 'escuro'],
  avaliacoes: ['padrao', 'grade'],
  brigada: ['padrao', 'invertido', 'marca'],
  contato: ['padrao', 'escura', 'neutro'],
};
const V = {};
for (const [sec, ok] of Object.entries(ESTILOS)) {
  const e = str((H[sec] || {}).estilo) || 'padrao';
  if (!ok.includes(e)) aviso(`home.${sec}.estilo "${e}" não existe, usei o padrão`);
  V[sec] = ok.includes(e) && e !== 'padrao' ? ` class="v-${e}"` : '';
}
const SECOES = ['clientes', 'assessoria', 'treinamentos', 'avaliacoes', 'brigada', 'faq', 'contato'];
const ordem = [];
for (const s of lista(H.secoes)) {
  const id = str(s.secao);
  if (!SECOES.includes(id)) { aviso(`home.secoes: seção "${id}" não existe, ignorei`); continue; }
  if (ordem.some(o => o.id === id)) { aviso(`home.secoes: "${id}" aparece duas vezes, usei a primeira`); continue; }
  ordem.push({ id, mostrar: s.mostrar !== false });
}
for (const id of SECOES) if (!ordem.some(o => o.id === id)) { aviso(`home.secoes: "${id}" não está na lista, ficou escondida`); ordem.push({ id, mostrar: false }); }
const MOSTRA = Object.fromEntries(ordem.map(o => [o.id, o.mostrar]));

// topo: vídeo, ou foto se não tiver vídeo
const T = H.topo || {};
const video = img(T.video), imagem = img(T.imagem);
let topoMidia = '';
if (video) {
  const tipo = /\.webm$/i.test(video) ? 'video/webm' : 'video/mp4';
  topoMidia = `<video class="hero-video" autoplay muted loop playsinline preload="metadata"${imagem ? ` poster="${esc(imagem)}"` : ''} aria-label="${esc(T.imagem_descricao)}" style="width: 100%; height: 480px; object-fit: cover; object-position: center 35%; border-radius: 10px; display: block;"><source src="${esc(video)}" type="${tipo}"></video>`;
} else if (imagem) {
  topoMidia = `<img fetchpriority="high" src="${esc(imagem)}" alt="${esc(T.imagem_descricao)}" style="width: 100%; height: 480px; object-fit: cover; border-radius: 10px; display: block;">`;
}
if (str(T.legenda)) topoMidia += `\n<div class="hero-chip" style="position: absolute; left: 16px; bottom: 16px; background: var(--surface); color: var(--ink); padding: 12px 16px; border-radius: 6px; font-weight: 600; font-size: 14px; max-width: 280px;">${esc(T.legenda)}</div>`;

// ---------------------------------------------------------------- escopo dos modelos
const calc = {
  cores: CORES_CSS, cor_escura: CORES.escura, v: V, mostra: MOSTRA,
  logos: LOGOS, cards_clientes: CARDS_CLIENTES, contadores: CONTADORES, cards_cursos: CARDS_CURSOS,
  depoimentos: depoimentos(str((H.avaliacoes || {}).estilo)), topo_midia: topoMidia,
  icones: ICONES,
  ld_faq: pyjson({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: lista((H.faq || {}).perguntas).map(q => ({ '@type': 'Question', name: txt(q.pergunta), acceptedAnswer: { '@type': 'Answer', text: txt(q.resposta) } })) }),
};
const scope = {
  ...DATA, calc,
  wa: WA, whatsapp: telLocal, ld_telefone: '+55 ' + telLocal.replace(/^\((\d\d)\)\s*/, '$1 '),
  email: str(C.email), cnpj: str(C.cnpj), endereco: str(C.endereco), cidade: str(C.cidade), uf: str(C.uf), cep: str(C.cep),
  endereco_completo: `${str(C.endereco)}, ${str(C.cidade)}/${str(C.uf)}, CEP ${str(C.cep)}`,
  instagram, instagram_url: `https://www.instagram.com/${instagram}/`, google: str(C.google), nota: str(C.nota_google) || '5,0',
};

calc.header = parte('_partes/header.html', scope);
calc.footer = parte('_partes/footer.html', scope);
calc.secoes = [parte('_home/topo.html', scope), ...ordem.filter(o => o.mostrar).map(o => parte(`_home/${o.id}.html`, scope))].join('\n\n');

function header(active) {
  let h = calc.header.split(' aria-current="page"').join('');
  if (active) h = h.replace(`<a href="${active}">`, `<a href="${active}" aria-current="page">`);
  return h;
}
calc.header_clientes = header('clientes.html');

// ---------------------------------------------------------------- saída
// esvazia dist/ sem apagar a pasta (no Windows o wrangler dev deixa a pasta presa)
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), text); };

// modelos em src/ que viram arquivo (o que começa com _ é parte)
const walk = d => fs.readdirSync(d, { withFileTypes: true }).filter(e => !e.name.startsWith('_')).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(SRC)) {
  const rel = path.relative(SRC, f).split(path.sep).join('/');
  write(rel, render(fs.readFileSync(f, 'utf8'), scope, rel));
}

// ---------------------------------------------------------------- páginas de curso, índice e 404
// O <style>, o script do tema, o cabeçalho e o rodapé são os mesmos da home.
const home = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const STYLE = home.match(/<style>[\s\S]*?<\/style>/)[0];
const THEME = home.match(/<script>\(function\(\)\{var t;try[\s\S]*?<\/script>/)[0];
const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>';
const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; margin-top: 2px; color: var(--brand-ink);"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const wa = msg => `https://wa.me/${WA}?text=` + msg.replace(/%/g, '%25').replace(/ /g, '%20').replace(/!/g, '%21').replace(/,/g, '%2C');

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
<meta name="theme-color" content="${CORES.escura}">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/png" href="img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&amp;family=Barlow:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
${CORES_CSS}
${STYLE}
${THEME}
<link rel="stylesheet" href="assets/theme.css">
<link rel="stylesheet" href="assets/anim.css">
<link rel="stylesheet" href="assets/chat.css">
<link rel="stylesheet" href="assets/estilos.css">${extraLd}
</head>
<body>
<div style="font-family: 'Barlow', system-ui, sans-serif; color: var(--ink); background: var(--surface); min-height: 100%;">

${header(active)}

${body}

${calc.footer}

</div>
<script src="assets/anim.js" defer></script>
<script src="assets/chat.js" defer></script>
</body>
</html>
`;
}

const PCU = DATA.pagina_cursos || fail('falta o bloco "pagina_cursos"');
const TC = DATA.pagina_curso || fail('falta o bloco "pagina_curso"');
const P404 = DATA.pagina_404 || fail('falta o bloco "pagina_404"');
const FAQ_CURSOS = lista((PCU.faq || {}).perguntas).map(q => [str(q.pergunta), q.resposta]);

function faqBlock() {
  const items = FAQ_CURSOS.map(([q, a]) => `<details class="faq-item" style="border-bottom: 1px solid var(--line);">
<summary style="list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 0; font-size: 19px; font-weight: 700;">${esc(q)}<span class="faq-ic" aria-hidden="true"></span></summary>
<p class="rt" style="margin: 0 0 22px; font-size: 17px; line-height: 1.65; color: var(--muted); max-width: 760px;">${rt(a)}</p>
</details>`).join('\n');
  return `<section id="duvidas" style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 88px 24px; display: flex; flex-wrap: wrap; gap: 48px;">
<div style="flex: 1 1 300px; min-width: 0;">
<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 12px;">${esc(PCU.faq.etiqueta)}</div>
<h2 style="margin: 0 0 16px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 4.5vw, 54px); line-height: 1;">${esc(PCU.faq.titulo)}</h2>
<p class="rt" style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">${rt(PCU.faq.texto)}</p>
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

const eyebrow = (t, color = 'var(--brand-ink)') => `<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: ${color}; margin-bottom: 12px;">${esc(t)}</div>`;

function cursoPage(c) {
  const titulo = c.titulo;
  const msg = `Olá, Segbem! Vim pelo site e quero orçamento do curso ${titulo}.`;
  const media = c.foto
    ? `<div class="hero-media" style="flex: 1 1 400px; min-width: 0;"><img fetchpriority="high" src="${esc(c.foto)}" alt="Turma em treinamento de ${esc(c.nome.toLowerCase())}" style="width: 100%; height: 400px; object-fit: cover; border-radius: 10px; display: block;"></div>`
    : `<div style="flex: 1 1 400px; min-width: 0; height: 400px; border-radius: 10px; background: #14201a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(90px, 14vw, 170px); color: var(--c-destaque); line-height: 1;">${esc(c.code)}</span>
<div class="hz" style="position: absolute; left: 0; right: 0; bottom: 0; height: 14px;"></div>
</div>`;
  const publico = c.publico.map(p => `<li style="display: flex; gap: 10px; font-size: 17px; line-height: 1.5;">${CHECK}<span>${esc(p)}</span></li>`).join('\n');
  const conteudo = c.conteudo.map((x, i) => `<li style="padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 17px; line-height: 1.5; display: flex; gap: 14px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; color: var(--brand-ink); min-width: 26px;">${String(i + 1).padStart(2, '0')}</span><span>${esc(x)}</span></li>`).join('\n');
  const pratica = c.pratica ? `<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">${esc(c.pratica)}</p>` : '';
  const outros = CURSOS.filter(o => o.slug !== c.slug).slice(0, 4);
  const rel = outros.map(o => `<a class="card" href="${o.slug}.html" style="background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">${esc(o.code)}</span><span style="font-weight: 700; font-size: 17px;">${esc(o.nome)}</span></a>`).join('\n');
  const quando = c.quando ? `\n<p style="max-width: 1240px; margin: -24px auto 0; padding: 0 24px 48px; font-size: 15px; line-height: 1.6; color: var(--muted);">${esc(c.quando)}</p>` : '';
  const comp = str(TC.complemento);
  const body = `<section style="background: var(--c-escura); color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 56px 24px 64px; display: flex; flex-wrap: wrap; align-items: center; gap: 48px;">
<div style="flex: 1 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
<nav aria-label="Você está em" style="font-size: 14px; color: #b9cbbd;"><a href="index.html" style="color: #b9cbbd;">Início</a> / <a href="cursos.html" style="color: #b9cbbd;">Cursos</a> / ${esc(c.code)}</nav>
<div style="display: inline-flex; align-self: flex-start; background: color-mix(in srgb, var(--c-destaque) 14%, transparent); color: var(--c-destaque); font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px;">${esc(str(TC.etiqueta).replace(/\{codigo\}/g, c.code))}</div>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(42px, 5.6vw, 70px); line-height: 0.98; text-transform: uppercase;">${esc(titulo)}</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8; max-width: 560px;">${esc(c.lead)}${comp ? ' ' + esc(comp) : ''}</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px;">
<a class="btn-main" href="${wa(msg)}" style="background: var(--c-destaque); color: var(--c-destaque-txt); text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}${esc(TC.botao)}</a>
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
${fact('Modalidade', str(TC.modalidade))}
${fact('Certificado', str(TC.certificado))}
</div>${quando}
</section>

<section style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 80px 24px; display: flex; flex-wrap: wrap; gap: 56px;">
<div style="flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
${eyebrow(TC.publico_etiqueta)}
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">${esc(TC.publico_titulo)}</h2>
<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;">
${publico}
</ul>
${pratica}
</div>
<div style="flex: 1.3 1 460px; min-width: 0;">
${eyebrow(TC.conteudo_etiqueta)}
<h2 style="margin: 0 0 12px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">${esc(TC.conteudo_titulo)}</h2>
<ol style="list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line);">
${conteudo}
</ol>
</div>
</div>
</section>

<section style="background: var(--c-principal); color: var(--c-principal-txt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 28px;">
<div style="flex: 1 1 480px; min-width: 0;">
<h2 style="margin: 0 0 10px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 4vw, 48px); line-height: 1.02;">${esc(TC.chamada_titulo)}</h2>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #e1efe3;">${esc(TC.chamada_texto)}</p>
</div>
<a class="btn-main" href="${wa(msg)}" style="background: var(--c-destaque); color: var(--c-destaque-txt); text-decoration: none; font-weight: 700; font-size: 18px; padding: 18px 28px; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}${esc(TC.chamada_botao)}</a>
</div>
</section>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 80px; display: flex; flex-direction: column; gap: 24px;">
<div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px;">
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1;">${esc(TC.outros_titulo)}</h2>
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
      ? `<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="${esc(c.foto)}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
      : `<div style="height: 180px; background: #14201a; display: flex; align-items: center; justify-content: center;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 72px; color: var(--c-destaque);">${esc(c.code)}</span></div>`;
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
  const B = PCU.brigada || {};
  const brig = `<a class="card" href="index.html#brigada" style="background: #14201a; color: #ffffff; border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column;">
<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="${esc(img(B.imagem) || 'img/brigada.webp')}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>
<div style="padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--c-destaque);">Brigada</span>
<h2 style="margin: 0; font-size: 21px; font-weight: 700; line-height: 1.25;">${esc(B.titulo)}</h2>
<p style="margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #c9d3cb;">${esc(B.texto)}</p>
<span style="margin-top: auto; padding-top: 12px; font-weight: 700; color: var(--c-destaque);">Ver detalhes →</span>
</div>
</a>`;
  const N = PCU.nao_achou || {};
  const naoachou = `<div class="card" style="background: var(--c-principal); color: var(--c-principal-txt); border-radius: 12px; padding: 28px 26px; display: flex; flex-direction: column; gap: 14px; justify-content: center;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1.02;">${esc(N.titulo)}</span>
<span style="font-size: 16px; line-height: 1.55; color: #e1efe3;">${esc(N.texto)}</span>
<a class="btn-main" href="${wa(str(N.mensagem))}" style="align-self: flex-start; background: var(--c-destaque); color: var(--c-destaque-txt); text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">${WA_ICON}${esc(N.botao)}</a>
</div>`;
  const outros = lista(PCU.outros_cursos).map(o => `<a href="${wa('Olá, Segbem! Vim pelo site e quero orçamento do curso ' + o + '.')}" style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px; color: var(--ink); text-decoration: none;">${esc(o)}</a>`).join('\n');
  const body = `<section style="background: var(--c-escura); color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 72px; display: flex; flex-direction: column; gap: 20px;">
<div style="display: inline-flex; align-self: flex-start; background: color-mix(in srgb, var(--c-destaque) 14%, transparent); color: var(--c-destaque); font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px;">${esc(PCU.etiqueta)}</div>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(44px, 6vw, 76px); line-height: 0.98; text-transform: uppercase; max-width: 900px;">${esc(PCU.titulo)}</h1>
<p class="rt" style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8; max-width: 640px;">${rt(PCU.texto)}</p>
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
<span style="font-weight: 700; font-size: 15px; color: var(--muted); margin-right: 4px;">${esc(PCU.outros_titulo)}</span>
${outros}
</div>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--muted); max-width: 820px;">${esc(PCU.nota)}</p>
</div>
</section>

` + faqBlock();
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ_CURSOS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: txt(a) } })) };
  return page('cursos', str((PCU.seo || {}).titulo), str((PCU.seo || {}).descricao), body, { active: 'cursos.html', ld: faqLd });
}

function p404() {
  const body = `<section style="background: var(--c-escura); color: #ffffff;">
<div style="max-width: 900px; margin: 0 auto; padding: 120px 24px; display: flex; flex-direction: column; gap: 22px; align-items: flex-start;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 120px; line-height: 0.9; color: var(--c-destaque);">404</span>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 5vw, 56px); line-height: 1;">${esc(P404.titulo)}</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8;">${esc(P404.texto)}</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px;">
<a class="btn-main" href="/" style="background: var(--c-destaque); color: var(--c-destaque-txt); text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px;">${esc(P404.botao_inicio)}</a>
<a class="btn-ghost" href="/cursos" style="border: 2px solid rgba(255,255,255,0.5); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 17px; padding: 14px 24px; border-radius: 6px;">${esc(P404.botao_cursos)}</a>
</div>
</div>
</section>
<div class="hz" style="height: 12px;"></div>`;
  // na 404 os caminhos precisam ser absolutos, porque ela pode aparecer em qualquer URL
  return page('404', 'Página não encontrada | Segbem', 'Página não encontrada.', body, { noindex: true })
    .replace(/(href|src|poster)="(?!https?:|\/|#|mailto:|data:)([^"]+)"/g, '$1="/$2"');
}

for (const c of CURSOS) write(`${c.slug}.html`, cursoPage(c));
write('cursos.html', indice());
write('404.html', p404());

const urls = ['/', '/cursos', '/clientes', ...CURSOS.map(c => `/${c.slug}`)];
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n') + '\n</urlset>\n');
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// ---------------------------------------------------------------- imagens: checagem e ?v=hash
// As imagens têm cache de 30 dias (_headers). Se o cliente sobe um arquivo com o mesmo nome,
// o ?v= muda junto com o conteúdo e o navegador baixa a versão nova.
const hashes = {};
const faltando = new Set();
const versao = rel => {
  if (!(rel in hashes)) {
    const f = path.join(ROOT, 'public', rel); // lê da origem: o dist/ pode estar preso pelo wrangler dev
    hashes[rel] = fs.existsSync(f) ? crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8) : null;
  }
  return hashes[rel];
};
for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.html'))) {
  const p = path.join(OUT, f);
  const html = fs.readFileSync(p, 'utf8').replace(/((?:src|href|poster)=")(\/?)(img\/[^"?#]+)"/g, (m, a, barra, rel) => {
    const v = versao(decodeURI(rel));
    if (!v) { if (!/clientes\//.test(rel) || !m.includes('onerror')) faltando.add(rel); return m; }
    return `${a}${barra}${rel}?v=${v}"`;
  });
  fs.writeFileSync(p, html);
}
for (const rel of faltando) aviso(`a imagem "${rel}" não existe em public/`);

if (avisos.length) console.warn('\nAvisos:\n- ' + avisos.join('\n- ') + '\n');
console.log(`ok: ${CURSOS.length} cursos, ${CLIENTES.length} clientes, ${DEPO.length} depoimentos, seções da home: ${ordem.filter(o => o.mostrar).map(o => o.id).join(', ')} -> dist/`);
