// ===== VISUALIZAÇÕES DAS MISSÕES (estilo Notion) + ESCOLHA DE CHEFE (DEMO) =====
const VIEW_LIST = [['list', '☰', 'Lista'], ['table', '▦', 'Tabela'], ['board', '🗂️', 'Quadro'], ['timeline', '⏳', 'Linha do tempo'], ['calendar', '📅', 'Calendário']];
const DIFF_ORDER = ['easy', 'medium', 'hard', 'epic'];
let calMonth = new Date(); calMonth.setDate(1);
let calSel = null;

const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueDay = (q) => dayStart(q.createdAt + (bossIs('demonio') ? Math.floor(q.days / 2) : q.days) * DAY);
const flags = (q) => (q.petrified && bossActive() ? '🗿 ' : '') + (q.weakness ? '🎯 ' : '') + (q.undead ? '💀 ' : '');
const gemSm = (q) => `<span class="gem gem-${q.diff} gem-sm"></span>`;
const itemBtn = (q) => `<button class="vw-item ${weakCls(q)}" data-q="${q.id}"><span class="vw-line">${gemSm(q)}${flags(q)}${escapeHtml(q.title)}</span><small>⏳ ${formatDaysLeft(getDaysLeft(q.createdAt, q.days))} · 📜 ${q.xp} · 💰 ${q.gold}</small></button>`;

const VIEWS = {
    table: (a) => `<div class="vw-scroll"><table class="vw-table"><thead><tr><th>Missão</th><th>Dificuldade</th><th>Prazo</th><th>Recompensa</th></tr></thead><tbody>${a.map(q =>
        `<tr data-q="${q.id}" class="${weakCls(q)}"><td>${gemSm(q)}${flags(q)}${escapeHtml(q.title)}</td><td>${DIFFICULTY_LABELS[q.diff]}</td><td>${formatDaysLeft(getDaysLeft(q.createdAt, q.days))}</td><td>📜 ${q.xp} · 💰 ${q.gold}</td></tr>`).join('')}</tbody></table></div>`,

    board: (a) => `<div class="vw-board">${DIFF_ORDER.map(d => {
        const col = a.filter(q => q.diff === d);
        return `<div class="vw-col"><h4 class="vw-col-h"><span class="gem gem-${d} gem-sm"></span>${DIFFICULTY_LABELS[d]}<span>${col.length}</span></h4>${col.map(itemBtn).join('') || '<p class="vw-empty">—</p>'}</div>`;
    }).join('')}</div>`,

    timeline: (a) => {
        const t0 = dayStart(Date.now());
        const rows = a.map(q => { const s = Math.max(-3, Math.round((dayStart(q.createdAt) - t0) / DAY)); return { q, s, e: Math.max(s, Math.round((dueDay(q) - t0) / DAY)) }; });
        const lo = Math.min(0, ...rows.map(r => r.s)), hi = Math.min(lo + 20, Math.max(6, ...rows.map(r => r.e))), n = hi - lo + 1;
        const head = Array.from({ length: n }, (_, i) => `<span class="tl-day ${lo + i === 0 ? 'today' : ''}">${new Date(t0 + (lo + i) * DAY).getDate()}</span>`).join('');
        return `<div class="vw-scroll"><div class="tl" style="--n:${n}"><div class="tl-head">${head}</div>${rows.map(({ q, s, e }) =>
            `<div class="tl-title">${flags(q)}${escapeHtml(q.title)}</div><div class="tl-track"><button class="tl-bar bar-${q.diff}" data-q="${q.id}" aria-label="${escapeHtml(q.title)}" style="grid-column:${Math.max(s, lo) - lo + 1} / ${Math.min(e, hi) - lo + 2}"></button></div>`).join('')}</div></div>`;
    },

    calendar: (a) => {
        const y = calMonth.getFullYear(), m = calMonth.getMonth(), today = dayStart(Date.now()), sel = calSel ?? today;
        const byDay = {}; a.forEach(q => { (byDay[dueDay(q)] ||= []).push(q); });
        let cells = '<span></span>'.repeat(new Date(y, m, 1).getDay());
        for (let d = 1, n = new Date(y, m + 1, 0).getDate(); d <= n; d++) {
            const ts = new Date(y, m, d).getTime();
            cells += `<button class="cal-cell ${ts === today ? 'today' : ''} ${ts === sel ? 'sel' : ''}" data-day="${ts}"><b>${d}</b><span class="cal-dots">${(byDay[ts] || []).slice(0, 3).map(q => `<i class="dot dot-${q.diff}"></i>`).join('')}</span></button>`;
        }
        return `<div class="cal"><div class="cal-nav"><button class="btn-action" data-cal="-1" aria-label="Mês anterior">‹</button><h4>${calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4><button class="btn-action" data-cal="1" aria-label="Próximo mês">›</button></div>
            <div class="cal-grid">${[...'DSTQQSS'].map(c => `<span class="cal-wd">${c}</span>`).join('')}${cells}</div>
            <div class="cal-day"><h4>${new Date(sel).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</h4>${(byDay[sel] || []).map(itemBtn).join('') || '<p class="vw-empty">Nenhuma missão vence neste dia.</p>'}</div></div>`;
    }
};

