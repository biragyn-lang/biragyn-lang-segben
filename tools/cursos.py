# Gera as páginas de curso, o índice de cursos e a 404 a partir da home.
# Uso: python3 tools/cursos.py public
# Pra mudar um curso, edite a lista CURSOS abaixo e rode de novo.
import re, sys, html, json

P = sys.argv[1]
SITE = 'https://segbemsst.com.br'
WA = '5562992125850'
home = open(f'{P}/index.html', encoding='utf-8').read()

STYLE = re.search(r'<style>.*?</style>', home, re.S).group(0)
THEME = re.search(r"<script>\(function\(\)\{var t;try.*?</script>", home, re.S).group(0)
HEADER = re.search(r'<header class="site-header">.*?</header>', home, re.S).group(0)
FOOTER = re.search(r'<footer.*?</footer>', home, re.S).group(0)
WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>'
CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; margin-top: 2px; color: var(--brand-ink);"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'

def esc(s): return html.escape(s, quote=True)
def wa(msg): return f'https://wa.me/{WA}?text=' + msg.replace('%', '%25').replace(' ', '%20').replace('!', '%21').replace(',', '%2C')

def header(active):
    h = HEADER
    h = h.replace(' aria-current="page"', '')
    if active:
        h = h.replace(f'<a href="{active}">', f'<a href="{active}" aria-current="page">', 1)
    return h

def page(slug, title, desc, body, active=None, ld=None, image='img/og.jpg', noindex=False):
    url = f'{SITE}/' if slug == 'index' else f'{SITE}/{slug}'
    extra_ld = f'\n<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' if ld else ''
    robots = '\n<meta name="robots" content="noindex">' if noindex else ''
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">{robots}
<link rel="canonical" href="{url}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{SITE}/{image}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d3b24">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/png" href="img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&amp;family=Barlow:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
{STYLE}
{THEME}
<link rel="stylesheet" href="assets/theme.css">
<link rel="stylesheet" href="assets/anim.css">
<link rel="stylesheet" href="assets/chat.css">{extra_ld}
</head>
<body>
<div style="font-family: 'Barlow', system-ui, sans-serif; color: var(--ink); background: var(--surface); min-height: 100%;">

{header(active)}

{body}

{FOOTER}

