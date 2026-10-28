// Cole aqui a configuração do seu app web:
// Firebase Console → Configurações do projeto → Seus apps → Config do SDK.
// Esses valores não são segredos (a proteção dos dados está nas regras do Firestore).
export const firebaseConfig = {
    apiKey: "COLE_AQUI",
    authDomain: "COLE_AQUI.firebaseapp.com",
    projectId: "COLE_AQUI",
    appId: "COLE_AQUI"
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => v.includes("COLE_AQUI"));
