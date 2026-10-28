// ===== CONFIG =====
const DIFFICULTY_REWARDS = {
    easy:   { xpMin: 1,  xpMax: 10,  goldMin: 1,  goldMax: 5  },
    medium: { xpMin: 11, xpMax: 19,  goldMin: 6,  goldMax: 16 },
    hard:   { xpMin: 20, xpMax: 25,  goldMin: 17, goldMax: 20 },
    epic:   { xpMin: 26, xpMax: 40,  goldMin: 21, goldMax: 30 }
};

const DIFFICULTY_LABELS = {
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    epic: 'Épico'
};

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

const SHOP_ITEMS = [
    { id: 1, name: "Pausa de Café", desc: "15 min de descanso", icon: "☕", price: 10 },
    { id: 2, name: "Episódio Anime", desc: "Assistir 1 episódio", icon: "📺", price: 30 },
    { id: 3, name: "Jogar 1h", desc: "Tempo livre para jogar", icon: "🎮", price: 50 },
    { id: 4, name: "Dia de Folga", desc: "Um dia sem tarefas", icon: "🏖️", price: 200 },
    { id: 5, name: "Skin Lendária", desc: "Nova aparência para o herói", icon: "👑", price: 500 },
    { id: 6, name: "Refeição Livre", desc: "Comer o que quiser hoje", icon: "🍕", price: 40, food: true },
    { id: 7, name: "Docinho", desc: "Um doce sem culpa", icon: "🍫", price: 15, food: true }
];

const DEFAULT_QUESTS = [
    { id: 1, title: "Santuário do Conhecimento", desc: "Estudar 1 hora para a aula de Mobile da Fatec.", diff: "medium", days: 3, xp: 15, gold: 10, completed: false, createdAt: Date.now() },
    { id: 2, title: "Treino do Bárbaro", desc: "Completar o treino do dia na Smart Fit.", diff: "hard", days: 1, xp: 22, gold: 18, completed: false, createdAt: Date.now() },
    { id: 3, title: "Derrotar o Dragão da Louça", desc: "Lavar toda a louça do jantar sem usar o celular.", diff: "easy", days: 0, xp: 8, gold: 4, completed: false, createdAt: Date.now() }
];

// ===== STATE =====
let storageKey = 'rpg_produtividade_state';
let session = null;
let cloudTimer = null;
let state = getDefaultState();
let currentQuestIdToComplete = null;
let lottieAnimation = null;

function getDefaultState() {
    return {
        level: 1,
        xp: 0,
        maxXp: 100,
        gold: 0,
        totalXp: 0,
        completed: 0,
        spent: 0,
        quests: DEFAULT_QUESTS.map(q => ({ ...q, createdAt: Date.now() }))
    };
}

function loadState() {
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Garante que todas as propriedades existam
            return { ...getDefaultState(), ...parsed };
        }
    } catch (e) {
        console.warn('Erro ao carregar estado:', e);
    }
    return getDefaultState();
}

function saveState() {
    state.updatedAt = Date.now();
    const snapshot = JSON.parse(JSON.stringify(state));
    try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (e) {
        console.warn('Erro ao salvar estado:', e);
    }
    // Sincroniza com a nuvem (Firestore) com pequeno atraso para juntar alterações seguidas
    if (session && session.uid !== 'guest' && window.IgnisCloud) {
        const uid = session.uid;
        clearTimeout(cloudTimer);
        cloudTimer = setTimeout(() => {
            window.IgnisCloud.save(uid, snapshot).catch(e => console.warn('Erro ao sincronizar:', e));
        }, 800);
    }
}

