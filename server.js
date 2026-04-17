/* ============================================================
   CEBOLINHA — TROPA DO GOTI | Backend Proxy
   Node.js + Express · Twitch Helix API
   ============================================================ */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app  = express();
const PORT = process.env.PORT || 3001;

/* ---- CORS: libere apenas seu domínio em produção ---- */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origin ${origin} not allowed`));
    }
  }
}));
app.use(express.json());

/* ============================================================
   TOKEN MANAGER — renova automaticamente
   ============================================================ */
let cachedToken   = null;
let tokenExpireAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken;

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type:    'client_credentials',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get Twitch token: ${err}`);
  }

  const data     = await res.json();
  cachedToken    = data.access_token;
  // Renova 5 min antes de expirar
  tokenExpireAt  = Date.now() + (data.expires_in - 300) * 1000;

  console.log('🔑 Token Twitch renovado com sucesso');
  return cachedToken;
}

/* ============================================================
   HELPER — fetch autenticado para Twitch Helix
   ============================================================ */
async function twitchFetch(endpoint) {
  const token = await getAccessToken();
  const res   = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
    headers: {
      'Client-ID':     process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitch API ${res.status}: ${err}`);
  }

  return res.json();
}

/* ============================================================
   CACHE SIMPLES em memória (evita bater na API a cada reload)
   ============================================================ */
const cache = new Map();
const CACHE_TTL = {
  user:      5  * 60 * 1000, // 5 min
  stream:    60 * 1000,       // 1 min (dado mais volátil)
  followers: 5  * 60 * 1000,
  vods:      10 * 60 * 1000,
};

function cached(key, ttl, fn) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.exp) return Promise.resolve(entry.data);
  return fn().then(data => {
    cache.set(key, { data, exp: Date.now() + ttl });
    return data;
  });
}

/* ============================================================
   ROTAS
   ============================================================ */

// Health check
app.get('/', (_, res) => {
  res.json({ status: 'ok', service: 'cebolinha-backend', uptime: process.uptime() });
});

/* ---- GET /api/channel ---- */
/* Retorna: user, channel, stream status, followers */
app.get('/api/channel', async (req, res) => {
  try {
    const username = process.env.TWITCH_USERNAME;

    // Dados do usuário
    const userData = await cached(`user:${username}`, CACHE_TTL.user, () =>
      twitchFetch(`users?login=${username}`)
    );
    const user = userData.data?.[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const userId = user.id;

    // Status ao vivo
    const streamData = await cached(`stream:${userId}`, CACHE_TTL.stream, () =>
      twitchFetch(`streams?user_login=${username}`)
    );
    const stream = streamData.data?.[0] || null;

    // Seguidores
    let followersCount = 0;
    try {
      const followersData = await cached(`followers:${userId}`, CACHE_TTL.followers, () =>
        twitchFetch(`channels/followers?broadcaster_id=${userId}&first=1`)
      );
      followersCount = followersData.total || 0;
    } catch (_) {
      followersCount = user.view_count || 0;
    }

    res.json({
      user: {
        id:            user.id,
        login:         user.login,
        display_name:  user.display_name,
        profile_image: user.profile_image_url,
        view_count:    user.view_count,
        created_at:    user.created_at,
      },
      followers: followersCount,
      live: stream ? {
        isLive:      true,
        title:       stream.title,
        game:        stream.game_name,
        viewers:     stream.viewer_count,
        started_at:  stream.started_at,
        thumbnail:   stream.thumbnail_url,
      } : { isLive: false },
    });

  } catch (err) {
    console.error('GET /api/channel error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---- GET /api/vods?after=CURSOR ---- */
/* Retorna página de VODs paginados */
app.get('/api/vods', async (req, res) => {
  try {
    const username  = process.env.TWITCH_USERNAME;
    const afterCursor = req.query.after || null;

    // Precisa do userId
    const userData = await cached(`user:${username}`, CACHE_TTL.user, () =>
      twitchFetch(`users?login=${username}`)
    );
    const userId = userData.data?.[0]?.id;
    if (!userId) return res.status(404).json({ error: 'Usuário não encontrado' });

    let endpoint = `videos?user_id=${userId}&type=archive&first=100`;
    if (afterCursor) endpoint += `&after=${afterCursor}`;

    // VODs não são cacheados por cursor (muitos possíveis)
    const data = await twitchFetch(endpoint);

    res.json({
      vods:   data.data || [],
      cursor: data.pagination?.cursor || null,
    });

  } catch (err) {
    console.error('GET /api/vods error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---- GET /api/clips ---- */
/* Retorna top clips do canal */
app.get('/api/clips', async (req, res) => {
  try {
    const username = process.env.TWITCH_USERNAME;
    const first    = Math.min(parseInt(req.query.first) || 10, 20);

    const userData = await cached(`user:${username}`, CACHE_TTL.user, () =>
      twitchFetch(`users?login=${username}`)
    );
    const userId = userData.data?.[0]?.id;
    if (!userId) return res.status(404).json({ error: 'Usuário não encontrado' });

    const clipsData = await cached(`clips:${userId}:${first}`, CACHE_TTL.vods, () =>
      twitchFetch(`clips?broadcaster_id=${userId}&first=${first}`)
    );

    res.json({ clips: clipsData.data || [] });

  } catch (err) {
    console.error('GET /api/clips error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   START
   ============================================================ */
app.listen(PORT, () => {
  console.log(`\n🎮 CEBOLINHA Backend rodando em http://localhost:${PORT}`);
  console.log(`   Canal: ${process.env.TWITCH_USERNAME}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
