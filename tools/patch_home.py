# Patch único da home (pacote de melhorias out/2026). Mantido só como registro.
import re, json, html, sys
P = sys.argv[1]
t = open(f'{P}/index.html').read()

def sub(old, new, n=1):
    global t
    c = t.count(old)
    assert c == n, (old[:80], c)
    t = t.replace(old, new)

WA = 'https://wa.me/5562992125850'
SITE = 'https://segbemsst.com.br'

# 1) vídeo no topo
sub('<img fetchpriority="high" src="img/hero.webp" alt="Turma em treinamento prático de combate a incêndio com fogo real" style="width: 100%; height: 480px; object-fit: cover; border-radius: 10px; display: block;">',
    '<video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="img/hero-poster.webp" aria-label="Operador fazendo percurso entre cones com empilhadeira durante treinamento prático" style="width: 100%; height: 480px; object-fit: cover; border-radius: 10px; display: block;"><source src="video/hero-empilhadeira.mp4" type="video/mp4"></video>')
sub('>Combate a incêndio com fogo real, não só slide.</div>', '>Prática com a máquina de verdade, na operação do cliente.</div>')

# 2) menu
old_nav = '<a href="index.html#servicos">Assessoria</a><a href="index.html#treinamentos">Treinamentos</a><a href="index.html#brigada">Brigada</a><a href="clientes.html">Clientes</a>'
new_nav = '<a href="index.html#servicos">Assessoria</a><a href="cursos.html">Cursos</a><a href="index.html#brigada">Brigada</a><a href="clientes.html">Clientes</a><a href="index.html#faq">Dúvidas</a>'
sub(old_nav, new_nav)
sub('<a class="btn-ghost" href="#treinamentos"', '<a class="btn-ghost" href="cursos.html"')

# 3) cards de treinamento viram links pras páginas de curso
links = {'nr35': 'curso-nr-35.html', 'nr11': 'curso-nr-11.html', 'nr33': 'curso-nr-33.html', 'pemt': 'curso-pemt.html', 'quimico': 'curso-nr-20.html', 'socorros': 'curso-primeiros-socorros.html'}
for img, href in links.items():
    pat = re.compile(r'<div class="card" style="(background: var\(--surface\); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;)">\n(<div style="height: 220px; overflow: hidden;"><img class="card-img" src="img/' + img + r'\.webp".*?</p></div>)\n</div>', re.S)
    m = pat.search(t); assert m, img
    t = t[:m.start()] + f'<a class="card" href="{href}" style="{m.group(1)} text-decoration: none; color: inherit;">\n{m.group(2)}\n</a>' + t[m.end():]
sub('font-size: 20px; color: var(--brand-ink);">Emergência</div><h3 style="margin: 0; font-size: 20px; font-weight: 700;">Produtos perigosos</h3>',
    'font-size: 20px; color: var(--brand-ink);">NR-20</div><h3 style="margin: 0; font-size: 20px; font-weight: 700;">Inflamáveis e produtos perigosos</h3>')
for code, href in {'NR-05 CIPA': 'curso-nr-05.html', 'NR-10 Eletricidade': 'curso-nr-10.html', 'NR-12 Máquinas': 'curso-nr-12.html'}.items():
    sub(f'<span style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px;">{code}</span>',
        f'<a href="{href}" style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px; color: var(--ink); text-decoration: none;">{code} →</a>')
sub('<span style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px;">NR-20 Inflamáveis</span>\n', '')
sub('<span style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px;">NR-16 Anexo V, motociclistas</span>\n</div>',
    '<span style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px;">NR-16 Anexo V, motociclistas</span>\n</div>\n<a class="btn-main" href="cursos.html" style="align-self: flex-start; background: #17752f; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px;">Ver todos os cursos com carga horária e validade →</a>')