// ===== UTILS =====
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDaysLeft(createdAt, days) {
    const deadline = createdAt + (days * 24 * 60 * 60 * 1000);
    const now = Date.now();
    const diff = deadline - now;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function formatDaysLeft(daysLeft) {
    if (daysLeft < 0) return 'Atrasada';
    if (daysLeft === 0) return 'Hoje';
    if (daysLeft === 1) return '1 dia';
    return `${daysLeft} dias`;
}

function getRank(level) {
    return RANKS[Math.min(level - 1, RANKS.length - 1)] || 'E';
}

function getAvatar(level) {
    if (level >= 20) return '👑';
    if (level >= 15) return '🐉';
    if (level >= 10) return '⚔️';
    if (level >= 5) return '🛡️';
    return '🧙';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== REWARD GENERATION =====
function generateRewards(difficulty) {
    const cfg = DIFFICULTY_REWARDS[difficulty];
    return {
        xp: randInt(cfg.xpMin, cfg.xpMax),
        gold: randInt(cfg.goldMin, cfg.goldMax)
    };
}

function updateRewardPreview() {
    const diff = document.getElementById('quest-diff').value;
    const cfg = DIFFICULTY_REWARDS[diff];
    const preview = document.getElementById('reward-preview');
    if (preview) {
        preview.querySelector('.reward-preview-value').textContent =
            `📜 ${cfg.xpMin}-${cfg.xpMax} XP | 💰 ${cfg.goldMin}-${cfg.goldMax} Ouro`;
    }
}

// ===== RENDER HEADER =====
function renderHeader() {
    document.getElementById('player-level').textContent = state.level;
    document.getElementById('header-current-xp').textContent = state.xp;
    document.getElementById('header-max-xp').textContent = state.maxXp;
    document.getElementById('header-xp-fill').style.width = (state.xp / state.maxXp * 100) + '%';
    document.getElementById('player-gold').textContent = state.gold;
}

// ===== RENDER SKELETONS =====
function renderSkeletons() {
    const board = document.getElementById('quest-board');
    board.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        board.innerHTML += `
            <div class="card">
                <div class="skeleton-wrapper">
                    <div class="skeleton skeleton-icon"></div>
                    <div class="skeleton-content">
                        <div class="skeleton skeleton-line"></div>
                        <div class="skeleton skeleton-line short"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

// ===== RENDER QUESTS =====
function renderQuests() {
    const board = document.getElementById('quest-board');
    const active = state.quests.filter(q => !q.completed);

    if (active.length === 0) {
        board.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📜</div>
                <p>Nenhuma missão ativa. Crie uma nova!</p>
            </div>`;
        return;
    }

    board.innerHTML = active.map(quest => {
        const daysLeft = getDaysLeft(quest.createdAt, quest.days);
        const isUrgent = daysLeft <= 1 && daysLeft >= 0;
        const diffLabel = DIFFICULTY_LABELS[quest.diff];

        return `
            <div class="card" id="quest-${quest.id}">
                <div class="card-header">
                    <div class="card-main">
                        <span class="gem gem-${quest.diff}" role="img" aria-label="${diffLabel}"></span>
                        <div class="quest-info">
                            <h3>${escapeHtml(quest.title)}</h3>
                            <p>${escapeHtml(quest.desc)}</p>
                            <div class="quest-meta">
                                <span class="badge badge-${quest.diff}">${diffLabel}</span>
                                <span class="deadline-badge ${isUrgent ? 'urgent' : ''}">⏳ ${formatDaysLeft(daysLeft)}</span>
                            </div>
                            <span class="reward">📜 ${quest.xp} XP | 💰 ${quest.gold} Ouro</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-action" data-action="complete" data-id="${quest.id}" title="Concluir Missão">✅</button>
                        <button class="btn-action" data-action="delete" data-id="${quest.id}" title="Excluir Missão">🗑️</button>
                    </div>
                </div>
                <div class="swipe-confirm-box" id="swipe-box-${quest.id}">
                    <div class="swipe-track" id="track-${quest.id}">
                        <span class="swipe-text" id="text-${quest.id}">⏩ Arraste para excluir</span>
                        <div class="swipe-thumb" id="thumb-${quest.id}">➡️</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.btn-action[data-action="complete"]').forEach(btn => {
        btn.addEventListener('click', () => openCompleteModal(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-action[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => toggleSwipeBox(parseInt(btn.dataset.id)));
    });

    active.forEach(quest => setupSwipeEvents(quest.id));
}

// ===== RENDER SHOP =====
function renderShop() {
    document.getElementById('shop-gold').textContent = state.gold;
    const list = document.getElementById('shop-list');

    list.innerHTML = SHOP_ITEMS.map(item => `
        <div class="shop-item">
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${escapeHtml(item.name)}</div>
                <div class="shop-desc">${escapeHtml(item.desc)}</div>
            </div>
            <div style="text-align:right">
                <div class="shop-price">💰 ${item.price}</div>
                <button class="btn-buy" data-id="${item.id}" ${state.gold < item.price ? 'disabled' : ''}>Comprar</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', () => buyItem(parseInt(btn.dataset.id)));
    });
}

// ===== RENDER PROFILE =====
function renderProfile() {
    document.getElementById('profile-avatar').textContent = getAvatar(state.level);
    document.getElementById('profile-rank').textContent = getRank(state.level);
    document.getElementById('profile-current-xp').textContent = state.xp;
    document.getElementById('profile-max-xp').textContent = state.maxXp;
    document.getElementById('profile-xp-fill').style.width = (state.xp / state.maxXp * 100) + '%';

    document.getElementById('stat-level').textContent = state.level;
    document.getElementById('stat-completed').textContent = state.completed;
    document.getElementById('stat-total-xp').textContent = state.totalXp;
    document.getElementById('stat-gold').textContent = state.gold;
    document.getElementById('stat-spent').textContent = state.spent;
    document.getElementById('stat-rank').textContent = getRank(state.level);
}

// ===== COMPLETE QUEST =====
function openCompleteModal(questId) {
    currentQuestIdToComplete = questId;
    const quest = state.quests.find(q => q.id === questId);
    if (!quest) return;

    document.getElementById('modal-reward').textContent = `📜 +${quest.xp} XP | 💰 +${quest.gold} Ouro`;
    document.getElementById('level-up-banner').style.display = 'none';

    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    overlay.classList.add('active');

    if (typeof Motion !== 'undefined') {
        Motion.animate(overlay, { opacity: [0, 1] }, { duration: 0.2 });
        Motion.animate(modal, { transform: ['translateY(30px) scale(0.9)', 'translateY(0px) scale(1)'] }, { duration: 0.3, easing: [0.175, 0.885, 0.32, 1.275] });
    }

    if (lottieAnimation) {
        lottieAnimation.goToAndPlay(0, true);
    }
}

function closeRewardModal() {
    const overlay = document.getElementById('overlay');

    if (typeof Motion !== 'undefined') {
        Motion.animate(overlay, { opacity: [1, 0] }, { duration: 0.2 }).finished.then(() => {
            overlay.classList.remove('active');
            processQuestCompletion();
        });
    } else {
        overlay.classList.remove('active');
        processQuestCompletion();
    }
}

function processQuestCompletion() {
    if (currentQuestIdToComplete === null) return;

    const quest = state.quests.find(q => q.id === currentQuestIdToComplete);
    if (!quest) return;

    quest.completed = true;
    state.xp += quest.xp;
    state.totalXp += quest.xp;
    state.gold += quest.gold;
    state.completed++;

    let leveledUp = false;
    while (state.xp >= state.maxXp) {
        state.xp -= state.maxXp;
        state.level++;
        state.maxXp = Math.floor(state.maxXp * 1.4);
        leveledUp = true;
    }

    if (leveledUp) {
        document.getElementById('new-level').textContent = state.level;
        document.getElementById('level-up-banner').style.display = 'block';
        showToast(`🎉 LEVEL UP! Você alcançou o Nível ${state.level}!`);
    } else {
        showToast(`✅ "${quest.title}" completa! +${quest.xp} XP, +${quest.gold} 💰`);
    }

    currentQuestIdToComplete = null;
    saveState();
    renderAll();
}

// ===== BUY ITEM =====
function buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || state.gold < item.price) {
        showToast('⚠️ Ouro insuficiente!');
        return;
    }

    state.gold -= item.price;
    state.spent += item.price;
    saveState();
    showToast(`🛒 ${item.name} comprado por ${item.price} 💰!`);
    renderAll();
}

