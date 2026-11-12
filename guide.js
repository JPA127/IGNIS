// ===== ELDRIN, O GUIA: tutorial inicial + chatbot (busca semântica no navegador) =====
const $g = (id) => document.getElementById(id);
const tutorialActive = () => typeof session !== 'undefined' && session && !state.tutorialDone;
let tutOn = false, tutI = 0, tutTimer = null, lightMode = false;

// Durante o tutorial nada mais aparece (alertas, classe, chefe), para não haver conflitos
const _ba = bossAlert;
bossAlert = (...a) => { if (!tutorialActive() && !qa.active) _ba(...a); };
const _bt4 = bossTick;
bossTick = () => { if (tutorialActive()) { if (!tutOn) startTutorial(); return; } if (qa.active) return; _bt4(); };

// ----- Tutorial -----
const TUT = [
    ['Salve, viajante! Sou Eldrin, guardião desta taverna. Aqui suas tarefas viram missões e você vira um herói. Deixe-me mostrar o básico.', null],
    ['Toque no selo de cera ➕ para forjar uma missão: dê um nome, escolha a dificuldade e o prazo.', '#add-btn'],
    ['A gema mostra a dificuldade: esmeralda (fácil), topázio (médio), rubi (difícil) e ametista (épico). Quanto mais difícil, maior a recompensa.', null],
    ['Concluir uma missão ✅ rende XP 📜 e ouro 💰. O XP faz você subir de nível, e o ❤️ é a sua vida.', '.app-header'],
    ['Na Loja você troca ouro por armas, armaduras e cajados que aumentam seu dano contra os chefes.', '.bottom-nav .nav-item:nth-child(2)'],
    ['No Perfil ficam suas medalhas e sua sequência de dias. E toda semana surge um chefe opcional para enfrentar!', '.bottom-nav .nav-item:nth-child(3)'],
    ['Ao terminar, você escolhe sua classe e conhece o primeiro chefe. Se tiver dúvidas, é só me chamar neste botão 💬.', '#guide-btn']
];
function startTutorial() {
    tutOn = true; tutI = 0;
    if (!$g('tutorial')) document.body.insertAdjacentHTML('beforeend', `<div id="tutorial" class="tutorial"><div class="tut-block"></div><div class="tut-ring" id="tut-ring"></div>
        <div class="tut-box" id="tut-box"><button class="tut-skip" id="tut-skip">Pular</button><div class="guide-portrait">🧓</div>
        <div class="tut-body"><b>Eldrin, o Guia</b><p id="tut-text"></p><button class="btn btn-primary" id="tut-next">Próximo ›</button></div></div></div>`);
    $g('tutorial').hidden = false; showTut();
}
function showTut() {
    let [text, sel] = TUT[tutI];
    if (tutI === 0 && session?.uid === 'guest') text += ' (Modo experimentação: nada será salvo.)';
    const el = sel && document.querySelector(sel), ring = $g('tut-ring'), r = el?.getBoundingClientRect();
    $g('tutorial').classList.toggle('nofocus', !el);
    if (el) Object.assign(ring.style, { display: 'block', left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); else ring.style.display = 'none';
    $g('tut-box').classList.toggle('top', !!r && r.top > innerHeight * .55);
    $g('tut-next').textContent = tutI === TUT.length - 1 ? 'Começar a jornada!' : 'Próximo ›';
    clearInterval(tutTimer); const out = $g('tut-text'); out.dataset.full = text;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return void (out.textContent = text);
    let i = 0; out.textContent = '';
    tutTimer = setInterval(() => { out.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(tutTimer); }, 18);
}
function finishTutorial() {
    clearInterval(tutTimer); $g('tutorial').hidden = true; tutOn = false;
    if (!state.tutorialDone) { state.tutorialDone = true; saveState(); startQA(); }   // Eldrin oferece 2 perguntas; depois aparecem classe e chefe
    else bossTick();
}
document.addEventListener('click', (e) => {
    if (e.target.id === 'tut-skip') return finishTutorial();
    if (e.target.id !== 'tut-next') return;
    const out = $g('tut-text');
    if (out.textContent.length < out.dataset.full.length) { clearInterval(tutTimer); out.textContent = out.dataset.full; return; }
    if (tutI >= TUT.length - 1) finishTutorial(); else { tutI++; showTut(); }
});

// ----- Base de conhecimento (a única fonte das respostas) -----
const KB = [
    { t: 'Criar missões', k: 'tarefa nova adicionar criar forjar botão selo concluir excluir apagar', x: 'Toque no selo de cera ➕ (canto inferior direito), dê um nome, escreva uma descrição se quiser e escolha a dificuldade e o prazo em dias. Para concluir, toque em ✅. Para excluir, toque em 🗑️ e arraste a trava até o fim.' },
    { t: 'Dificuldade e gemas', k: 'gema esmeralda topázio rubi ametista fácil médio difícil épico recompensa', x: 'A gema da missão mostra a dificuldade: esmeralda é fácil, topázio é médio, rubi é difícil e ametista é épico. Quanto mais difícil, maior a faixa de XP e ouro que a missão rende.' },
    { t: 'XP e nível', k: 'experiência xp nível subir level evoluir barra', x: 'Concluir missões rende XP 📜. Ao encher a barra você sobe de nível, e cada nível exige mais XP que o anterior. A cada nível a vida máxima aumenta em 10.' },
    { t: 'Ouro e Loja', k: 'ouro moeda comprar loja gastar dinheiro bolsa', x: 'Missões também rendem ouro 💰. Gaste na aba Loja em recompensas de descanso (como Refeição Livre ou Docinho) e no Arsenal de equipamentos.' },
    { t: 'Equipamentos', k: 'espada armadura cajado arma item equipar arsenal dano defesa', x: 'O Arsenal tem 3 espadas (+4, +8 e +14 de dano), 3 armaduras (reduzem 15%, 30% e 45% do dano sofrido) e 3 cajados (+5, +12 e +22 de dano em missões de fraqueza). Custam 60, 180 e 450 de ouro. Compre e depois toque em Equipar; os itens equipados aparecem no perfil.' },
    { t: 'Vida', k: 'vida hp coração desmaiar morrer curar saúde', x: 'Você começa com 100 de vida ❤️, ganha +10 de vida máxima por nível e recupera 5 a cada missão concluída. A vida só cai por penalidades de chefes, queimaduras e algumas habilidades. Se chegar a zero, você desmaia, perde 1 nível e volta com metade da vida.' },
    { t: 'Chefe semanal', k: 'chefe boss semana evento enfrentar ignorar opcional derrotar', x: 'Toda segunda-feira surge um chefe. Participar é opcional: toque em Enfrentar ou Ignorar (ignorar não tem punição). Ao enfrentar, a vida do chefe é 100 mais 20 por nível e cada missão concluída causa dano. Se ele sobreviver até o fim da semana, você sofre a penalidade dele; se você vencer, ganha ouro e XP de bônus.' },
    { t: 'Fraqueza do chefe', k: 'fraqueza dano caixa marcar missão especial borda', x: 'Ao criar uma missão com um chefe ativo, marque "É uma fraqueza do chefe?". Missões de fraqueza causam o dobro de dano, mais o bônus do cajado, e ganham uma borda especial. Missões comuns causam metade do dano base, mais o bônus da espada.' },
    { t: 'Basilisco de Pedra', k: 'basilisco pedra petrificar procrastinação', x: 'O Basilisco petrifica algumas missões, que ficam bloqueadas até a vida dele cair abaixo de 50%. Fraqueza: tarefas contra a procrastinação. Se ele vencer: -30 de vida e -15% do ouro.' },
    { t: 'Yeti das Neves', k: 'yeti neve gelo frio calor frio', x: 'O Yeti faz missões comuns renderem 30% menos XP e ouro. Fraqueza: tarefas de frio ou calor (banho gelado, lavar a louça na água fria, queimar calorias). Se ele vencer: -25 de vida e -20% do ouro.' },
    { t: 'Lich Necromante', k: 'lich necromante morto-vivo reviver fantasma organização limpeza', x: 'O Lich revive missões já concluídas como mortos-vivos, com 70% da recompensa (2 ao começar, 1 por dia e as que você concluir, até 3 por vez). Fraqueza: organização e limpeza. Se ele vencer: -20 de vida e -1 nível.' },
    { t: 'Bruxa da Gula', k: 'bruxa gula comida doce despensa autocontrole nutrição finanças', x: 'A Bruxa consome 1/3 das recompensas e tranca os itens de comida da loja. Fraqueza: autocontrole, nutrição e disciplina financeira ou alimentar. Se ela vencer: -15 de vida e -35% do ouro.' },
    { t: 'Demônio de Fogo', k: 'demônio fogo queimadura prazo urgência exercício email', x: 'O Demônio corta os prazos pela metade e causa queimadura de -8 de vida por missão vencida. Fraqueza: alta intensidade e urgência (exercícios, responder e-mails importantes). Se ele vencer: -40 de vida, -20% do ouro e -1 nível.' },
    { t: 'Classes e energia', k: 'classe guerreiro mago ladino paladino berserker profeta energia mana fé fúria vigor astúcia luz', x: 'Há 6 classes: Guerreiro (Vigor), Mago (Mana), Ladino (Astúcia), Paladino (Luz), Berserker (Fúria) e Profeta (Fé). A energia começa em 40, vai até 100 e recarrega +1 por hora e +3 por missão concluída. Dá para usar no máximo 3 habilidades por semana.' },
    { t: 'Habilidades', k: 'habilidade poder skill magia usar liberar nível', x: 'Cada classe tem 3 habilidades. Você começa com a primeira; a segunda libera no nível 3 e a terceira no nível 7. Use pelo botão redondo ao lado do ➕. Elas dão bônus de XP, ouro, dano, escudo, cura ou mais prazo, conforme a classe.' },
    { t: 'Medalhas', k: 'medalha conquista marco troféu achievement', x: 'Medalhas são conquistas por marcos: dias seguidos (10, 20, 30, 50, 100), nível (10, 20, 30, 50, 100), chefes derrotados, ouro, missões e equipamentos. Veja todas em Perfil, Ver perfil completo. Toque numa medalha para ver o que é e o progresso.' },
    { t: 'Sequência de dias', k: 'sequência streak dias seguidos recorde ofensiva', x: 'A sequência conta quantos dias seguidos você entrou no IGNIS. Faltar um dia zera a sequência atual, mas o recorde fica guardado no perfil.' },
    { t: 'Perfil, nick e foto', k: 'perfil nick nome foto imagem avatar trocar editar', x: 'Em Perfil, toque em Ver perfil completo e depois em Editar perfil para trocar o nick e a foto. Você pode enviar uma imagem do aparelho ou usar emojis; os sprites dos chefes liberam ao derrotá-los.' },
    { t: 'Modos de visualização', k: 'visualização lista tabela quadro kanban linha do tempo calendário ver modo', x: 'No topo das missões há cinco modos: Lista, Tabela, Quadro (por dificuldade), Linha do tempo e Calendário. Só a Lista tem o botão de excluir.' },
    { t: 'Conta e modo experimentação', k: 'conta login entrar google email salvar nuvem convidado experimentar sair', x: 'Você pode entrar com Google ou e-mail, e seu progresso fica salvo na nuvem. A opção "Experimentar sem conta" serve só para testar: nada é salvo.' },
    { t: 'Sobre o guia', k: 'guia eldrin chatbot ia inteligência artificial webgpu quem você', x: 'Eu sou Eldrin, o guia do IGNIS. Uso IA no seu navegador (Transformers.js, com WebGPU quando o aparelho permitir): embeddings para achar o trecho certo nestes pergaminhos e um pequeno modelo de linguagem (Qwen2.5-0.5B) para escrever a resposta só com base neles. Eu não invento nada: se não souber, eu aviso.' },
    { t: 'Rever o tutorial', k: 'tutorial ajuda começar introdução ensinar', x: 'Toque em "Rever tutorial" aqui no chat para repetir a introdução do jogo.' }
];

// ----- Busca (embeddings) + resposta escrita por um SLM, sempre presa ao contexto -----
const EMB = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', SLM = 'onnx-community/Qwen2.5-0.5B-Instruct';
const NOT_FOUND = 'Hmm… não encontrei isso nos meus pergaminhos, e prefiro não inventar. Pergunte sobre missões, chefes, classes, loja, medalhas ou perfil.';
const SYS = 'Você é Eldrin, um guia de RPG do aplicativo IGNIS. Responda em português do Brasil, em no máximo 3 frases curtas, usando SOMENTE o CONTEXTO. Se a resposta não estiver no contexto, responda exatamente: "Não sei, isso não está nos meus pergaminhos." Nunca invente números, nomes ou regras.';
let tfP = null, extractor = null, loadingP = null, devName = '', kbVecs = null, gen = null, genP = null, genDev = '', genFailed = false, busy = false;
const qa = { active: false, left: 2 };
const tf = () => (tfP ||= import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1'));
const hasGPU = async () => { try { return !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch { return false; } };
const setStatus = (s) => { $g('guide-status').textContent = s; };
const progressTo = (label) => (p) => { if (p.status === 'progress' && typeof p.progress === 'number') setStatus(`⏬ Baixando ${label} (só na 1ª vez)… ${Math.round(p.progress)}%`); };

async function embed(texts) { return (await extractor(texts, { pooling: 'mean', normalize: true })).tolist(); }
function loadModel() {
    return loadingP ||= (async () => {
        const { pipeline } = await tf();
        for (const dev of (await hasGPU()) ? ['webgpu', 'wasm'] : ['wasm']) {
            try { extractor = await pipeline('feature-extraction', EMB, { device: dev, dtype: 'q8', progress_callback: progressTo('o oráculo de busca') }); await embed(['teste']); devName = dev; return; }
            catch (e) { console.warn('Embeddings falharam em', dev, e); extractor = null; }
        }
        loadingP = null; throw new Error('modelo de busca indisponível');
    })();
}
function loadGen() {
    return genP ||= (async () => {
        const { pipeline } = await tf();
        for (const [dev, dtype] of (await hasGPU()) ? [['webgpu', 'q4'], ['wasm', 'int8']] : [['wasm', 'int8']]) {
            try { gen = await pipeline('text-generation', SLM, { device: dev, dtype, progress_callback: progressTo('a mente de IA') }); genDev = dev; return; }
            catch (e) { console.warn('SLM falhou em', dev, e); gen = null; }
        }
        genP = null; throw new Error('SLM indisponível');
    })();
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
const STOP = new Set('para como qual quais que uma uns umas dos das nos nas com por sao ser tem meu minha mais isso esse essa onde quando'.split(' '));
function lexScore(q, c) {
    const words = norm(q).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)), hay = ' ' + norm(`${c.t} ${c.k} ${c.x}`);
    return words.length ? words.filter(w => hay.includes(' ' + w)).length / words.length : 0;
}
async function search(q) {
    if (!lightMode) {
        try {
            setStatus('⏳ Acordando o oráculo…'); await loadModel();
            kbVecs ||= await embed(KB.map(c => `${c.t}. ${c.x}`));
            const [qv] = await embed([q]);
            return { thr: .33, mode: 'IA', r: KB.map((c, i) => ({ c, s: kbVecs[i].reduce((a, v, j) => a + v * qv[j], 0) })).sort((a, b) => b.s - a.s) };
        } catch (e) { console.warn('IA indisponível, usando busca por palavras', e); }
    }
    setStatus('🔎 Modo leve (busca por palavras)');
    return { thr: .5, mode: 'palavras', r: KB.map(c => ({ c, s: lexScore(q, c) })).sort((a, b) => b.s - a.s) };
}
async function generate(q, chunks) {
    await loadGen(); setStatus('✍️ Eldrin está escrevendo…');
    const ctx = chunks.map(c => `- ${c.t}: ${c.x}`).join('\n');
    const out = await gen([{ role: 'system', content: SYS }, { role: 'user', content: `CONTEXTO:\n${ctx}\n\nPERGUNTA: ${q}` }], { max_new_tokens: 160, do_sample: false, repetition_penalty: 1.1 });
    const g = out?.[0]?.generated_text, last = Array.isArray(g) ? g[g.length - 1] : g;
    return { text: String((typeof last === 'string' ? last : last?.content) || '').trim(), ctx };
}

// ----- Chat -----
function say(who, text) {
    const d = document.createElement('div'); d.className = 'gmsg ' + who; d.textContent = text;
    $g('guide-log').append(d); d.scrollIntoView({ block: 'end' }); return d;
}
function setBusy(b) {
    busy = b; const off = b || (qa.active && qa.left <= 0);
    $g('guide-input').disabled = off; $g('guide-form').querySelector('button').disabled = off;
}
async function ask(q) {
    if (busy || (qa.active && qa.left <= 0)) return;
    setBusy(true); say('user', q); const bubble = say('bot', '…');
    try {
        const { thr, mode, r } = await search(q);
        const hits = r.slice(0, 2).filter((h, i) => h.s >= thr && (i === 0 || h.s > r[0].s - .08));
        if (!hits.length) bubble.textContent = NOT_FOUND;
        else {
            const src = `📜 Fonte: ${hits.map(h => h.c.t).join(' + ')}`, literal = hits.map(h => h.c.x).join('\n\n');
            const sim = mode === 'IA' ? `similaridade ${r[0].s.toFixed(2)}` : 'busca por palavras';
            let done = false; bubble.textContent = '✍️ Pensando…';
            if (mode === 'IA' && !genFailed) {
                try {
                    const { text, ctx } = await generate(q, hits.map(h => h.c));
                    // trava anti-alucinação: números da resposta precisam existir no contexto
                    if (text && (text.match(/\d+/g) || []).every(n => ctx.includes(n))) {
                        bubble.textContent = /n[aã]o sei/i.test(text) ? NOT_FOUND : `${text}\n\n${src} · ${sim}\n✅ Conferido com os pergaminhos · Qwen2.5-0.5B (${genDev === 'webgpu' ? 'WebGPU' : 'CPU/WASM'})`;
                        done = true;
                    }
                } catch (e) { genFailed = true; console.warn('IA generativa indisponível', e); }
            }
            if (!done) bubble.textContent = `${literal}\n\n${src} · ${sim}\n(resposta literal dos pergaminhos${genFailed ? '; a mente de IA não coube neste aparelho' : ''})`;
            if (!lightMode) setStatus(devName === 'webgpu' || genDev === 'webgpu' ? '⚡ WebGPU ativo' : '🧠 CPU (WASM)');
        }
    } catch (e) { console.error(e); bubble.textContent = 'Ocorreu um erro ao buscar a resposta. Tente de novo.'; }
    bubble.scrollIntoView({ block: 'end' });
    if (qa.active && --qa.left <= 0) say('bot', 'Pronto, minhas duas respostas foram dadas. Siga em frente, herói: sua classe e seu primeiro chefe o aguardam!');
    else if (qa.active) setStatus('Resta 1 pergunta');
    setBusy(false); renderChips();
}
function renderChips() {
    const sug = ['Como funcionam os chefes?', 'Para que serve a energia?', 'Como ganho medalhas?'].map(q => `<button class="gchip" data-gq="${q}">${q}</button>`).join('');
    $g('guide-chips').innerHTML = qa.active
        ? (qa.left > 0 ? sug + '<button class="gchip" data-gact="skip">Agora não</button>' : '<button class="gchip" data-gact="skip">Seguir para a aventura ›</button>')
        : sug + `<button class="gchip" data-gact="tut">🧓 Rever tutorial</button><button class="gchip" data-gact="light">${lightMode ? '🔎 Modo leve: ligado' : '🧠 Modo leve: desligado'}</button>`;
}
// Depois do tutorial: Eldrin oferece duas perguntas; só então vêm a classe e o chefe
function startQA() {
    qa.active = true; qa.left = 2; $g('guide-log').innerHTML = '';
    say('bot', 'Antes de você partir, aventureiro, posso responder duas perguntas sobre o IGNIS usando minha mente de IA (um modelo de linguagem que roda no seu aparelho). O que deseja saber?');
    setStatus('Duas perguntas disponíveis'); setBusy(false); renderChips();
    $g('guide-overlay').classList.add('active');
}
function openGuide() {
    if (!$g('guide-log').children.length) { say('bot', 'Salve! Pergunte o que quiser sobre o IGNIS. Eu só respondo com o que está nos meus pergaminhos.'); setStatus(lightMode ? '🔎 Modo leve' : 'Pergunte sobre o IGNIS'); }
    renderChips(); $g('guide-overlay').classList.add('active');
}
function closeGuide() {
    $g('guide-overlay').classList.remove('active');
    if (qa.active) { qa.active = false; setBusy(false); renderChips(); bossTick(); }
}
$g('guide-btn').addEventListener('click', () => { if (!tutorialActive() && !qa.active) openGuide(); });
$g('guide-close').addEventListener('click', closeGuide);
$g('guide-form').addEventListener('submit', (e) => { e.preventDefault(); const q = $g('guide-input').value.trim(); if (q) { $g('guide-input').value = ''; ask(q); } });
document.addEventListener('click', (e) => {
    if (e.target.id === 'guide-overlay') return closeGuide();
    const q = e.target.closest('[data-gq]')?.dataset.gq, a = e.target.closest('[data-gact]')?.dataset.gact;
    if (q) ask(q);
    else if (a === 'skip') closeGuide();
    else if (a === 'light') { lightMode = !lightMode; renderChips(); setStatus(lightMode ? '🔎 Modo leve' : 'Pergunte sobre o IGNIS'); }
    else if (a === 'tut') { closeGuide(); startTutorial(); }
});
