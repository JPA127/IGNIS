// ===== EQUIPAMENTOS, VIDA E CHEFE SEMANAL =====
const DAY = 864e5;
const EQUIP = [
    { id: 'sw1', slot: 'sword', icon: '🗡️', name: 'Espada de Ferro', price: 60, atk: 4 },
    { id: 'sw2', slot: 'sword', icon: '⚔️', name: 'Espada de Aço', price: 180, atk: 8 },
    { id: 'sw3', slot: 'sword', icon: '💎', name: 'Espada de Cristal', price: 450, atk: 14 },
    { id: 'ar1', slot: 'armor', icon: '🥋', name: 'Gibão de Couro', price: 60, def: 15 },
    { id: 'ar2', slot: 'armor', icon: '🛡️', name: 'Armadura de Aço', price: 180, def: 30 },
    { id: 'ar3', slot: 'armor', icon: '🐉', name: 'Armadura Dracônica', price: 450, def: 45 },
    { id: 'st1', slot: 'staff', icon: '🪄', name: 'Cajado de Aprendiz', price: 60, mag: 5 },
    { id: 'st2', slot: 'staff', icon: '🔮', name: 'Cajado Arcano', price: 180, mag: 12 },
    { id: 'st3', slot: 'staff', icon: '🌟', name: 'Cajado Estelar', price: 450, mag: 22 }
];
const SLOT_LABEL = { sword: '⚔️ Espada', armor: '🛡️ Armadura', staff: '🔮 Cajado' };
const equipStat = (e) => e.atk ? `+${e.atk} de dano` : e.mag ? `+${e.mag} de dano na fraqueza` : `-${e.def}% de dano sofrido`;

const BOSSES = [
    { id: 'basilisco', name: 'Basilisco de Pedra', img: 'boss-basilisco.png',
      intro: 'O Basilisco drena sua vontade de lutar e consome seu progresso. Lute contra a procrastinação e o cansaço para derrotá-lo.',
      weak: 'Tarefas contra a procrastinação: começar o que você vive adiando, retomar tarefas paradas, focar 10 minutos.',
      curse: '🗿 Petrifica algumas missões aleatórias: ficam bloqueadas até a vida do chefe cair abaixo de 50%.',
      penalty: { hp: 30, gold: .15, level: 0 } },
    { id: 'yeti', name: 'Yeti das Neves', img: 'boss-yeti.png',
      intro: 'O Yeti congela seu ritmo e desacelera cada passo da jornada. Enfrente o frio e o calor para derretê-lo.',
      weak: 'Tarefas ligadas ao frio ou ao calor: lavar a louça na água fria, tomar 1 banho gelado, queimar calorias.',
      curse: '❄️ Desacelera o progresso: missões comuns rendem 30% menos XP e ouro (as de fraqueza não).',
      penalty: { hp: 25, gold: .20, level: 0 } },
    { id: 'lich', name: 'Lich Necromante', img: 'boss-lich.png',
      intro: 'O Lich ergue das cinzas as missões que você já venceu. Traga ordem ao caos e bana os mortos-vivos.',
      weak: 'Tarefas de organização e limpeza: arrumar o quarto, organizar arquivos, limpar a casa.',
      curse: '💀 Revive até 2 missões já concluídas, um pouco mais fáceis (70% da recompensa).',
      penalty: { hp: 20, gold: 0, level: 1 } },
    { id: 'bruxa', name: 'Bruxa da Gula', img: 'boss-bruxa.png',
      intro: 'A Bruxa devora um terço das suas recompensas e tranca a despensa da taverna. Resista aos seus feitiços.',
      weak: 'Tarefas de autocontrole, nutrição e disciplina financeira ou alimentar: cozinhar em casa, anotar gastos, evitar besteiras.',
      curse: '🍰 Consome 1/3 das recompensas (exceto fraqueza) e bloqueia itens de comida na loja.',
      penalty: { hp: 15, gold: .35, level: 0 } },
    { id: 'demonio', name: 'Demônio de Fogo', img: 'boss-demonio.png',
      intro: 'O fogo consome tudo rapidamente. O Demônio encurta seus prazos e queima quem deixa missões vencerem.',
      weak: 'Tarefas de alta intensidade e urgência: treinos intensos, responder todos os e-mails importantes, resolver pendências.',
      curse: '🔥 Prazos pela metade e queimaduras (-8 de vida) para cada missão que vencer.',
      penalty: { hp: 40, gold: .20, level: 1 } }
];