// ===== CREATE QUEST =====
function openCreateModal() {
    document.getElementById('create-overlay').classList.add('active');
    document.getElementById('quest-name').value = '';
    document.getElementById('quest-desc').value = '';
    document.getElementById('quest-diff').value = 'medium';
    document.getElementById('quest-days').value = '3';
    updateRewardPreview();
    document.getElementById('quest-name').focus();
}

function closeCreateModal() {
    document.getElementById('create-overlay').classList.remove('active');
}

function submitQuest() {
    const title = document.getElementById('quest-name').value.trim();
    const desc = document.getElementById('quest-desc').value.trim();
    const diff = document.getElementById('quest-diff').value;
    const days = parseInt(document.getElementById('quest-days').value) || 3;

    if (!title) {
        showToast('⚠️ Digite o nome da missão!');
        return;
    }

    const rewards = generateRewards(diff);
    const newQuest = {
        id: Date.now(),
        title,
        desc: desc || `Missão de dificuldade ${DIFFICULTY_LABELS[diff]}`,
        diff,
        days: Math.max(0, Math.min(30, days)),
        xp: rewards.xp,
        gold: rewards.gold,
        completed: false,
        createdAt: Date.now()
    };

    state.quests.push(newQuest);
    saveState();
    closeCreateModal();
    showToast(`⚔️ Missão "${title}" criada!`);
    renderAll();
}

// ===== DELETE / SWIPE =====
function toggleSwipeBox(questId) {
    const box = document.getElementById(`swipe-box-${questId}`);
    if (box) box.classList.toggle('active');
}

