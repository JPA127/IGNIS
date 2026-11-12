// ===== PERFIL COMPLETO: nick, foto, sequência, medalhas =====
const $pf = (id) => document.getElementById(id);
let selMedal = null, pfView = 'main', editAv = null;

// ----- Medalhas (marcos) -----
const tiers = (arr) => arr.map((x, i) => [...x, [1, 1, 2, 2, 3][i]]);
const WIN_NAMES = ['Pedra no Sapato', 'Calafrio Extinto', 'Descanse em Paz', 'Fim do Banquete', 'Brasa Apagada'];
const WIN_ICONS = ['🪨', '❄️', '💀', '🍰', '🔥'];
const MASTERY = [
    ['Cinzel Contra o Adiamento', '🗿', 'Derrotar o Basilisco de Pedra completando 10 missões contra a procrastinação.'],
    ['Derretedor do Inverno Eterno', '🧊', 'Derrotar o Yeti das Neves completando 10 missões ligadas ao frio ou ao calor.'],
    ['Exorcista da Bagunça', '🧹', 'Derrotar o Lich Necromante completando 10 missões de organização e limpeza.'],
    ['Guardião da Despensa', '🥗', 'Derrotar a Bruxa da Gula completando 10 missões de autocontrole, nutrição ou disciplina financeira.'],
    ['Domador do Fogo Frio', '🧯', 'Sobreviver e vencer o Demônio de Fogo completando 10 missões de alta intensidade sob prazo curto.']
];
const M = (id, cat, icon, name, desc, goal, val, tier = 2) => ({ id, cat, icon, name, desc, goal, val, tier });
const MEDALS = [
    ...tiers([[10, 'Chama Persistente', '🔥'], [20, 'Guardião da Brasa', '🕯️'], [30, 'Vigília do Mês', '🌙'], [50, 'Sentinela Eterna', '🛡️'], [100, 'Lenda Incandescente', '👑']])
        .map(([n, name, icon, t]) => M('st' + n, 'Sequência', icon, name, `Entrar no IGNIS ${n} dias seguidos.`, n, s => s.streak.best, t)),
    ...tiers([[10, 'Aprendiz Condecorado', '🎖️'], [20, 'Veterano das Masmorras', '⚔️'], [30, 'Campeão da Taverna', '🍺'], [50, 'Herói Lendário', '🏆'], [100, 'Semideus da Produtividade', '🌟']])
        .map(([n, name, icon, t]) => M('lv' + n, 'Nível', icon, name, `Alcançar o nível ${n}.`, n, s => s.level, t)),
    ...BOSSES.map((b, i) => M('win-' + b.id, 'Chefes', WIN_ICONS[i], WIN_NAMES[i], `Derrotar ${b.name} pela primeira vez.`, 1, s => s.stats.wins[b.id] || 0, 2)),
    ...BOSSES.map((b, i) => M('mast-' + b.id, 'Chefes', MASTERY[i][1], MASTERY[i][0], MASTERY[i][2], 1, s => s.stats.mast[b.id] ? 1 : 0, 3)),
    M('allboss', 'Chefes', '☠️', 'Quebrador de Maldições', 'Derrotar os 5 chefes ao menos uma vez.', 5, s => BOSSES.filter(b => s.stats.wins[b.id]).length, 3),
    M('q1', 'Missões', '👣', 'Primeiro Passo', 'Concluir sua primeira missão.', 1, s => s.completed, 1),
    M('q25', 'Missões', '🏹', 'Caçador de Tarefas', 'Concluir 25 missões.', 25, s => s.completed, 2),
    M('q100', 'Missões', '🗡️', 'Centurião das Missões', 'Concluir 100 missões.', 100, s => s.completed, 3),
    M('g500', 'Ouro', '💰', 'Bolsa Recheada', 'Acumular 500 de ouro ao mesmo tempo.', 500, s => s.stats.peakGold, 1),
    M('g2000', 'Ouro', '🐲', 'Tesouro de Dragão', 'Acumular 2000 de ouro ao mesmo tempo.', 2000, s => s.stats.peakGold, 3),
    M('buy500', 'Ouro', '💎', 'Esbanjador Real', 'Gastar 500 de ouro de uma só vez.', 500, s => s.stats.maxBuy, 2),
    M('spent1k', 'Ouro', '🛍️', 'Mão-Aberta', 'Gastar 1000 de ouro no total.', 1000, s => s.spent, 2),
    M('arsenal', 'Arsenal', '🏰', 'Arsenal Completo', 'Comprar os 9 equipamentos da loja.', 9, s => s.owned.length, 3),
    M('armed', 'Arsenal', '🛡️', 'Armado Até os Dentes', 'Equipar espada, armadura e cajado ao mesmo tempo.', 3, s => ['sword', 'armor', 'staff'].filter(k => s.equipped[k]).length, 2)
];