// ----- Estado base -----
const _gds = getDefaultState;
getDefaultState = () => ({ ..._gds(), hp: 100, owned: [], equipped: {}, boss: null });

const maxHp = () => 100 + (state.level - 1) * 10;
const gear = (slot) => EQUIP.find(e => e.id === state.equipped?.[slot]);
const bossDef = () => state.boss && BOSSES.find(b => b.id === state.boss.id);
const bossActive = () => state.boss?.status === 'active';
const bossIs = (id) => bossActive() && state.boss.id === id;
const defPct = () => gear('armor')?.def || 0;

function weekStart() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
}
const weekEnd = (ts) => { const d = new Date(ts); d.setDate(d.getDate() + 7); return d.getTime(); };

function damageFor(q) {
    const base = { easy: 6, medium: 10, hard: 16, epic: 24 }[q.diff] || 10;
    const atk = gear('sword')?.atk || 0, mag = gear('staff')?.mag || 0;
    return q.weakness ? (base + atk) * 2 + mag : Math.floor(base / 2) + atk;
}

function bossAdjust(q) {
    let { xp, gold } = q, dmg = 0;
    if (bossActive()) {
        const f = q.weakness ? 1 : bossIs('yeti') ? .7 : bossIs('bruxa') ? 2 / 3 : 1;
        xp = Math.max(1, Math.round(xp * f)); gold = Math.round(gold * f);
        dmg = damageFor(q);
    }
    return { xp, gold, dmg };
}

function hurt(n) {
    state.hp -= Math.round(n * (1 - defPct() / 100));
    if (state.hp <= 0) {
        loseLevel();
        state.hp = Math.round(maxHp() / 2);
        showToast('💫 Você desmaiou e perdeu 1 nível!');
    }
}
function loseLevel() {
    if (state.level <= 1) { state.xp = 0; return; }
    state.level--; state.xp = 0;
    state.maxXp = Math.max(100, Math.round(100 * Math.pow(1.4, state.level - 1)));
}
function gainXp(n) {
    state.xp += n; state.totalXp += n;
    while (state.xp >= state.maxXp) { state.xp -= state.maxXp; state.level++; state.maxXp = Math.floor(state.maxXp * 1.4); }
}

// ----- Ciclo semanal -----
function bossTick() {
    const ws = weekStart();
    let changed = false, result = null, burns = 0;
    if (state.boss && state.boss.weekKey !== ws) {
        if (state.boss.status === 'active') result = endEvent(false);
        state.boss = null; changed = true;
    }
    if (!state.boss) {
        state.boss = { weekKey: ws, id: BOSSES[Math.round(ws / (7 * DAY)) % BOSSES.length].id, status: 'pending', seen: false };
        changed = true;
    }
    if (bossIs('demonio')) {
        state.quests.forEach(q => {
            if (!q.completed && !q.burned && Date.now() > q.createdAt + Math.floor(q.days / 2) * DAY) { q.burned = true; hurt(8); burns++; }
        });
    }
    if (changed || burns) saveState();
    if (burns) showToast(`🔥 Queimadura! ${burns} missão(ões) venceu(ram).`);
    if (result) return showBossModal(result);
    if (state.boss.status === 'pending' && !state.boss.seen) {
        state.boss.seen = true; saveState(); showBossModal(introHtml(true));
    }
}

function startEvent() {
    const b = state.boss, act = state.quests.filter(q => !q.completed);
    b.status = 'active'; b.maxHp = 100 + state.level * 20; b.hp = b.maxHp; state.hp = maxHp();
    if (b.id === 'basilisco') [...act].sort(() => Math.random() - .5).slice(0, Math.max(1, Math.round(act.length / 3))).forEach(q => { q.petrified = true; });
    if (b.id === 'lich') state.quests.filter(q => q.completed && !q.undead).slice(-2).forEach((q, i) => state.quests.push({
        ...q, id: Date.now() + i, title: '💀 ' + q.title, completed: false, undead: true, weakness: false,
        xp: Math.max(1, Math.round(q.xp * .7)), gold: Math.round(q.gold * .7), days: 3, createdAt: Date.now()
    }));
    saveState(); renderAll(); showToast(`⚔️ ${bossDef().name} desafiado! Boa sorte!`);
}

