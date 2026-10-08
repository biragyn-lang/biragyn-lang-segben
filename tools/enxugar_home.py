# Enxuga a home (out/2026). Registro da mudança, roda uma vez só.
import re, json, sys
P = sys.argv[1]
t = open(f'{P}/index.html', encoding='utf-8').read()
c = open(f'{P}/clientes.html', encoding='utf-8').read()

def section(txt, marker):
    # devolve (inicio, fim) da <section> que contém o marcador
    i = txt.index(marker)
    s = txt.rfind('<section', 0, i + len('<section'))
    e = txt.index('</section>', i) + len('</section>\n\n')
    return s, e

# 1) tira "Como funciona"
s, e = section(t, '>Como funciona</div>'); t = t[:s] + t[e:]
# 2) tira a galeria "Na prática"
s, e = section(t, '>Na prática</div>'); t = t[:s] + t[e:]
# 3) leva "Setores" pra página de clientes
s, e = section(t, '<section id="setores"'); setores = t[s:e]; t = t[:s] + t[e:]
anchor = '<footer'
i = c.index(anchor)
c = c[:i] + setores + c[i:]
# 4) tira a lista de NRs da home (fica na página de cursos)
m = re.search(r'<div class="extra"[^>]*>\n<span[^>]*>Também oferecemos</span>.*?\n</div>\n', t, re.S)
assert m; t = t[:m.start()] + t[m.end():]
# 5) avaliações sobem pra logo depois dos treinamentos
s, e = section(t, '<section id="avaliacoes"'); aval = t[s:e]; t = t[:s] + t[e:]
i = t.index('<section id="brigada"'); t = t[:i] + aval + t[i:]
# 6) FAQ da home com 4 perguntas
keep = ['O certificado vale na fiscalização?', 'Qual a diferença entre capacitado e autorizado?', 'De quanto em quanto tempo precisa reciclar?', 'Vocês fazem o treinamento dentro da minha empresa?']
items = list(re.finditer(r'<details class="faq-item".*?</details>\n', t, re.S))
for m in reversed(items):
    q = re.search(r'<summary[^>]*>(.*?)<span', m.group(0)).group(1)
    if q not in keep:
        t = t[:m.start()] + t[m.end():]
m = re.search(r'<script type="application/ld\+json">(\{"@context": "https://schema.org", "@type": "FAQPage".*?)</script>', t)
d = json.loads(m.group(1)); d['mainEntity'] = [x for x in d['mainEntity'] if x['name'] in keep]
t = t[:m.start(1)] + json.dumps(d, ensure_ascii=False) + t[m.end(1):]
t = t.replace('Não achou a sua? <a href="https://wa.me/5562992125850" style="font-weight: 700;">Pergunta direto no WhatsApp</a>.',
              'Tem mais respostas na <a href="cursos.html#duvidas" style="font-weight: 700;">página de cursos</a>, ou <a href="https://wa.me/5562992125850" style="font-weight: 700;">pergunta direto no WhatsApp</a>.')
open(f'{P}/index.html', 'w', encoding='utf-8').write(t)
open(f'{P}/clientes.html', 'w', encoding='utf-8').write(c)
print('ok')
