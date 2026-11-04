// ===== CLASSES, ENERGIA E HABILIDADES =====
const $c = (id) => document.getElementById(id);
const UNLOCK = [1, 3, 7], MAXE = 100, REGEN = 1, WEEK_USES = 3;   // regen: +1 de energia por hora
const K = (name, icon, cost, desc, fx) => ({ name, icon, cost, desc, fx });
const CLASSES = [
    { id: 'guerreiro', name: 'Guerreiro', icon: '⚔️', en: { name: 'Vigor', icon: '💪', color: '#f59e0b' }, desc: 'Linha de frente: dano alto e resistência.', skills: [
        K('Golpe Poderoso', '💥', 30, 'Suas próximas 3 missões concluídas causam o dobro de dano ao chefe.', { dmg: 2, charges: 3 }),
        K('Muralha de Aço', '🛡️', 45, 'Ganha um escudo que absorve 30 de dano.', { shield: 30 }),
        K('Grito de Guerra', '📣', 65, 'Por 24h: +25% de XP e +50% de dano ao chefe.', { xp: 1.25, dmg: 1.5, hours: 24 })] },
    { id: 'mago', name: 'Mago', icon: '🧙‍♂️', en: { name: 'Mana', icon: '🔷', color: '#3b82f6' }, desc: 'Poder arcano: dano direto e sabedoria.', skills: [
        K('Raio Arcano', '⚡', 30, 'Causa 35 de dano direto ao chefe ativo.', { hit: 35 }),
        K('Sabedoria Arcana', '📖', 45, 'Por 24h: +40% de XP.', { xp: 1.4, hours: 24 }),
        K('Meteoro', '☄️', 75, 'Causa 90 de dano direto ao chefe ativo.', { hit: 90 })] },
    { id: 'ladino', name: 'Ladino', icon: '🥷', en: { name: 'Astúcia', icon: '🎭', color: '#34d399' }, desc: 'Agilidade e esperteza: mais ouro e mais prazo.', skills: [
        K('Mãos Leves', '👐', 25, 'Por 24h: +50% de ouro.', { gold: 1.5, hours: 24 }),
        K('Passos Sombrios', '👣', 40, '+2 dias de prazo em todas as missões ativas.', { days: 2 }),
        K('Mestre dos Ladrões', '💰', 65, 'Ganha 60 de ouro na hora e +30% de ouro por 24h.', { goldNow: 60, gold: 1.3, hours: 24 })] },
    { id: 'paladino', name: 'Paladino', icon: '🛡️', en: { name: 'Luz', icon: '✨', color: '#fde047' }, desc: 'Suporte e dano sagrado: cura, escudo e julgamento.', skills: [
        K('Cura Divina', '💖', 30, 'Recupera 40 de vida.', { heal: 40 }),
        K('Escudo Sagrado', '🔰', 45, 'Ganha um escudo que absorve 40 de dano.', { shield: 40 }),
        K('Julgamento', '⚖️', 70, 'Causa 50 de dano ao chefe ativo e recupera 25 de vida.', { hit: 50, heal: 25 })] },
    { id: 'berserker', name: 'Berserker', icon: '🐻', en: { name: 'Fúria', icon: '🔥', color: '#ef4444' }, desc: 'Dano brutal, com sacrifício de vida.', skills: [
        K('Frenesi', '💢', 25, 'Suas próximas 3 missões concluídas causam 2,5x de dano ao chefe.', { dmg: 2.5, charges: 3 }),
        K('Sede de Sangue', '😈', 40, 'Por 24h: +75% de dano ao chefe, mas perde 15 de vida.', { dmg: 1.75, hours: 24, selfDmg: 15 }),
        K('Ira Desenfreada', '🌋', 70, 'Causa 100 de dano direto ao chefe ativo, mas perde 25 de vida.', { hit: 100, selfDmg: 25 })] },
    { id: 'profeta', name: 'Profeta', icon: '🕊️', en: { name: 'Fé', icon: '🙏', color: '#c4b5fd' }, desc: 'Bênçãos e visões: bônus para tudo e vida de sobra.', skills: [
        K('Bênção', '🌟', 30, 'Por 24h: +25% de XP e de ouro.', { xp: 1.25, gold: 1.25, hours: 24 }),
        K('Visão do Futuro', '👁️', 40, '+3 dias de prazo em todas as missões ativas.', { days: 3 }),
        K('Milagre', '🌈', 70, 'Recupera toda a vida e ganha um escudo de 30.', { heal: 'full', shield: 30 })] }
];
BOSS_THEME.skill = { bg1: '#1a2a4a', bg2: '#0a101f', border: '#8ab4ff', accent: '#dbe7ff', glow: '138,180,255' };

