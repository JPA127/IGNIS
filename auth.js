import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig, isConfigured } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const screen = $('auth-screen');
const setState = (s) => { screen.dataset.state = s; };
const showError = (m = '') => { $('auth-error').textContent = m; };

const ERROS = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem conta. Use "Entrar".',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups.',
    'auth/unauthorized-domain': 'Domínio não autorizado: adicione-o em Authentication → Settings → Authorized domains.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': ''
};

if (!isConfigured) {
    // Sem Firebase configurado: só o modo local, com aviso
    $('auth-setup').hidden = false;
    $('guest-btn').hidden = false;
    document.querySelectorAll('#google-btn, #auth-form button, #auth-form input').forEach((el) => { el.disabled = true; });
    $('guest-btn').onclick = () => {
        setState('hidden');
        window.IgnisApp.startSession({ uid: 'guest', name: 'Aventureiro', email: '' });
    };
    setState('login');
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Ponte usada pelo script.js (que não é módulo)
    window.IgnisCloud = {
        load: async (uid) => {
            const snap = await getDoc(doc(db, 'users', uid));
            return snap.exists() ? snap.data().state : null;
        },
        save: (uid, state) => setDoc(doc(db, 'users', uid), { state }, { merge: true }),
        logout: () => signOut(auth)
    };

    const busy = (on) => document.querySelectorAll('.auth-card button').forEach((b) => { b.disabled = on; });
    async function run(fn) {
        showError(); busy(true);
        try { await fn(); } catch (e) { showError(ERROS[e.code] ?? 'Não foi possível entrar. Tente novamente.'); }
        finally { busy(false); }
    }
    const creds = () => [$('auth-email').value.trim(), $('auth-pass').value];

    $('google-btn').onclick = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()));
    $('auth-form').onsubmit = (e) => { e.preventDefault(); run(() => signInWithEmailAndPassword(auth, ...creds())); };
    $('signup-btn').onclick = () => { if ($('auth-form').reportValidity()) run(() => createUserWithEmailAndPassword(auth, ...creds())); };

    onAuthStateChanged(auth, (user) => {
        if (user) {
            setState('hidden');
            window.IgnisApp.startSession({
                uid: user.uid,
                name: user.displayName || (user.email || 'Aventureiro').split('@')[0],
                email: user.email || ''
            });
        } else {
            window.IgnisApp.stopSession();
            $('auth-pass').value = '';
            setState('login');
        }
    });
}