# 4) plano mensal dentro da seção de assessoria
check = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2c200" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; margin-top: 2px;"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
itens = ['PGR e inventário de riscos sempre atualizados', 'Cronograma de treinamentos e controle de vencimentos e reciclagens', 'Eventos de SST no eSocial dentro do prazo', 'Visitas técnicas periódicas na empresa', 'Apoio à CIPA ou ao designado de segurança', 'Suporte em fiscalização e dúvidas pelo WhatsApp']
lis = '\n'.join(f'<li style="display: flex; gap: 10px; align-items: flex-start; font-size: 16px; line-height: 1.45;">{check}<span>{i}</span></li>' for i in itens)
msg_plano = 'Olá, Segbem! Vim pelo site e quero saber mais sobre o plano mensal de assessoria em SST.'
plano = f'''<div id="plano-mensal" class="plano" style="display: flex; flex-wrap: wrap; gap: 40px; align-items: center; background: #14201a; color: #ffffff; border-radius: 14px; padding: 44px 40px; position: relative; overflow: hidden;">
<div style="flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 16px;">
<div style="font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #f2c200;">Assessoria mensal</div>
<h3 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.6vw, 44px); line-height: 1.02;">Um SESMT terceirizado, sem precisar contratar.</h3>
<p style="margin: 0; font-size: 17px; line-height: 1.6; color: #c9d3cb;">Pra empresa que não tem técnico de segurança próprio. A Segbem cuida da rotina de SST todo mês, com um valor fixo combinado conforme o tamanho e o grau de risco da empresa.</p>
<a class="btn-main" href="{WA}?text={html.escape(msg_plano.replace(' ', '%20'))}" style="align-self: flex-start; background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px;">Quero um plano pra minha empresa</a>
</div>
<div style="flex: 1 1 340px; min-width: 0;">
<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px;">
{lis}
</ul>
<p style="margin: 18px 0 0; font-size: 14px; color: #9fb0a4;">O que entra no plano é definido junto com você.</p>
</div>
</div>
'''
anchor = '</div>\n</div>\n</section>\n\n<section id="treinamentos"'
sub(anchor, '</div>\n' + plano + '</div>\n</section>\n\n<section id="treinamentos"')

# 5) setores
ic = {
 'ind': '<path d="M3 21V10l6 4V10l6 4V6h4v15z"/><path d="M7 17h2M12 17h2M17 17h1"/>',
 'log': '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
 'ali': '<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8M7 3v6"/><path d="M17 21V3c-2 1-3 3.5-3 7h3"/>',
 'sau': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
 'edu': '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
 'ser': '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 15h20v3H2z"/><path d="M12 7V4"/>',
}
setores = [
 ('ind', 'Indústria', 'Máquinas, empilhadeira, inflamáveis e eletricidade.', 'NR-12 · NR-11 · NR-20 · NR-10', 'Igel Embalagens, Camil'),
 ('log', 'Logística e distribuição', 'Movimentação de carga, trabalho em altura e brigada.', 'NR-11 · NR-35 · NR-23', 'GEO, Real Distribuidora'),
 ('ali', 'Alimentação e varejo', 'Brigada, rotas de fuga, higiene e conforto, calor em cozinha.', 'NR-23 · NR-24 · Higiene ocupacional', 'Caseratto, Dolcci Empório'),
 ('sau', 'Saúde', 'Riscos biológicos, brigada e programas obrigatórios.', 'NR-32 · Brigada · PGR', 'Hospitais, clínicas e laboratórios'),
 ('edu', 'Educação', 'Brigada de emergência e plano de abandono pra quem recebe público.', 'Brigada · NR-23 · PGR', 'Faculdade Inspirar'),
 ('ser', 'Serviços e construção', 'Equipes em campo, EPI, altura e canteiro de obra.', 'NR-06 · NR-18 · NR-35', 'Zello'),
]
cards = []
for k, nome, desc, nrs, quem in setores:
    cards.append(f'''<div class="card setor" style="background: var(--alt); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; gap: 12px;">
<span style="width: 48px; height: 48px; border-radius: 10px; background: var(--tag-bg); color: var(--brand-ink); display: inline-flex; align-items: center; justify-content: center;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ic[k]}</svg></span>
<h3 style="margin: 0; font-size: 21px; font-weight: 700;">{nome}</h3>
<p style="margin: 0; font-size: 15px; line-height: 1.55; color: var(--muted);">{desc}</p>
<div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 17px; color: var(--brand-ink);">{nrs}</div>
<div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line); font-size: 14px; color: var(--muted);">{'Quem já atendemos: ' if quem != 'Hospitais, clínicas e laboratórios' else ''}<strong style="color: var(--ink2); font-weight: 600;">{quem}</strong></div>
</div>''')
setores_sec = f'''<section id="setores" style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 96px 24px; display: flex; flex-direction: column; gap: 40px;">
<div style="max-width: 720px;">
<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 12px;">Setores</div>
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 4.5vw, 54px); line-height: 1;">Cada setor tem seus riscos. A gente já conhece os do seu.</h2>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
{chr(10).join(cards)}
</div>
</div>
</section>

'''
sub('<section id="brigada"', setores_sec + '<section id="brigada"')

