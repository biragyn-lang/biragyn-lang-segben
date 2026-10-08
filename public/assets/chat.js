// Assistente simples: faz algumas perguntas e manda tudo pronto pro WhatsApp. Sem servidor.
(function () {
  var WA = '5562992125850';
  var ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>';

  var root = document.createElement('div');
  root.className = 'sb';
  root.innerHTML =
    '<button class="sb-launch" type="button" aria-haspopup="dialog" aria-controls="sb-panel">' + ICON + '<span class="lbl">Fale com a gente</span><span class="dot" aria-hidden="true"></span></button>' +
    '<section class="sb-panel" id="sb-panel" role="dialog" aria-modal="false" aria-label="Atendimento Segbem">' +
      '<div class="sb-head"><img src="img/favicon.png" alt=""><div class="t"><strong>Segbem</strong><span>Atendimento pelo WhatsApp</span></div>' +
      '<button class="sb-x" type="button" aria-label="Fechar atendimento"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="sb-body" aria-live="polite"></div>' +
      '<form class="sb-foot"><label for="sb-in" style="position:absolute;left:-9999px">Sua resposta</label><input id="sb-in" type="text" autocomplete="off" placeholder="Escolha uma opção acima" disabled><button type="submit" aria-label="Enviar" disabled><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>' +
      '<a class="sb-direct" href="https://wa.me/' + WA + '" target="_blank" rel="noopener">Prefiro falar direto no WhatsApp</a>' +
    '</section>';
  document.body.appendChild(root);

  var html = document.documentElement;
  var launch = root.querySelector('.sb-launch');
  var panel = root.querySelector('.sb-panel');
  var body = root.querySelector('.sb-body');
  var form = root.querySelector('.sb-foot');
  var input = form.querySelector('input');
  var sendBtn = form.querySelector('button');
  var started = false;
  var data = {};
  var waitingText = null;

  function open() {
    html.classList.add('sb-open');
    launch.setAttribute('aria-expanded', 'true');
    if (!started) { started = true; run(); }
  }
  function close() {
    html.classList.remove('sb-open');
    launch.setAttribute('aria-expanded', 'false');
    launch.focus();
  }
  launch.addEventListener('click', open);
  root.querySelector('.sb-x').addEventListener('click', close);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function scroll() { body.scrollTop = body.scrollHeight; }
  function add(text, who) {
    var m = document.createElement('div');
    m.className = 'sb-msg ' + (who === 'me' ? 'sb-me' : 'sb-bot');
    m.textContent = text;
    body.appendChild(m); scroll();
  }
  function say(text) {
    return new Promise(function (res) {
      var t = document.createElement('div');
      t.className = 'sb-typing'; t.innerHTML = '<i></i><i></i><i></i>';
      body.appendChild(t); scroll();
      setTimeout(function () { t.remove(); add(text, 'bot'); res(); }, Math.min(1100, 350 + text.length * 12));
    });
  }
  function choose(options) {
    return new Promise(function (res) {
      var box = document.createElement('div');
      box.className = 'sb-opts';
      options.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'sb-opt'; b.textContent = o;
        b.addEventListener('click', function () { box.remove(); add(o, 'me'); res(o); });
        box.appendChild(b);
      });
      body.appendChild(box); scroll();
      var first = box.querySelector('button'); if (first) first.focus({ preventScroll: true });
    });
  }
  function ask(placeholder, optional) {
    return new Promise(function (res) {
      input.disabled = false; sendBtn.disabled = false;
      input.placeholder = placeholder; input.value = '';
      input.focus();
      waitingText = function (v) {
        if (!v && !optional) { input.focus(); return; }
        input.value = ''; input.disabled = true; sendBtn.disabled = true; input.placeholder = 'Escolha uma opção acima';
        waitingText = null;
        add(v || 'Prefiro não dizer', 'me'); res(v);
      };
    });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (waitingText) waitingText(input.value.trim());
  });

  function run() {
    say('Oi, tudo bem? Aqui é da Segbem, assessoria e segurança do trabalho.')
      .then(function () { return say('Me conta rapidinho o que você precisa que eu já te passo pro nosso especialista no WhatsApp.'); })
      .then(function () { return choose(['Treinamento de NR', 'Brigada de emergência', 'PGR, LTCAT ou PCMSO', 'eSocial SST', 'Avaliação de higiene ocupacional', 'Outro assunto']); })
      .then(function (s) {
        data.servico = s;
        if (s === 'Treinamento de NR') {
          return say('Boa! Qual treinamento?').then(function () {
            return choose(['NR-35 Trabalho em altura', 'NR-11 Empilhadeira', 'NR-33 Espaço confinado', 'NR-10 Eletricidade', 'PEMT Plataforma', 'Primeiros socorros', 'Outro ou mais de um']);
          }).then(function (d) { data.detalhe = d; });
        }
        if (s === 'Brigada de emergência') {
          return say('Qual nível de brigada?').then(function () {
            return choose(['Básica (4h)', 'Intermediária (8h)', 'Avançada (24h)', 'Não sei ainda']);
          }).then(function (d) { data.detalhe = d; });
        }
        if (s === 'Outro assunto') {
          return say('Sem problema. Escreve em poucas palavras o que você precisa.').then(function () {
            return ask('Ex.: laudo de insalubridade');
          }).then(function (d) { data.detalhe = d; });
        }
      })
      .then(function () {
        var treino = data.servico === 'Treinamento de NR' || data.servico === 'Brigada de emergência';
        return say(treino ? 'Mais ou menos quantas pessoas vão participar?' : 'Quantos funcionários a empresa tem, mais ou menos?');
      })
      .then(function () { return choose(['1 a 5', '6 a 15', '16 a 30', '31 a 100', 'Mais de 100']); })
      .then(function (q) { data.pessoas = q; return say('Em qual cidade fica a empresa?'); })
      .then(function () { return ask('Ex.: Goiânia'); })
      .then(function (c) { data.cidade = c; return say('Qual o nome da empresa?'); })
      .then(function () { return ask('Nome da empresa (pode pular)', true); })
      .then(function (e) { data.empresa = e; return say('E pra fechar, qual o seu nome?'); })
      .then(function () { return ask('Seu nome'); })
      .then(function (n) {
        data.nome = n;
        var first = n.split(' ')[0];
        return say('Valeu, ' + first + '! Montei sua mensagem, é só tocar no botão que ela abre no WhatsApp prontinha.');
      })
      .then(finish);
  }

  function finish() {
    var linhas = [
      'Olá, Segbem! Vim pelo site.',
      '',
      '*Nome:* ' + data.nome,
      data.empresa ? '*Empresa:* ' + data.empresa : null,
      '*Cidade:* ' + data.cidade,
      '*Preciso de:* ' + data.servico + (data.detalhe ? ' (' + data.detalhe + ')' : ''),
      '*Pessoas:* ' + data.pessoas
    ].filter(function (l) { return l !== null; });
    var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(linhas.join('\n'));
    var a = document.createElement('a');
    a.className = 'sb-send-wa'; a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = ICON + '<span>Enviar no WhatsApp</span>';
    body.appendChild(a); scroll();
    a.focus({ preventScroll: true });
    var again = document.createElement('button');
    again.type = 'button'; again.className = 'sb-opt'; again.textContent = 'Recomeçar';
    again.style.alignSelf = 'center';
    again.addEventListener('click', function () { body.innerHTML = ''; data = {}; run(); });
    body.appendChild(again); scroll();
  }
})();
