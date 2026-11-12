// Cole aqui a configuração do seu app web:
// Firebase Console → Configurações do projeto → Seus apps → Config do SDK.
// Esses valores não são segredos (a proteção dos dados está nas regras do Firestore).
export const firebaseConfig = {
    apiKey: "AIzaSyCNtWk1uq02ZznjIgYTcGClKvG_nVZeVJk",
    authDomain: "ignis-8a3a2.firebaseapp.com",
    projectId: "ignis-8a3a2",
    appId: "1:515736743506:web:68a6c4f3ec2b777a91b98b"
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => v.includes("COLE_AQUI"));