function endEvent(victory) {
    const b = bossDef(); let html;
    if (victory) {
        const g = 100 + state.level * 10; state.gold += g; gainXp(50);
        html = `<h2>🏆 Vitória!</h2><p class="boss-intro">${b.name} foi derrotado!</p><div class="xp-gain">🪙 +${g} Ouro | 📜 +50 XP</div>`;
        state.boss.status = 'defeated';
    } else {
        const p = b.penalty, lost = Math.round(state.gold * p.gold), parts = [];
        const hp0 = state.hp; hurt(p.hp); parts.push(`❤️ -${Math.max(0, hp0 - state.hp)} de vida`);
        if (lost) { state.gold -= lost; parts.push(`🪙 -${lost} de ouro`); }
        if (p.level) { loseLevel(); parts.push('⬇️ -1 nível'); }
        html = `<h2>💀 ${b.name} venceu</h2><p class="boss-intro">A semana acabou e o chefe ainda está de pé.</p><div class="boss-box">${parts.join(' · ')}</div>`;
        state.boss.status = 'failed';
    }
    state.quests.forEach(q => delete q.petrified);
    state.quests = state.quests.filter(q => !(q.undead && !q.completed));
    html += '<div class="modal-actions"><button class="btn btn-primary" data-act="close">Continuar</button></div>';
    if (victory) { saveState(); renderAll(); }
    return html;
}

// ----- Modal do chefe -----
function penaltyText(p) {
    return [`❤️ -${p.hp} de vida`, p.gold && `🪙 -${Math.round(p.gold * 100)}% do ouro`, p.level && '⬇️ -1 nível'].filter(Boolean).join(' · ');
}
function introHtml(canChoose) {
    const b = bossDef(), sw = gear('sword'), st = gear('staff'), hpMax = 100 + state.level * 20;
    return `<img class="boss-sprite" src="${b.img}" alt="${b.name}">
        <h2>${b.name}</h2><p class="boss-intro">${b.intro}</p>
        <div class="boss-box"><b>🎯 Fraqueza:</b> ${b.weak}</div>
        <div class="boss-box"><b>☠️ Maldição:</b> ${b.curse}</div>
        <div class="boss-box"><b>⚠️ Se você falhar:</b> ${penaltyText(b.penalty)}</div>
        <p class="boss-note">Vida do chefe: ${state.boss.maxHp || hpMax} · Seu dano numa missão média: ${damageFor({ diff: 'medium' })} (fraqueza: ${damageFor({ diff: 'medium', weakness: true })})${sw || st ? '' : ' — equipe itens na loja para causar mais!'}</p>
        <div class="modal-actions">${canChoose
            ? '<button class="btn btn-secondary" data-act="decline">Ignorar</button><button class="btn btn-primary" data-act="accept">Enfrentar</button>'
            : '<button class="btn btn-primary" data-act="close">Fechar</button>'}</div>`;
}
function showBossModal(html) {
    document.getElementById('boss-modal').innerHTML = html;
    document.getElementById('boss-overlay').classList.add('active');
}
function closeBossModal() { document.getElementById('boss-overlay').classList.remove('active'); }

document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (e.target.id === 'boss-overlay') return closeBossModal();
    if (!act || !e.target.closest('#boss-overlay, #boss-banner')) return;
    if (act === 'details') showBossModal(introHtml(state.boss.status === 'pending'));
    else if (act === 'accept') { closeBossModal(); startEvent(); }
    else if (act === 'decline') { state.boss.status = 'declined'; saveState(); closeBossModal(); renderAll(); showToast('🛡️ Você ignorou o chefe desta semana.'); }
    else if (act === 'close') { closeBossModal(); bossTick(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && typeof session !== 'undefined' && session) bossTick(); });