</div>
<script src="assets/anim.js" defer></script>
<script src="assets/chat.js" defer></script>
</body>
</html>
'''

# ---------------------------------------------------------------- dados
# Cargas horárias marcadas com conf=True seguem o mínimo previsto na norma.
# As demais ficam como "definida conforme..." até a Segbem confirmar.
CURSOS = [
 dict(slug='curso-nr-35', code='NR-35', nome='Trabalho em altura', foto='nr35.webp',
  lead='Pra quem trabalha acima de 2 metros do nível inferior, onde existe risco de queda.',
  carga='8 horas, teoria e prática', reciclagem='A cada 2 anos, com 8 horas',
  quando='Também precisa refazer quando muda o procedimento ou a empresa, depois de um acidente ou quando o trabalhador volta de afastamento maior que 90 dias.',
  publico=['Equipes de manutenção, montagem e instalação', 'Quem trabalha em telhado, estrutura, andaime, escada ou plataforma', 'Logística, construção civil e indústria'],
  conteudo=['Normas e regulamentos do trabalho em altura', 'Análise de risco e condições que impedem o trabalho', 'Riscos do trabalho em altura e como prevenir', 'Proteção coletiva: sistemas, equipamentos e procedimentos', 'EPI: escolha, inspeção, conservação e limites de uso', 'Acidentes típicos em altura', 'Conduta em emergência, noções de resgate e primeiros socorros'],
  pratica='Na prática, cada participante veste, ajusta e inspeciona o cinto paraquedista e usa os sistemas de ancoragem.'),
 dict(slug='curso-nr-33', code='NR-33', nome='Espaço confinado', foto='nr33.webp',
  lead='Pra quem entra, vigia ou supervisiona trabalho em tanque, silo, galeria, poço, boca de visita e outros espaços confinados.',
  carga='16 horas pra trabalhador autorizado e vigia, 40 horas pra supervisor de entrada', reciclagem='Todo ano, com 8 horas',
  quando='A capacitação também precisa ser refeita quando muda o procedimento ou depois de um acidente no espaço confinado.',
  publico=['Trabalhador autorizado', 'Vigia', 'Supervisor de entrada'],
  conteudo=['Definição e identificação de espaços confinados', 'Reconhecimento, avaliação e controle de riscos', 'Funcionamento dos equipamentos, como o detector multigás', 'Procedimentos e uso da Permissão de Entrada e Trabalho (PET)', 'Noções de resgate e primeiros socorros'],
  pratica='Na prática, a turma faz a medição de gases com detector multigás, a sinalização da área e simula a entrada com a PET preenchida.'),
 dict(slug='curso-nr-11', code='NR-11', nome='Empilhadeira e movimentação de carga', foto='nr11.webp',
  lead='Pra operadores de empilhadeira, empilhadeira retrátil, paleteira elétrica e outros equipamentos de movimentação.',
  carga='Definida conforme o equipamento e a experiência da turma', reciclagem='Cartão de operador com validade de 1 ano',
  quando='Pela NR-11, o operador precisa de cartão de identificação, revalidado todo ano com exame de saúde.',
  publico=['Operadores de empilhadeira e retrátil', 'Operadores de paleteira elétrica', 'Equipes de almoxarifado, expedição e centro de distribuição'],
  conteudo=['Tipos de equipamento e seus limites', 'Inspeção antes do uso', 'Capacidade de carga, centro de gravidade e estabilidade', 'Circulação, sinalização e convivência com pedestres', 'Abastecimento e troca de bateria ou cilindro de gás', 'Prática de manobras'],
  pratica='Na prática, o operador faz percurso entre cones, empilhamento e manobra com o equipamento da própria empresa.'),
 dict(slug='curso-nr-10', code='NR-10', nome='Segurança em eletricidade', foto=None,
  lead='Pra quem trabalha com instalações elétricas ou perto delas.',
  carga='40 horas no curso básico, mais 40 horas no complementar SEP', reciclagem='A cada 2 anos',
  quando='Também precisa reciclar quando troca de função ou de empresa, volta de afastamento maior que 3 meses ou quando a instalação muda muito.',
  publico=['Eletricistas e técnicos', 'Equipes de manutenção', 'Quem atua no sistema elétrico de potência (SEP), no curso complementar'],
  conteudo=['Riscos em instalações e serviços com eletricidade', 'Técnicas de análise de risco', 'Medidas de controle do risco elétrico', 'Normas técnicas brasileiras', 'EPC e EPI', 'Rotinas de trabalho e procedimentos', 'Documentação das instalações elétricas', 'Proteção e combate a incêndio', 'Acidentes de origem elétrica e primeiros socorros', 'Responsabilidades'],
  pratica=None),
 dict(slug='curso-nr-12', code='NR-12', nome='Segurança em máquinas e equipamentos', foto=None,
  lead='Pra quem opera, ajusta, limpa ou faz manutenção de máquinas e equipamentos.',
  carga='Definida conforme a máquina e a função', reciclagem='Sempre que mudar a máquina, o método ou o processo',
  quando='A capacitação é específica pra máquina que o trabalhador usa e precisa ser atualizada quando algo muda nela.',
  publico=['Operadores de máquinas', 'Equipes de manutenção e setup', 'Supervisores de produção'],
  conteudo=['Descrição e funcionamento da máquina', 'Riscos de cada etapa da operação', 'Dispositivos e sistemas de segurança', 'Procedimentos de trabalho seguro e bloqueio de energias', 'Permissões e proibições', 'Conduta em emergência'],
  pratica='Na prática, o treinamento é feito na máquina que o trabalhador usa no dia a dia.'),
 dict(slug='curso-nr-20', code='NR-20', nome='Inflamáveis e combustíveis', foto='quimico.webp',
  lead='Pra quem trabalha em instalações que armazenam, transferem ou manuseiam inflamáveis e combustíveis.',
  carga='Definida pela classe da instalação e pela atividade do trabalhador', reciclagem='Periódica, conforme o nível do curso',
  quando='O nível do curso (iniciação, básico, intermediário ou avançado) depende do que o trabalhador faz na instalação.',
  publico=['Equipes de armazém e expedição de inflamáveis', 'Postos, indústria química e alimentícia', 'Manutenção e brigada'],
  conteudo=['Características e riscos de inflamáveis e combustíveis', 'Controle de fontes de ignição', 'Proteção e combate a incêndio com inflamáveis', 'Procedimentos em vazamento e derramamento', 'Uso de EPI e kit de emergência'],
  pratica='Na prática, a turma simula um derramamento em armazém de inflamáveis, com contenção e EPI completo.'),
 dict(slug='curso-nr-05', code='NR-05', nome='CIPA', foto='g2.webp',
  lead='Pra membros da CIPA e pro designado de segurança da empresa.',
  carga='De 8 a 20 horas, conforme o grau de risco da empresa', reciclagem='A cada mandato',
  quando='A carga é de 8, 12, 16 ou 20 horas pros graus de risco 1, 2, 3 e 4.',
  publico=['Membros eleitos e indicados da CIPA', 'Designado da NR-05 em empresas sem CIPA'],
  conteudo=['Estudo do ambiente, das condições de trabalho e dos riscos', 'Noções sobre acidentes e doenças do trabalho', 'Metodologia de investigação e análise de acidentes', 'Princípios de higiene do trabalho e medidas de prevenção', 'Noções de legislação trabalhista e previdenciária em SST', 'Prevenção ao assédio sexual e outras formas de violência no trabalho'],
  pratica=None),
 dict(slug='curso-pemt', code='PEMT', nome='Plataforma elevatória', foto='pemt.webp',
  lead='Pra operadores de plataforma elevatória móvel de trabalho, tipo tesoura e lança.',
  carga='Definida conforme o tipo de plataforma', reciclagem='Quando muda o equipamento ou o procedimento',
  quando='O treinamento segue a NR-18 e a NR-12 e é feito no modelo de plataforma que a equipe usa.',
  publico=['Operadores de plataforma tesoura e lança', 'Equipes de manutenção predial e industrial', 'Montagem e instalações'],
  conteudo=['Tipos de plataforma e aplicações', 'Inspeção e checklist antes do uso', 'Riscos de tombamento, queda, choque e prensamento', 'Cinto e ponto de ancoragem na cesta', 'Emergência e descida manual', 'Prática de operação'],
  pratica='Na prática, o operador faz a inspeção, sobe, posiciona e desce a plataforma com acompanhamento do instrutor.'),
 dict(slug='curso-primeiros-socorros', code='Socorro', nome='Primeiros socorros', foto='socorros.webp',
  lead='Pra brigadistas, líderes e qualquer equipe que precisa saber agir até o socorro chegar.',
  carga='Definida conforme a turma', reciclagem='Recomendada todo ano',
  quando='Combina bem com a formação de brigada de emergência.',
  publico=['Brigadistas', 'Líderes e supervisores', 'Equipes que trabalham longe de atendimento médico'],
  conteudo=['Avaliação da cena e acionamento do socorro', 'Reanimação cardiopulmonar (RCP)', 'Engasgo', 'Hemorragias, queimaduras e fraturas', 'Imobilização e transporte de vítima'],
  pratica='Na prática, a turma treina RCP em manequim, imobilização e transporte de vítima.'),
]
OUTROS = ['NR-01 Gerenciamento de riscos', 'NR-06 EPI', 'NR-17 Ergonomia', 'NR-18 Construção civil', 'NR-23 Combate a incêndio', 'NR-24 Higiene e conforto', 'NR-31 Trabalho rural', 'NR-32 Serviços de saúde', 'NR-36 Frigoríficos', 'NR-16 Anexo V, motociclistas']


FAQ = [
 ('O certificado vale na fiscalização?', 'Vale. O certificado sai com o que a norma pede: nome do trabalhador, conteúdo, carga horária, data, local, instrutor e assinatura do responsável técnico. Junto vão a lista de presença e o registro da parte prática.'),
 ('Qual a diferença entre capacitado e autorizado?', 'Capacitado é quem fez o treinamento. Autorizado é quem, além de capacitado e apto no exame médico, recebeu autorização formal da empresa pra fazer aquela atividade. Em NRs como a 10, a 33 e a 35, o trabalhador só pode executar o serviço se estiver autorizado.'),
 ('De quanto em quanto tempo precisa reciclar?', 'Depende da norma. A NR-35 pede reciclagem a cada 2 anos, a NR-10 também, e a NR-33 todo ano. Também precisa refazer quando muda o procedimento ou a função, ou quando o trabalhador fica afastado por mais de 90 dias. A gente avisa a empresa quando estiver chegando a hora.'),
 ('Vocês fazem o treinamento dentro da minha empresa?', 'Sim. A maior parte das turmas é in company, com a parte prática feita nos equipamentos e no ambiente da própria empresa. Também organizamos turmas presenciais.'),
 ('Tem número mínimo de pessoas pra turma in company?', 'Depende do curso e da logística. Chama no WhatsApp com o curso e a quantidade de pessoas que a gente monta a proposta certa pra você.'),
 ('Atendem fora de Goiânia?', 'Atendemos empresas em todo o estado de Goiás. Pra outras regiões, fala com a gente que avaliamos.'),
 ('Como funciona o orçamento?', 'É só chamar no WhatsApp ou usar o atendimento no canto da tela. Com o curso, a quantidade de pessoas e a cidade, a gente já consegue te passar uma proposta.'),
]

def faq_block():
    items = '\n'.join(f'''<details class="faq-item" style="border-bottom: 1px solid var(--line);">