function ensureProfile() {
    state.stats ||= {}; const t = state.stats;
    t.wins ||= {}; t.mast ||= {}; t.peakGold ||= 0; t.maxBuy ||= 0;
    state.streak ||= { cur: 0, best: 0, last: '' }; state.medals ||= {}; state.joined ||= Date.now();
}
function touchStreak() {
    ensureProfile();
    const s = state.streak, today = new Date().toDateString();
    if (s.last === today) return;
    s.cur = s.last === new Date(Date.now() - DAY).toDateString() ? s.cur + 1 : 1;
    s.best = Math.max(s.best, s.cur); s.last = today; saveState();
}
function checkMedals() {
    ensureProfile();
    state.stats.peakGold = Math.max(state.stats.peakGold, state.gold);
    const quiet = !state.medalsInit; state.medalsInit = true;   // 1ª vez: registra o que já foi conquistado sem avisar
    MEDALS.forEach(m => {
        if (state.medals[m.id] || m.val(state) < m.goal) return;
        state.medals[m.id] = Date.now();
        if (!quiet) bossAlert('medal', m.name, `🏅 Nova medalha! ${m.desc}`, 6500, m.icon);
    });
}
const _ss = saveState;
saveState = () => { if (typeof session !== 'undefined' && session) checkMedals(); _ss(); };
const _bt = bossTick;
bossTick = () => { if (typeof session !== 'undefined' && session) touchStreak(); _bt(); };
const _bi = buyItem;
buyItem = (id) => { const g = state.gold; _bi(id); ensureProfile(); state.stats.maxBuy = Math.max(state.stats.maxBuy, g - state.gold); saveState(); };

// ----- Nick e foto -----
const displayName = () => state.nick || (typeof session !== 'undefined' && session?.name) || 'Aventureiro';
function avatarHtml(a = state.avatar) {
    if (a?.t === 'i') return `<img src="${a.v}" alt="">`;
    if (a?.t === 'b') return `<img class="px" src="boss-${a.v}.png" alt="">`;
    if (a?.t === 'e') return a.v;
    return '<svg class="av-flame" aria-hidden="true"><use href="#ignis-flame"/></svg>';
}
const _ra2 = renderAll;
renderAll = () => {
    _ra2();
    const n = document.querySelector('.profile-name'), a = document.querySelector('.profile-avatar');
    if (n) n.textContent = displayName();
    if (a) a.innerHTML = avatarHtml();
};