const classDef = () => CLASSES.find(c => c.id === state.cls);
const needsBoss = (fx) => fx.hit || (fx.dmg && !fx.xp && !fx.gold);

// ----- Energia -----
function tickEnergy() {
    const e = state.energy; if (!e) return;
    const now = Date.now(), ws = weekStart();
    e.cur = Math.min(MAXE, e.cur + (now - e.last) / 3600e3 * REGEN); e.last = now;
    if (e.week !== ws) { e.week = ws; e.uses = 0; }
}
function gainEnergy(n) { tickEnergy(); if (state.energy) state.energy.cur = Math.min(MAXE, state.energy.cur + n); }

// ----- Bônus ativos -----
function buffMult() {
    const now = Date.now();
    state.buffs = (state.buffs || []).filter(b => b.until ? b.until > now : b.charges > 0);
    return state.buffs.reduce((m, b) => ({ xp: m.xp * b.xp, gold: m.gold * b.gold, dmg: m.dmg * b.dmg }), { xp: 1, gold: 1, dmg: 1 });
}
function consumeBuffs() { (state.buffs || []).forEach(b => { if (b.charges && (b.dmg === 1 || bossActive())) b.charges--; }); }

function useAbility(i) {
    const c = classDef(), s = c?.skills[i]; if (!s) return;
    tickEnergy(); const e = state.energy, fx = s.fx;
    if (state.level < UNLOCK[i] || e.uses >= WEEK_USES || e.cur < s.cost || (needsBoss(fx) && !bossActive())) return;
    if (fx.heal) state.hp = Math.min(maxHp(), fx.heal === 'full' ? maxHp() : state.hp + fx.heal);
    if (fx.shield) state.shield = (state.shield || 0) + fx.shield;
    if (fx.days) state.quests.forEach(q => { if (!q.completed) q.days += fx.days; });
    if (fx.goldNow) state.gold += fx.goldNow;
    if (fx.selfDmg) state.hp = Math.max(1, state.hp - fx.selfDmg);
    if (fx.xp || fx.gold || fx.dmg) state.buffs.push({ name: s.name, icon: s.icon, xp: fx.xp || 1, gold: fx.gold || 1, dmg: fx.dmg || 1, until: fx.hours ? Date.now() + fx.hours * 3600e3 : 0, charges: fx.charges || 0 });
    let won = false;
    if (fx.hit) { state.boss.hp = Math.max(0, state.boss.hp - fx.hit); won = state.boss.hp === 0; }
    e.cur -= s.cost; e.uses++;
    bossAlert('skill', s.name, `${c.icon} ${s.desc}`, 5000, s.icon);
    saveState(); renderAll();
    showBossModal(won ? endEvent(true) : skillHtml());
}

