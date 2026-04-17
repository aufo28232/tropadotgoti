# 🎮 Cebolinha Backend — Twitch API Proxy

Backend seguro para o site da **Tropa do Goti**. Mantém as credenciais da Twitch no servidor — nunca expostas no navegador.

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos
- Node.js 18+
- Conta em [dev.twitch.tv](https://dev.twitch.tv/console/apps)

### 2. Pegue seu Client Secret
1. Acesse [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Clique na sua aplicação (ou crie uma nova)
3. Copie o **Client ID** e gere um **Client Secret**

### 3. Configure o .env
```bash
cp .env.example .env
```
Edite o `.env` e preencha:
```
TWITCH_CLIENT_ID=seu_client_id
TWITCH_CLIENT_SECRET=seu_client_secret
TWITCH_USERNAME=cebolinhofc_
```

### 4. Instale e rode
```bash
npm install
npm run dev    # desenvolvimento (com auto-reload)
npm start      # produção
```

O servidor sobe em `http://localhost:3001`

---

## 📡 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Health check |
| GET | `/api/channel` | Dados do canal (user, followers, live status) |
| GET | `/api/vods?after=CURSOR` | VODs paginados |
| GET | `/api/clips?first=10` | Top clips |

### Exemplo de resposta `/api/channel`
```json
{
  "user": {
    "id": "123456",
    "login": "cebolinhofc_",
    "display_name": "cebolinhofc_",
    "profile_image": "https://...",
    "view_count": 50000
  },
  "followers": 1234,
  "live": {
    "isLive": true,
    "title": "FREE FIRE COM A TROPA",
    "game": "Free Fire",
    "viewers": 42
  }
}
```

---

## ☁️ Deploy no Railway (recomendado — grátis)

1. Crie conta em [railway.app](https://railway.app)
2. Clique em **New Project → Deploy from GitHub repo**
3. Suba este código em um repositório privado no GitHub
4. No painel do Railway, vá em **Variables** e adicione:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `TWITCH_USERNAME` = `cebolinhofc_`
   - `ALLOWED_ORIGINS` = `https://seusite.com`
5. O Railway gera uma URL tipo `https://cebolinha-backend.up.railway.app`
6. Use essa URL no frontend

---

## ☁️ Deploy no Render (alternativa gratuita)

1. Crie conta em [render.com](https://render.com)
2. **New → Web Service → Connect GitHub**
3. Selecione o repo, configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Adicione as variáveis de ambiente no painel
5. Copie a URL gerada para usar no frontend

---

## 🔧 Atualizar o frontend (script.js)

Substitua o bloco `TWITCH_CONFIG` no `script.js` pela URL do backend:

```js
const BACKEND_URL = 'https://sua-url.railway.app'; // ou localhost:3001

async function loadChannelData() {
  const [channelRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/channel`)
  ]);
  const channel = await channelRes.json();
  // use channel.user, channel.followers, channel.live
}
```

> ⚠️ Nunca mais coloque CLIENT_ID ou ACCESS_TOKEN no frontend!

---

## 🛡️ Segurança

- Credenciais ficam **apenas no servidor**
- Token renovado automaticamente antes de expirar
- Cache em memória reduz chamadas à API (respeita rate limits da Twitch)
- CORS configurável por domínio

---

Feito com 💚 para a Tropa do Goti