// ----- Janela do perfil -----
function mainHtml() {
    ensureProfile();
    const got = MEDALS.filter(m => state.medals[m.id]).length, s = state.streak, sel = MEDALS.find(m => m.id === selMedal);
    const slot = (k) => { const e = gear(k); return `<div class="gear-slot"><span class="gear-icon">${e ? e.icon : '➖'}</span><span class="profile-stat-label">${e ? e.name : SLOT_LABEL[k]}</span><small>${e ? equipStat(e) : 'vazio'}</small></div>`; };
    const detail = sel ? `<b>${sel.icon} ${sel.name}</b><p>${sel.desc}</p><small>${state.medals[sel.id] ? '✅ Conquistada em ' + new Date(state.medals[sel.id]).toLocaleDateString('pt-BR') : `🔒 Progresso: ${Math.min(sel.val(state), sel.goal)}/${sel.goal}`}</small>` : '<small>Toque numa medalha para ver o que é e como conquistar.</small>';
    return `<button class="pf-close" data-pf="close" aria-label="Fechar">✕</button>
      <div class="pf-head"><div class="profile-avatar pf-avatar">${avatarHtml()}</div><div><h2>${escapeHtml(displayName())}</h2><p>Nível ${state.level} · membro desde ${new Date(state.joined).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p></div></div>
      <button class="btn btn-secondary pf-edit" data-pf="edit">✏️ Editar perfil</button>
      ${typeof classPanel === 'function' ? classPanel() : ''}
      <div class="profile-xp-bar"><div class="profile-xp-fill" style="width:${state.xp / state.maxXp * 100}%"></div></div>
      <p class="profile-xp-text">📜 ${state.xp} / ${state.maxXp} XP · ❤️ ${Math.max(0, state.hp)}/${maxHp()}</p>
      <div class="profile-stats-grid"><div class="profile-stat"><span class="profile-stat-icon">🔥</span><span class="profile-stat-value">${s.cur}</span><span class="profile-stat-label">Sequência</span></div>
        <div class="profile-stat"><span class="profile-stat-icon">🏅</span><span class="profile-stat-value">${s.best}</span><span class="profile-stat-label">Recorde</span></div>
        <div class="profile-stat"><span class="profile-stat-icon">✅</span><span class="profile-stat-value">${state.completed}</span><span class="profile-stat-label">Missões</span></div></div>
      <h3 class="pf-h">🎒 Inventário equipado</h3><div class="gear-grid">${['sword', 'armor', 'staff'].map(slot).join('')}</div>
      <h3 class="pf-h">☠️ Chefes derrotados</h3><div class="pf-bosses">${BOSSES.map(b => `<div><img class="px" src="${b.img}" alt="${b.name}"><b>×${state.stats.wins[b.id] || 0}</b></div>`).join('')}</div>
      <h3 class="pf-h">🏅 Medalhas <span>${got}/${MEDALS.length}</span></h3>
      <div class="medal-grid">${MEDALS.map(m => `<button class="medal t${m.tier} ${state.medals[m.id] ? '' : 'locked'} ${m.id === selMedal ? 'sel' : ''}" data-medal="${m.id}" aria-label="${m.name}">${m.icon}</button>`).join('')}</div>
      <div class="medal-detail">${detail}</div>`;
}
function editHtml() {
    const wins = (id) => state.stats.wins[id] || 0, cur = editAv || state.avatar;
    const opt = (a, label) => `<button class="av-opt ${JSON.stringify(a) === JSON.stringify(cur) ? 'sel' : ''}" data-av='${JSON.stringify(a)}'>${label}</button>`;
    return `<h2>Editar perfil</h2>
      <div class="form-group"><label for="pf-nick">NICK</label><input id="pf-nick" maxlength="16" value="${escapeHtml(displayName())}" autocomplete="off"></div>
      <div class="form-group"><label>FOTO DE PERFIL</label><div class="av-grid">
        ${opt(null, avatarHtml(null))}
        ${['🧙‍♂️', '🧝‍♀️', '🧛', '🦸', '🥷', '🐉', '🦊', '🐺', '🦉'].map(e => opt({ t: 'e', v: e }, e)).join('')}
        ${BOSSES.map(b => wins(b.id) ? opt({ t: 'b', v: b.id }, `<img class="px" src="${b.img}" alt="${b.name}">`) : `<button class="av-opt" disabled title="Derrote ${b.name} para liberar">🔒</button>`).join('')}
        ${state.avatar?.t === 'i' ? opt(state.avatar, avatarHtml()) : ''}
        <button class="av-opt" data-pf="photo" aria-label="Enviar foto">📷</button></div>
        <small class="pf-hint">🔒 Sprites de chefes liberam ao derrotá-los.</small><input type="file" id="pf-file" accept="image/*" hidden></div>
      <div class="modal-actions"><button class="btn btn-secondary" data-pf="cancel">Cancelar</button><button class="btn btn-primary" data-pf="save">Salvar</button></div>`;
}
function openProfile(view = 'main') { pfView = view; $pf('profile-modal').innerHTML = view === 'main' ? mainHtml() : editHtml(); $pf('profile-overlay').classList.add('active'); }
const closeProfile = () => $pf('profile-overlay').classList.remove('active');

document.addEventListener('click', (e) => {
    if (e.target.closest('.profile-avatar:not(.pf-avatar), .profile-name, #open-profile')) return openProfile();
    if (e.target.id === 'profile-overlay') return closeProfile();
    const m = e.target.closest('[data-medal]');
    if (m) { selMedal = m.dataset.medal; return openProfile(); }
    const av = e.target.closest('[data-av]');
    if (av) { editAv = JSON.parse(av.dataset.av); const nick = $pf('pf-nick').value; openProfile('edit'); $pf('pf-nick').value = nick; return; }
    const act = e.target.closest('[data-pf]')?.dataset.pf;
    if (act === 'close') closeProfile();
    else if (act === 'edit') { editAv = state.avatar || null; openProfile('edit'); }
    else if (act === 'cancel') { editAv = null; openProfile(); }
    else if (act === 'photo') $pf('pf-file').click();
    else if (act === 'save') {
        const nick = $pf('pf-nick').value.trim();
        if (!nick) return showToast('⚠️ Escolha um nick.');
        state.nick = nick; state.avatar = editAv ?? state.avatar ?? null; editAv = null;
        saveState(); renderAll(); openProfile(); showToast('✅ Perfil atualizado!');
    }
});
document.addEventListener('change', (e) => {
    const f = e.target.id === 'pf-file' && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
        const im = new Image();
        im.onload = () => {
            const c = document.createElement('canvas'), s = Math.min(im.width, im.height); c.width = c.height = 128;
            c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 128, 128);
            editAv = { t: 'i', v: c.toDataURL('image/jpeg', .8) }; const nick = $pf('pf-nick').value; openProfile('edit'); $pf('pf-nick').value = nick;
        };
        im.src = r.result;
    };
    r.readAsDataURL(f);
});
