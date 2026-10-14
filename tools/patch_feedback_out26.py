# Feedback da Segbem (13/out/2026): NR-01, CIPA/SIPAT, Lei Lucas, TESCAN e estados atendidos.
# Uso: python3 tools/patch_feedback_out26.py public   (depois rode tools/cursos.py public)
import sys, json, re

P = sys.argv[1]
ESTADOS = 'Goiás, Tocantins, Maranhão e Mato Grosso'

def sub(s, old, new, count=1):
    assert old in s, f'não achei: {old[:80]}'
    return s.replace(old, new, count)

# ------------------------------------------------------------------ home
f = f'{P}/index.html'
s = open(f, encoding='utf-8').read()

s = sub(s, 'brigada de emergência para empresas em Goiás. Orçamento pelo WhatsApp.',
        'CIPA, SIPAT, implantação da NR-01 e brigada de emergência. Atendemos GO, TO, MA e MT. Orçamento pelo WhatsApp.', 2)

ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s).group(1))
ld['areaServed'] = [{'@type': 'State', 'name': n} for n in ['Goiás', 'Tocantins', 'Maranhão', 'Mato Grosso']]
ld['knowsAbout'] = ['Segurança do trabalho', 'Higiene ocupacional', 'Treinamentos de NR', 'Implantação da NR-01', 'PGR', 'LTCAT', 'PCMSO', 'CIPA', 'SIPAT', 'eSocial SST', 'Brigada de emergência', 'Lei Lucas']
s = re.sub(r'(<script type="application/ld\+json">).*?(</script>)', lambda m: m.group(1) + json.dumps(ld, ensure_ascii=False) + m.group(2), s, count=1)

s = sub(s, '>Segurança e saúde no trabalho · Goiás</div>', '>Segurança e saúde no trabalho · GO, TO, MA e MT</div>')
s = sub(s, 'Higiene ocupacional, treinamentos de NRs, PGR, LTCAT, PCMSO, eSocial e brigada de emergência. Teoria em sala',
        'Implantação da NR-01, PGR, PCMSO, LTCAT, CIPA, SIPAT, treinamentos de NRs e brigada de emergência. Teoria em sala')
s = sub(s, '<span>Empresa credenciada junto ao Corpo de Bombeiros do Estado de Goiás para formação de brigada.</span>',
        '<span>Empresa credenciada junto ao Corpo de Bombeiros Militar do Estado de Goiás para ministrar treinamento de brigada de incêndio.</span>')

# cliente TESCAN na faixa de logos
s = sub(s, '<b>Zello</b></span>',
        '<b>Zello</b></span><span class="cl"><img src="img/clientes/tescan.png" alt="TESCAN" height="48" style="height: 48px" onerror="this.parentNode.classList.add(\'nologo\');this.remove()"><b>TESCAN</b></span>')

# NR-01 e CIPA/SIPAT logo depois dos cards de serviço
CARD = 'background: var(--alt); border-radius: 10px; padding: 26px 28px; display: flex; flex-direction: column; gap: 8px;'
novos = f'''<div style="display: flex; flex-wrap: wrap; gap: 20px;">
<div style="flex: 2 1 520px; min-width: 0; background: var(--alt); border-left: 6px solid #f2c200; border-radius: 10px; padding: 30px 32px; display: flex; flex-direction: column; gap: 10px;">
<div style="font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-ink);">Especialistas em</div>
<h3 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1.05; text-transform: uppercase;">Implantação da NR-01</h3>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: var(--muted);">Montamos o gerenciamento de riscos ocupacionais da sua empresa do zero. Levantamento em campo, inventário de riscos, plano de ação e PGR, já considerando os fatores de riscos psicossociais que a atualização da norma passou a exigir.</p>
</div>
<div style="flex: 1 1 280px; min-width: 0; {CARD}">
<h3 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 26px; text-transform: uppercase;">CIPA e SIPAT</h3>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: var(--muted);">Processo eleitoral e treinamento da CIPA, e a organização da SIPAT com palestras e atividades pra toda a equipe.</p>
</div>
</div>
'''
s = sub(s, '<div id="plano-mensal"', novos + '<div id="plano-mensal"')

# card Lei Lucas nos treinamentos
lucas = '''<a class="card" href="curso-lei-lucas.html" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; text-decoration: none; color: inherit;">
<div style="height: 220px; overflow: hidden;"><img class="card-img" src="img/leilucas.webp" alt="Instrutor demonstrando curativo e imobilização em aula de primeiros socorros" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>
<div style="padding: 22px 24px 26px; display: flex; flex-direction: column; gap: 6px;"><div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--brand-ink);">Lei Lucas</div><h3 style="margin: 0; font-size: 20px; font-weight: 700;">Primeiros socorros nas escolas</h3><p style="margin: 0; font-size: 15px; line-height: 1.5; color: var(--muted);">Capacitação anual de professores e funcionários, exigida pela Lei 13.722.</p></div>
</a>
'''
s = sub(s, '</a>\n</div>\n<a class="btn-main" href="cursos.html"', '</a>\n' + lucas + '</div>\n<a class="btn-main" href="cursos.html"')