function renderViewSwitch() {
    const el = document.getElementById('view-switch'), v = state.view || 'list';
    if (el) el.innerHTML = VIEW_LIST.map(([id, ic, name]) => `<button class="vw-tab ${id === v ? 'active' : ''}" data-view="${id}" aria-pressed="${id === v}">${ic} ${name}</button>`).join('');
}

const _rqv = renderQuests;
renderQuests = () => {
    const a = state.quests.filter(q => !q.completed), v = state.view || 'list';
    renderViewSwitch();
    if (v === 'list' || !a.length) return _rqv();   // lista = cartões completos (com excluir)
    document.getElementById('quest-board').innerHTML = VIEWS[v](a);
};

document.getElementById('view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    state.view = b.dataset.view; saveState(); renderQuests();
});
document.getElementById('quest-board').addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]'), c = e.target.closest('[data-cal]'), d = e.target.closest('[data-day]');
    if (q) openCompleteModal(parseInt(q.dataset.q));
    else if (c) { calMonth.setMonth(calMonth.getMonth() + parseInt(c.dataset.cal)); renderQuests(); }
    else if (d) { calSel = +d.dataset.day; renderQuests(); }
});

// ----- Primeiro acesso: escolha do chefe (demonstração) -----
function showPickModal() {
    showBossModal(`<h2>Escolha seu desafio</h2><p class="boss-intro">Modo demonstração: nesta primeira vez você escolhe o chefe. Nas próximas semanas, ele muda automaticamente.</p>${BOSSES.map(b =>
        `<button class="boss-pick" data-pick="${b.id}"><img src="${b.img}" alt=""><span><b>${b.name}</b><small>${b.curse}</small></span></button>`).join('')}`);
}
document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) {
        state.boss = { weekKey: weekStart(), id: p.dataset.pick, status: 'pending', seen: true };
        state.bossDemoDone = true; saveState(); renderAll(); showBossModal(introHtml(true));
    } else if (e.target.closest('[data-act="pick"]')) showPickModal();
});
const _rbu = renderBossUI;
renderBossUI = () => {
    _rbu();
    const el = document.getElementById('boss-banner');
    if (el && state.boss?.status === 'choosing') el.innerHTML = `<div class="card boss-banner"><span class="boss-thumb boss-q">❔</span><div class="boss-banner-info"><h3>Escolha o chefe da semana</h3><span class="boss-sub">Modo demonstração: todos disponíveis.</span></div><button class="btn btn-secondary boss-details" data-act="pick">Escolher</button></div>`;
};