// ----- Ganchos nas funções do app -----
const _rh = renderHeader;
renderHeader = () => {
    _rh();
    document.getElementById('header-hp').textContent = Math.max(0, state.hp);
    document.getElementById('header-max-hp').textContent = maxHp();
};

const _ra = renderAll;
renderAll = () => { _ra(); renderBossUI(); };

getDaysLeft = (createdAt, days) => {
    const eff = bossIs('demonio') ? Math.floor(days / 2) : days;
    return Math.ceil((createdAt + eff * DAY - Date.now()) / DAY);
};

const _rq = renderQuests;
renderQuests = () => {
    _rq();
    state.quests.filter(q => !q.completed).forEach(q => {
        const card = document.getElementById(`quest-${q.id}`); if (!card) return;
        const meta = card.querySelector('.quest-meta');
        const tag = (t) => meta.insertAdjacentHTML('beforeend', `<span class="deadline-badge boss-tag">${t}</span>`);
        if (q.weakness) tag('🎯 Fraqueza');
        if (q.undead) tag('💀 Morto-vivo');
        if (q.petrified && bossActive()) { tag('🗿 Petrificada'); card.classList.add('petrified'); }
    });
};

const _ocm = openCompleteModal;
openCompleteModal = (id) => {
    const q = state.quests.find(x => x.id === id);
    if (q?.petrified && bossIs('basilisco') && state.boss.hp > state.boss.maxHp / 2) {
        return showToast('🗿 Petrificada! Cause dano ao Basilisco para quebrar a pedra.');
    }
    _ocm(id);
    if (q) { const r = bossAdjust(q); document.getElementById('modal-reward').textContent = `📜 +${r.xp} XP | 🪙 +${r.gold} Ouro${r.dmg ? ` | ⚔️ ${r.dmg} de dano` : ''}`; }
};

const _pqc = processQuestCompletion;
processQuestCompletion = () => {
    const q = state.quests.find(x => x.id === currentQuestIdToComplete);
    if (!q) return _pqc();
    const r = bossAdjust(q), o = { xp: q.xp, gold: q.gold };
    q.xp = r.xp; q.gold = r.gold;
    _pqc();
    q.xp = o.xp; q.gold = o.gold;
    state.hp = Math.min(maxHp(), state.hp + 5);
    if (bossActive() && r.dmg) {
        state.boss.hp = Math.max(0, state.boss.hp - r.dmg);
        if (state.boss.hp === 0) { showBossModal(endEvent(true)); }
        else showToast(`⚔️ ${bossDef().name} sofreu ${r.dmg} de dano!`);
    }
    saveState(); renderAll();
};

const _ocr = openCreateModal;
openCreateModal = () => {
    _ocr();
    const row = document.getElementById('weak-row');
    row.hidden = !bossActive();
    document.getElementById('quest-weak').checked = false;
    if (bossActive()) document.getElementById('weak-hint').textContent = `(${bossDef().name}: ${bossDef().weak})`;
};

const _sq = submitQuest;
submitQuest = () => {
    const n = state.quests.length, weak = bossActive() && document.getElementById('quest-weak').checked;
    _sq();
    if (weak && state.quests.length > n) { state.quests[state.quests.length - 1].weakness = true; saveState(); renderAll(); }
};