<summary style="list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 0; font-size: 19px; font-weight: 700;">{esc(q)}<span class="faq-ic" aria-hidden="true"></span></summary>
<p style="margin: 0 0 22px; font-size: 17px; line-height: 1.65; color: var(--muted); max-width: 760px;">{esc(a)}</p>
</details>''' for q, a in FAQ)
    return f'''<section id="duvidas" style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 88px 24px; display: flex; flex-wrap: wrap; gap: 48px;">
<div style="flex: 1 1 300px; min-width: 0;">
<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 12px;">Dúvidas</div>
<h2 style="margin: 0 0 16px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(36px, 4.5vw, 54px); line-height: 1;">Perguntas sobre os cursos.</h2>
<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">Não achou a sua? <a href="https://wa.me/{WA}" style="font-weight: 700;">Pergunta direto no WhatsApp</a>.</p>
</div>
<div style="flex: 2 1 560px; min-width: 0; border-top: 1px solid var(--line);">
{items}
</div>
</div>
</section>'''

# ---------------------------------------------------------------- blocos
def fact(label, value):
    return f'''<div style="background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;">
<span style="font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted);">{label}</span>
<span style="font-size: 17px; font-weight: 600; line-height: 1.4;">{esc(value)}</span>
</div>'''

def eyebrow(t, color='var(--brand-ink)'):
    return f'<div style="font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: {color}; margin-bottom: 12px;">{t}</div>'

def curso_page(c):
    titulo = f"{c['code']} {c['nome']}" if c['code'] != 'Socorro' else c['nome']
    msg = f'Olá, Segbem! Vim pelo site e quero orçamento do curso {titulo}.'
    if c['foto']:
        media = f'<div class="hero-media" style="flex: 1 1 400px; min-width: 0;"><img fetchpriority="high" src="img/{c["foto"]}" alt="Turma em treinamento de {esc(c["nome"].lower())}" style="width: 100%; height: 400px; object-fit: cover; border-radius: 10px; display: block;"></div>'
    else:
        media = f'''<div style="flex: 1 1 400px; min-width: 0; height: 400px; border-radius: 10px; background: #14201a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(90px, 14vw, 170px); color: #f2c200; line-height: 1;">{c['code']}</span>