// ----- Interface -----
function classPanel() {
    const c = classDef();
    if (!c) return '<button class="btn btn-secondary cls-pick" data-cls-open>🎭 Escolher classe</button>';
    tickEnergy(); const e = state.energy;
    return `<div class="cls-panel"><div class="orb" style="--ec:${c.en.color};--p:${e.cur}%">${c.en.icon}</div>
        <div class="cls-info"><b>${c.icon} ${c.name}</b><span>${c.en.name}: ${Math.floor(e.cur)}/${MAXE}</span><small>Habilidades: ${e.uses}/${WEEK_USES} usadas na semana</small></div>
        <button class="btn btn-secondary" data-skills>Habilidades</button></div>`;
}
function skillHtml() {
    const c = classDef(); tickEnergy(); const e = state.energy, now = Date.now();
    const buffs = (state.buffs || []).map(b => `<span class="deadline-badge">${b.icon} ${b.name} · ${b.until ? Math.max(1, Math.ceil((b.until - now) / 3600e3)) + 'h' : b.charges + 'x'}</span>`).join(' ');
    const cards = c.skills.map((s, i) => {
        const why = state.level < UNLOCK[i] ? `🔒 Nível ${UNLOCK[i]}` : e.uses >= WEEK_USES ? 'Limite semanal' : needsBoss(s.fx) && !bossActive() ? 'Requer chefe ativo' : e.cur < s.cost ? `Faltam ${Math.ceil(s.cost - e.cur)}` : '';
        return `<div class="skill-card ${state.level < UNLOCK[i] ? 'lock' : ''}"><span class="skill-ico">${s.icon}</span><div><b>${s.name}</b><p>${s.desc}</p></div>
            <button class="btn btn-primary" data-skill="${i}" ${why ? 'disabled' : ''}>${why || `Usar · ${c.en.icon} ${s.cost}`}</button></div>`;
    }).join('');
    return `<h2>${c.icon} ${c.name}</h2>
        <div class="cls-panel"><div class="orb" style="--ec:${c.en.color};--p:${e.cur}%">${c.en.icon}</div>
        <div class="cls-info"><b>${c.en.name}: ${Math.floor(e.cur)}/${MAXE}</b><span>Usos na semana: ${e.uses}/${WEEK_USES}</span><small>Recarga: +${REGEN} por hora e +3 por missão concluída</small></div></div>
        ${buffs ? `<p class="skill-buffs">Ativos: ${buffs}</p>` : ''}${cards}
        <div class="modal-actions"><button class="btn btn-secondary" data-cls-open>Trocar classe</button><button class="btn btn-primary" data-act="close">Fechar</button></div>`;
}
const classPickHtml = () => `<h2>Escolha sua classe</h2><p class="boss-intro">Cada classe tem uma energia própria e 3 habilidades. Você começa com uma e libera as outras nos níveis 3 e 7.</p>${CLASSES.map(c =>
    `<button class="boss-pick" data-cls="${c.id}" style="border-color:${c.en.color}"><span class="cls-ico">${c.icon}</span><span><b>${c.name} · ${c.en.icon} ${c.en.name}</b><small>${c.desc}</small></span></button>`).join('')}`;

function renderClassUI() {
    tickEnergy();
    const c = classDef(), b = $c('skill-btn');
    if ($c('profile-class')) $c('profile-class').innerHTML = classPanel();
    b.style.setProperty('--ec', c ? c.en.color : '#78350f'); b.style.setProperty('--p', (c ? state.energy.cur : 0) + '%');
    $c('skill-ico').textContent = c ? c.icon : '🎭'; $c('skill-badge').textContent = c ? WEEK_USES - state.energy.uses : '?';
}
const _ra3 = renderAll;
renderAll = () => { _ra3(); renderClassUI(); };
setInterval(() => { if (typeof session !== 'undefined' && session) renderClassUI(); }, 60000);

// Escolha de classe antes do chefe de demonstração
const _bt3 = bossTick;
bossTick = () => { if (typeof session !== 'undefined' && session && !state.cls) return showBossModal(classPickHtml()); _bt3(); };

// +3 de energia por missão concluída; consome bônus de cargas depois do dano
const _pqc3 = processQuestCompletion;
processQuestCompletion = () => {
    const q0 = state.quests.find(x => x.id === currentQuestIdToComplete && !x.completed);
    _pqc3();
    if (q0 && state.cls) { gainEnergy(3); consumeBuffs(); saveState(); renderAll(); }
};

document.addEventListener('click', (e) => {
    const t = e.target, open = t.closest('#skill-btn, [data-skills]');
    if (open) { if (typeof closeProfile === 'function') closeProfile(); return showBossModal(state.cls ? skillHtml() : classPickHtml()); }
    if (t.closest('[data-cls-open]')) { if (typeof closeProfile === 'function') closeProfile(); return showBossModal(classPickHtml()); }
    const pick = t.closest('[data-cls]');
    if (pick) {
        state.cls = pick.dataset.cls; state.energy ||= { cur: 40, last: Date.now(), week: weekStart(), uses: 0 }; state.buffs ||= [];
        const c = classDef(); saveState(); closeBossModal(); renderAll();
        bossAlert('skill', `Você é ${c.name}!`, `${c.en.icon} Sua energia é ${c.en.name}. Use as habilidades pelo botão ao lado do +.`, 5500, c.icon);
        return bossTick();
    }
    const sk = t.closest('[data-skill]'); if (sk) useAbility(+sk.dataset.skill);
});