// ----- Loja -----
const FOOD_BLOCKED = (item) => item.food && bossIs('bruxa');
renderShop = () => {
    document.getElementById('shop-gold').textContent = state.gold;
    const consum = SHOP_ITEMS.map(item => {
        const blocked = FOOD_BLOCKED(item);
        return shopCard(item.icon, item.name, blocked ? '🍰 Bloqueado pela Bruxa da Gula' : item.desc, item.price,
            `<button class="btn-buy" data-buy="${item.id}" ${blocked || state.gold < item.price ? 'disabled' : ''}>${blocked ? 'Bloqueado' : 'Comprar'}</button>`);
    }).join('');
    const arsenal = EQUIP.map(e => {
        const own = state.owned.includes(e.id), on = state.equipped[e.slot] === e.id;
        const btn = !own ? `<button class="btn-buy" data-buy="${e.id}" ${state.gold < e.price ? 'disabled' : ''}>Comprar</button>`
            : `<button class="btn-buy" data-equip="${e.id}" ${on ? 'disabled' : ''}>${on ? 'Equipado ✓' : 'Equipar'}</button>`;
        return shopCard(e.icon, e.name, `${SLOT_LABEL[e.slot]} · ${equipStat(e)}`, own ? null : e.price, btn);
    }).join('');
    document.getElementById('shop-list').innerHTML = consum + '<h2 class="section-title">⚔️ Arsenal</h2>' + arsenal;
    document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buyItem(b.dataset.buy)));
    document.querySelectorAll('[data-equip]').forEach(b => b.addEventListener('click', () => {
        const e = EQUIP.find(x => x.id === b.dataset.equip); state.equipped[e.slot] = e.id;
        saveState(); renderAll(); showToast(`${e.icon} ${e.name} equipado!`);
    }));
};
function shopCard(icon, name, desc, price, btn) {
    return `<div class="shop-item"><div class="shop-icon">${icon}</div>
        <div class="shop-info"><div class="shop-name">${escapeHtml(name)}</div><div class="shop-desc">${escapeHtml(desc)}</div></div>
        <div style="text-align:right">${price != null ? `<div class="shop-price">🪙 ${price}</div>` : ''}${btn}</div></div>`;
}
buyItem = (rawId) => {
    const item = EQUIP.find(e => e.id === rawId) || SHOP_ITEMS.find(i => i.id === parseInt(rawId));
    if (!item || state.gold < item.price) return showToast('⚠️ Ouro insuficiente!');
    if (FOOD_BLOCKED(item)) return showToast('🍰 A Bruxa da Gula trancou a despensa!');
    state.gold -= item.price; state.spent += item.price;
    if (item.slot) { state.owned.push(item.id); state.equipped[item.slot] = state.equipped[item.slot] || item.id; }
    saveState(); showToast(`🛒 ${item.name} comprado por ${item.price} 🪙!`); renderAll();
};

// ----- Interface: banner e equipamento no perfil -----
function renderBossUI() {
    const el = document.getElementById('boss-banner'), b = bossDef();
    if (el && b) {
        const s = state.boss.status, left = Math.max(0, Math.ceil((weekEnd(state.boss.weekKey) - Date.now()) / DAY));
        const info = s === 'active'
            ? `<div class="profile-xp-bar"><div class="hp-fill" style="width:${state.boss.hp / state.boss.maxHp * 100}%"></div></div><span class="boss-sub">❤️ ${state.boss.hp}/${state.boss.maxHp} · ⏳ ${left} dia(s)</span>`
            : `<span class="boss-sub">${{ pending: 'Apareceu um desafiante!', declined: 'Você ignorou esta semana.', defeated: '🏆 Derrotado!', failed: '💀 Venceu esta semana.' }[s]}</span>`;
        el.innerHTML = `<div class="card boss-banner"><img class="boss-thumb" src="${b.img}" alt=""><div class="boss-banner-info"><h3>${b.name}</h3>${info}</div>${s === 'active' || s === 'pending' ? '<button class="btn btn-secondary boss-details" data-act="details">Detalhes</button>' : ''}</div>`;
    }
    const g = document.getElementById('profile-gear');
    if (g) g.innerHTML = `<div class="profile-xp-bar"><div class="hp-fill" style="width:${Math.max(0, state.hp) / maxHp() * 100}%"></div></div>
        <p class="profile-xp-text">❤️ ${Math.max(0, state.hp)} / ${maxHp()} de vida</p>
        <div class="gear-grid">${['sword', 'armor', 'staff'].map(s => { const e = gear(s); return `<div class="gear-slot"><span class="gear-icon">${e ? e.icon : '➖'}</span><span class="profile-stat-label">${e ? e.name : SLOT_LABEL[s]}</span></div>`; }).join('')}</div>
        <p class="profile-xp-text">Dano em missão média: ${damageFor({ diff: 'medium' })} · na fraqueza: ${damageFor({ diff: 'medium', weakness: true })}</p>`;
}