<div class="hz" style="position: absolute; left: 0; right: 0; bottom: 0; height: 14px;"></div>
</div>'''
    publico = '\n'.join(f'<li style="display: flex; gap: 10px; font-size: 17px; line-height: 1.5;">{CHECK}<span>{esc(p)}</span></li>' for p in c['publico'])
    conteudo = '\n'.join(f'<li style="padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 17px; line-height: 1.5; display: flex; gap: 14px;"><span style="font-family: \'Barlow Condensed\', sans-serif; font-weight: 800; color: var(--brand-ink); min-width: 26px;">{i+1:02d}</span><span>{esc(x)}</span></li>' for i, x in enumerate(c['conteudo']))
    pratica = f'<p style="margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted);">{esc(c["pratica"])}</p>' if c['pratica'] else ''
    outros = [o for o in CURSOS if o['slug'] != c['slug']][:4]
    rel = '\n'.join(f'''<a class="card" href="{o['slug']}.html" style="background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px;"><span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">{o['code']}</span><span style="font-weight: 700; font-size: 17px;">{esc(o['nome'])}</span></a>''' for o in outros)
    body = f'''<section style="background: #0d3b24; color: #ffffff;">
<div style="max-width: 1240px; margin: 0 auto; padding: 56px 24px 64px; display: flex; flex-wrap: wrap; align-items: center; gap: 48px;">
<div style="flex: 1 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
<nav aria-label="Você está em" style="font-size: 14px; color: #b9cbbd;"><a href="index.html" style="color: #b9cbbd;">Início</a> / <a href="cursos.html" style="color: #b9cbbd;">Cursos</a> / {esc(c['code'])}</nav>
<div style="display: inline-flex; align-self: flex-start; background: rgba(242,194,0,0.14); color: #f2c200; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 14px; border-radius: 4px;">Curso {esc(c['code'])} em Goiânia e Goiás</div>
<h1 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(42px, 5.6vw, 70px); line-height: 0.98; text-transform: uppercase;">{esc(titulo)}</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.6; color: #d5e4d8; max-width: 560px;">{esc(c['lead'])} Turma in company, com teoria e prática, ou turma presencial.</p>
<div style="display: flex; flex-wrap: wrap; gap: 12px;">
<a class="btn-main" href="{wa(msg)}" style="background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 26px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">{WA_ICON}Pedir orçamento deste curso</a>
</div>
</div>
{media}
</div>
</section>
<div class="hz" style="height: 12px;"></div>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 48px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
{fact('Carga horária', c['carga'])}
{fact('Reciclagem', c['reciclagem'])}
{fact('Modalidade', 'In company ou turma presencial')}
{fact('Certificado', 'Ao final, com lista de presença')}
</div>
<p style="max-width: 1240px; margin: -24px auto 0; padding: 0 24px 48px; font-size: 15px; line-height: 1.6; color: var(--muted);">{esc(c['quando'])}</p>
</section>

<section style="background: var(--surface);">
<div style="max-width: 1240px; margin: 0 auto; padding: 80px 24px; display: flex; flex-wrap: wrap; gap: 56px;">
<div style="flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 20px;">
{eyebrow('Pra quem é')}
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">Quem precisa fazer</h2>
<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;">
{publico}
</ul>
{pratica}
</div>
<div style="flex: 1.3 1 460px; min-width: 0;">
{eyebrow('Conteúdo')}
<h2 style="margin: 0 0 12px; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: clamp(32px, 3.8vw, 46px); line-height: 1.02;">O que a turma aprende</h2>
<ol style="list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line);">
{conteudo}
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
<a class="btn-main" href="{wa(msg)}" style="background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 18px; padding: 18px 28px; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;">{WA_ICON}Chamar no WhatsApp</a>
</div>
</section>

<section style="background: var(--alt);">
<div style="max-width: 1240px; margin: 0 auto; padding: 64px 24px 80px; display: flex; flex-direction: column; gap: 24px;">
<div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px;">
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1;">Outros cursos</h2>
<a href="cursos.html" style="font-weight: 700; padding: 10px 0;">Ver todos →</a>
</div>
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px;">
{rel}
</div>
</div>
</section>'''
    ld = {"@context": "https://schema.org", "@type": "Course", "name": f"Curso {titulo}", "description": c['lead'],
          "inLanguage": "pt-BR", "provider": {"@type": "Organization", "name": "Segbem Assessoria em Segurança do Trabalho", "sameAs": SITE + "/"}}
    desc = f"Curso {titulo} em Goiânia e todo Goiás, in company ou presencial. {c['lead']} Carga horária: {c['carga'].lower()}. Orçamento pelo WhatsApp."
    img = f"img/{c['foto']}" if c['foto'] else 'img/og.jpg'
    return page(c['slug'], f"Curso {titulo} em Goiânia | Segbem", desc, body, active='cursos.html', ld=ld, image=img)