# 6) FAQ
faq = [
 ('O certificado vale na fiscalização?', 'Vale. O certificado sai com o que a norma pede: nome do trabalhador, conteúdo, carga horária, data, local, instrutor e assinatura do responsável técnico. Junto vão a lista de presença e o registro da parte prática.'),
 ('Qual a diferença entre capacitado e autorizado?', 'Capacitado é quem fez o treinamento. Autorizado é quem, além de capacitado e apto no exame médico, recebeu autorização formal da empresa pra fazer aquela atividade. Em NRs como a 10, a 33 e a 35, o trabalhador só pode executar o serviço se estiver autorizado.'),
 ('De quanto em quanto tempo precisa reciclar?', 'Depende da norma. A NR-35 pede reciclagem a cada 2 anos, a NR-10 também, e a NR-33 todo ano. Também precisa refazer quando muda o procedimento ou a função, ou quando o trabalhador fica afastado por mais de 90 dias. A gente avisa a empresa quando estiver chegando a hora.'),
 ('Vocês fazem o treinamento dentro da minha empresa?', 'Sim. A maior parte das turmas é in company, com a parte prática feita nos equipamentos e no ambiente da própria empresa, o que deixa o treinamento muito mais próximo da realidade do trabalhador. Também organizamos turmas presenciais.'),
 ('Tem número mínimo de pessoas pra turma in company?', 'Depende do curso e da logística. Chama no WhatsApp com o curso e a quantidade de pessoas que a gente monta a proposta certa pra você.'),
 ('Atendem fora de Goiânia?', 'Atendemos empresas em todo o estado de Goiás. Pra outras regiões, fala com a gente que avaliamos.'),
 ('Minha empresa precisa ter PGR?', 'Na maioria dos casos, sim. O PGR é exigido pela NR-01 pra empresas com empregados. Existem dispensas pra MEI e pra algumas micro e pequenas empresas de grau de risco 1 e 2 sem exposição a agentes nocivos, mas isso precisa ser avaliado e declarado do jeito certo. A gente analisa o seu caso.'),
 ('Como funciona o orçamento?', 'É só chamar no WhatsApp ou usar o atendimento no canto da tela. Com o serviço, a quantidade de pessoas e a cidade, a gente já consegue te passar uma proposta.'),
]
faq_html = '\n'.join(f'''<details class="faq-item" style="border-bottom: 1px solid var(--line);">
<summary style="list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 0; font-size: 19px; font-weight: 700;">{html.escape(q)}<span class="faq-ic" aria-hidden="true"></span></summary>
<p style="margin: 0 0 22px; font-size: 17px; line-height: 1.65; color: var(--muted); max-width: 760px;">{html.escape(a)}</p>
</details>''' for q, a in faq)
faq_sec = f'''<section id="faq" style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 96px 24px; display: flex; flex-wrap: wrap; gap: 48px;">
<div style="flex: 1 1 300px; min-width: 0;">
<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 12px;">Dúvidas</div>
<h2 style="margin: 0 0 16px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 4.5vw, 54px); line-height: 1;">Perguntas que todo mundo faz.</h2>
<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">Não achou a sua? <a href="{WA}" style="font-weight: 700;">Pergunta direto no WhatsApp</a>.</p>
</div>
<div style="flex: 2 1 560px; min-width: 0; border-top: 1px solid var(--line);">
{faq_html}
</div>
</div>
</section>

'''
sub('<section id="contato"', faq_sec + '<section id="contato"')

# 7) head: canonical, og absoluto, dados estruturados
ld = {
 "@context": "https://schema.org", "@type": "ProfessionalService",
 "name": "Segbem Assessoria em Segurança do Trabalho", "legalName": "SEGBEM ASSESSORIA EM SEGURANCA DO TRABALHO LTDA",
 "url": SITE + "/", "image": SITE + "/img/og.jpg", "logo": SITE + "/img/logo.png",
 "telephone": "+55 62 99212-5850", "email": "segbem.sesmt@gmail.com", "taxID": "47.814.205/0001-74",
 "address": {"@type": "PostalAddress", "streetAddress": "Av. Anhanguera, 2987, Qd. 38 Lt. 96, Sala 911, Setor Central", "addressLocality": "Goiânia", "addressRegion": "GO", "postalCode": "74043-011", "addressCountry": "BR"},
 "areaServed": {"@type": "State", "name": "Goiás"},
 "sameAs": ["https://www.instagram.com/segbem.sst/"],
 "knowsAbout": ["Segurança do trabalho", "Higiene ocupacional", "Treinamentos de NR", "PGR", "LTCAT", "PCMSO", "eSocial SST", "Brigada de emergência"]
}
faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
sub('<meta property="og:image" content="img/hero.webp">',
    f'<meta property="og:image" content="{SITE}/img/og.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:url" content="{SITE}/">\n<meta property="og:locale" content="pt_BR">\n<meta name="twitter:card" content="summary_large_image">\n<link rel="canonical" href="{SITE}/">\n'
    f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>')

# 8) vídeo no celular mais baixo
sub('section img[style*="height: 480px"],section img[style*="height: 520px"]{height:300px !important}',
    'section img[style*="height: 480px"],section video[style*="height: 480px"],section img[style*="height: 520px"]{height:300px !important}')

open(f'{P}/index.html', 'w').write(t)
print('home ok')
