# Login do IGNIS (Firebase) — configuração

1. **console.firebase.google.com** → Adicionar projeto (plano Spark, gratuito).
2. **Build → Authentication → Get started** → ative **Google** e **E-mail/senha**.
3. **Build → Firestore Database → Create database** (modo produção) e, na aba **Regras**, cole:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. **Configurações do projeto → Seus apps → Web (</>)** → registre o app e copie o objeto `firebaseConfig` para `firebase-config.js`.
5. **Authentication → Settings → Authorized domains** → adicione o domínio da Vercel (ex.: `seu-app.vercel.app`). `localhost` já vem liberado.
6. Suba para o GitHub e faça o deploy na Vercel.

Cada usuário só lê e grava o próprio documento `users/{uid}` (missões, XP, ouro e nível).