s = sub(s, 'Formação credenciada junto ao Corpo de Bombeiros de Goiás,', 'Somos credenciados junto ao Corpo de Bombeiros Militar do Estado de Goiás pra ministrar o treinamento de brigada de incêndio,')
s = sub(s, 'Atendemos empresas em todo o estado de Goiás.</p>', f'Atendemos empresas em {ESTADOS}.</p>')
s = sub(s, '<span>Assessoria e Segurança do Trabalho · Goiás</span>', '<span>Assessoria e Segurança do Trabalho · Goiânia/GO · Atendemos GO, TO, MA e MT</span>')
open(f, 'w', encoding='utf-8').write(s)

# ------------------------------------------------------------------ clientes
f = f'{P}/clientes.html'
s = open(f, encoding='utf-8').read()
s = sub(s, 'Real Distribuidora, Caseratto Food, Dolcci Empório e Zello.', 'Real Distribuidora, Caseratto Food, Dolcci Empório, Zello e TESCAN.', 2)
s = sub(s, 'Indústria, logística, alimentação e varejo. Cada foto aqui',
        f'Indústria, construção, logística, alimentação e varejo, com clientes em {ESTADOS}. Cada foto aqui')
tescan = '''<article class="card" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
<div style="height: 260px; overflow: hidden;"><img class="card-img" src="img/c_tescan.webp" alt="Técnico da Segbem com capacete e uniforme TESCAN em visita à obra" style="width: 100%; height: 100%; object-fit: cover; object-position: center 25%; display: block;"></div>
<div style="padding: 24px 26px 28px; display: flex; flex-direction: column; gap: 10px;">
<div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);">Construtora de pavimentação</div>
<h2 style="margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 32px; text-transform: uppercase; line-height: 1;">TESCAN</h2>
<div style="display: flex; flex-wrap: wrap; gap: 6px;"><span style="background: var(--tag-bg); color: var(--tag-ink); font-weight: 600; font-size: 13px; padding: 6px 10px; border-radius: 4px;">Assessoria em campo</span></div>
</div>
</article>

'''
s = sub(s, '<article class="card" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">\n<div style="height: 260px; overflow: hidden;"><img class="card-img" src="img/c_igel.webp"',
        tescan + '<article class="card" style="background: var(--surface); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">\n<div style="height: 260px; overflow: hidden;"><img class="card-img" src="img/c_igel.webp"')
s = sub(s, 'Brigada de emergência e plano de abandono pra quem recebe público.</p>\n<div style="font-family: \'Barlow Condensed\', sans-serif; font-weight: 700; font-size: 17px; color: var(--brand-ink);">Brigada · NR-23 · PGR</div>',
        'Brigada, plano de abandono e primeiros socorros da Lei Lucas pra professores e funcionários.</p>\n<div style="font-family: \'Barlow Condensed\', sans-serif; font-weight: 700; font-size: 17px; color: var(--brand-ink);">Brigada · Lei Lucas · PGR</div>')
s = sub(s, 'Equipes em campo, EPI, altura e canteiro de obra.', 'Obras de pavimentação, equipes em campo, EPI, altura e canteiro.')
s = sub(s, 'Quem já atendemos: <strong style="color: var(--ink2); font-weight: 600;">Zello</strong>', 'Quem já atendemos: <strong style="color: var(--ink2); font-weight: 600;">TESCAN, Zello</strong>')
open(f, 'w', encoding='utf-8').write(s)

# ------------------------------------------------------------------ gerador de cursos
f = 'tools/cursos.py'
s = open(f, encoding='utf-8').read()
if 'curso-lei-lucas' not in s:
    s = sub(s, "\n]\nOUTROS = [", """
 dict(slug='curso-lei-lucas', code='Lei Lucas', nome='Primeiros socorros nas escolas', foto='leilucas.webp',
  lead='Pra professores e funcionários de escolas e espaços de recreação infantil, como pede a Lei 13.722/2018.',
  carga='Definida conforme a turma', reciclagem='Todo ano, como pede a lei',
  quando='A Lei Lucas obriga escolas públicas e particulares de educação básica e estabelecimentos de recreação infantil a capacitar professores e funcionários em primeiros socorros todo ano.',
  publico=['Professores e auxiliares de sala', 'Funcionários de escolas, creches e berçários', 'Equipes de buffets, brinquedotecas e espaços de recreação infantil'],
  conteudo=['Avaliação da cena e acionamento do SAMU e dos Bombeiros', 'Engasgo em bebês e crianças', 'Reanimação cardiopulmonar (RCP) infantil', 'Convulsão e desmaio', 'Quedas, fraturas e traumas na cabeça', 'Hemorragias, queimaduras e intoxicações'],
  pratica='Na prática, a equipe treina desengasgo e RCP em manequim, curativo e imobilização.'),
]
OUTROS = [""")
s = s.replace("'Atendemos empresas em todo o estado de Goiás. Pra outras regiões, fala com a gente que avaliamos.'",
              f"'Sim. Temos clientes em {ESTADOS}. Pra outras regiões, fala com a gente que avaliamos.'")
s = s.replace('em Goiânia e todo Goiás, in company ou presencial.', 'em Goiânia, Goiás e região, in company ou presencial.')
s = s.replace('Credenciada junto ao Corpo de Bombeiros de Goiás.', 'Credenciada junto ao Corpo de Bombeiros Militar de Goiás.')
s = s.replace('CIPA, plataforma elevatória, primeiros socorros e brigada.', 'CIPA, Lei Lucas, plataforma elevatória, primeiros socorros e brigada.')
open(f, 'w', encoding='utf-8').write(s)
print('ok')