def indice():
    cards = []
    for c in CURSOS:
        titulo = c['nome']
        if c['foto']:
            top = f'<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="img/{c["foto"]}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>'
        else:
            top = f'<div style="height: 180px; background: #14201a; display: flex; align-items: center; justify-content: center;"><span style="font-family: \'Barlow Condensed\', sans-serif; font-weight: 800; font-size: 72px; color: #f2c200;">{c["code"]}</span></div>'
        cards.append(f'''<a class="card" href="{c['slug']}.html" style="background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; display: flex; flex-direction: column;">
{top}
<div style="padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">{c['code']}</span>
<h2 style="margin: 0; font-size: 21px; font-weight: 700; line-height: 1.25;">{esc(titulo)}</h2>
<dl style="margin: 6px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 14px; line-height: 1.45;">
<dt style="color: var(--muted);">Carga</dt><dd style="margin: 0;">{esc(c['carga'])}</dd>
<dt style="color: var(--muted);">Reciclagem</dt><dd style="margin: 0;">{esc(c['reciclagem'])}</dd>
</dl>
<span style="margin-top: auto; padding-top: 12px; font-weight: 700; color: var(--brand-ink);">Ver detalhes →</span>
</div>
</a>''')
    brig = '''<a class="card" href="index.html#brigada" style="background: #14201a; color: #ffffff; border-radius: 12px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column;">
<div style="height: 180px; overflow: hidden;"><img class="card-img" loading="lazy" src="img/brigada.webp" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>
<div style="padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: #f2c200;">Brigada</span>
<h2 style="margin: 0; font-size: 21px; font-weight: 700; line-height: 1.25;">Brigada de emergência</h2>
<p style="margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #c9d3cb;">Básica 4h, intermediária 8h e avançada 24h. Credenciada junto ao Corpo de Bombeiros de Goiás.</p>
<span style="margin-top: auto; padding-top: 12px; font-weight: 700; color: #f2c200;">Ver detalhes →</span>
</div>
</a>'''
    naoachou = f'''<div class="card" style="background: #17752f; color: #ffffff; border-radius: 12px; padding: 28px 26px; display: flex; flex-direction: column; gap: 14px; justify-content: center;">
<span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1.02;">Não achou o seu curso?</span>
<span style="font-size: 16px; line-height: 1.55; color: #e1efe3;">Esses são os principais. A Segbem realiza outros treinamentos de NR conforme a necessidade da sua empresa. Fala com a gente que a gente monta a turma.</span>
<a class="btn-main" href="{wa('Olá, Segbem! Vim pelo site e procuro um curso que não achei na lista.')}" style="align-self: flex-start; background: #f2c200; color: #14201a; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 6px; display: inline-flex; align-items: center; gap: 10px;">{WA_ICON}Consultar outro curso</a>
</div>'''
    outros = '\n'.join(f'<a href="{wa("Olá, Segbem! Vim pelo site e quero orçamento do curso " + o + ".")}" style="background: var(--surface); border: 1px solid var(--line); padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 15px; color: var(--ink); text-decoration: none;">{esc(o)}</a>' for o in OUTROS)
    body = f'''<section style="background: #0d3b24; color: #ffffff;">
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
{chr(10).join(cards)}
{brig}
{naoachou}
</div>
<div class="extra" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
<span style="font-weight: 700; font-size: 15px; color: var(--muted); margin-right: 4px;">Outros cursos que realizamos</span>
{outros}
</div>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: var(--muted); max-width: 820px;">As cargas horárias informadas seguem o mínimo previsto em cada norma. A turma pode ter mais horas conforme a necessidade da empresa.</p>
</div>
</section>

''' + faq_block()
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    return page('cursos', 'Cursos de NR em Goiânia: NR-35, NR-33, NR-11, NR-10 e mais | Segbem',
                'Treinamentos de NR em Goiânia e todo Goiás: NR-35, NR-33, NR-11, NR-10, NR-12, NR-20, CIPA, plataforma elevatória, primeiros socorros e brigada. In company ou presencial.',
                body, active='cursos.html', ld=faq_ld)

def p404():
    body = f'''<section style="background: #0d3b24; color: #ffffff;">
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
<div class="hz" style="height: 12px;"></div>'''
    out = page('404', 'Página não encontrada | Segbem', 'Página não encontrada.', body, noindex=True)
    # na 404 os caminhos precisam ser absolutos, porque ela pode aparecer em qualquer URL
    out = re.sub(r'(href|src)="(?!https?:|/|#|mailto:|data:)([^"]+)"', r'\1="/\2"', out)
    return out

for c in CURSOS:
    open(f"{P}/{c['slug']}.html", 'w', encoding='utf-8').write(curso_page(c))
open(f'{P}/cursos.html', 'w', encoding='utf-8').write(indice())
open(f'{P}/404.html', 'w', encoding='utf-8').write(p404())

# sitemap
urls = ['/', '/cursos', '/clientes'] + [f"/{c['slug']}" for c in CURSOS]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(f'  <url><loc>{SITE}{u}</loc></url>' for u in urls) + '\n</urlset>\n'
open(f'{P}/sitemap.xml', 'w').write(sm)
open(f'{P}/robots.txt', 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
print('ok', len(CURSOS), 'cursos')