function setupSwipeEvents(questId) {
    const track = document.getElementById(`track-${questId}`);
    const thumb = document.getElementById(`thumb-${questId}`);
    const text = document.getElementById(`text-${questId}`);
    if (!track || !thumb) return;

    let isDragging = false, startX = 0, currentX = 0;

    function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

    function onStart(e) {
        isDragging = true;
        startX = getX(e);
        thumb.style.transition = 'none';
    }

    function onMove(e) {
        if (!isDragging) return;
        const maxDrag = track.clientWidth - thumb.clientWidth - 4;
        let diff = getX(e) - startX;
        if (diff < 0) diff = 0;
        if (diff > maxDrag) diff = maxDrag;
        currentX = diff;
        thumb.style.transform = `translateX(${currentX}px)`;
        if (text) text.style.opacity = (1 - (currentX / maxDrag)).toString();
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        const maxDrag = track.clientWidth - thumb.clientWidth - 4;
        if (currentX / maxDrag >= 0.85) {
            thumb.style.transform = `translateX(${maxDrag}px)`;
            deleteQuest(questId);
        } else {
            thumb.style.transition = 'transform 0.3s ease';
            thumb.style.transform = 'translateX(0px)';
            if (text) text.style.opacity = '1';
            currentX = 0;
        }
    }

    thumb.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    thumb.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
}

function deleteQuest(questId) {
    const card = document.getElementById(`quest-${questId}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            state.quests = state.quests.filter(q => q.id !== questId);
            saveState();
            renderAll();
        }, 300);
    }
}

// ===== TABS =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`.nav-item[data-tab="${tabName}"]`).classList.add('active');
}

// ===== RENDER ALL =====
function renderAll() {
    renderHeader();
    renderQuests();
    renderShop();
    renderProfile();
}

// ===== SESSÃO (login) =====
async function startSession(user) {
    session = user;
    storageKey = `rpg_state_${user.uid}`;
    state = loadState();
    document.querySelector('.profile-name').textContent = user.name;
    renderSkeletons();

    if (window.IgnisCloud && user.uid !== 'guest') {
        try {
            const remote = await window.IgnisCloud.load(user.uid);
            if (session !== user) return; // outro usuário entrou durante a carga
            if (remote && (remote.updatedAt || 0) >= (state.updatedAt || 0)) {
                state = { ...getDefaultState(), ...remote };
                localStorage.setItem(storageKey, JSON.stringify(state));
            } else {
                saveState(); // conta nova ou dados locais mais recentes: envia para a nuvem
            }
        } catch (e) {
            console.warn('Nuvem indisponível:', e);
            showToast('Sem conexão com a nuvem: usando dados deste aparelho');
        }
    }
    if (window.bossTick) bossTick();
    renderAll();
}

function stopSession() {
    session = null;
    clearTimeout(cloudTimer);
    state = getDefaultState();
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
}

window.IgnisApp = { startSession, stopSession };

// ===== INIT =====
function init() {
    // Lottie
    const sampleLottieJSON = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        v: "5.5.7", fr: 60, ip: 0, op: 60, w: 100, h: 100, nm: "Check",
        layers: [{
            ddd: 0, ind: 1, ty: 4, nm: "Checkmark", sr: 1, ks: {
                o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [50, 50, 0] },
                a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] }
            },
            shapes: [{
                ty: "grp", items: [
                    { ty: "sh", ks: { a: 0, k: { i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]], v: [[-20, 0], [-5, 15], [20, -10]], c: false } } },
                    { ty: "st", c: { a: 0, k: [0.85, 0.47, 0.02, 1] }, w: { a: 0, k: 7 }, lc: 2, lj: 2 },
                    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
                ]
            }]
        }]
    }));

    if (typeof lottie !== 'undefined') {
        lottieAnimation = lottie.loadAnimation({
            container: document.getElementById('lottie-container'),
            renderer: 'svg', loop: false, autoplay: false, path: sampleLottieJSON
        });
    }

    // Event listeners
    document.getElementById('add-btn').addEventListener('click', () => openCreateModal());
    document.getElementById('create-cancel').addEventListener('click', closeCreateModal);
    document.getElementById('create-submit').addEventListener('click', () => submitQuest());
    document.getElementById('close-btn').addEventListener('click', closeRewardModal);
    document.getElementById('quest-diff').addEventListener('change', updateRewardPreview);

    document.getElementById('create-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('create-overlay')) closeCreateModal();
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('quest-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitQuest();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        if (window.IgnisCloud) window.IgnisCloud.logout();
        else location.reload();
    });
    // A renderização inicial acontece em startSession(), depois do login
}

init();
