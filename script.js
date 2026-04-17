/* ============================================================
   CEBOLINHA — TROPA DO GOTI | script.js
   Dados via backend proxy (não expõe credenciais)
   ============================================================ */

/* ============================================================
   CONFIGURAÇÃO DO BACKEND
   Troque pela URL do seu backend após o deploy
   ============================================================ */
const BACKEND_URL = 'http://localhost:3001'; // Ex: https://cebolinha.up.railway.app

// Data de início da contagem (início de Abril 2025)
const START_DATE = new Date('2025-04-01T00:00:00Z');

/* ============================================================
   NOMES DOS MESES EM PORTUGUÊS
   ============================================================ */
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let easterClickCount  = 0;
let calCurrentYear    = 2025;
let calCurrentMonth   = 3; // 0-indexed → Abril
let isDarkMode        = true;
let livesMap          = {};

/* ============================================================
   LOADING SCREEN
   ============================================================ */
window.addEventListener("load", () => {
  const screen = document.getElementById("loading-screen");
  setTimeout(() => {
    screen.classList.add("hidden");
    document.body.style.overflow = "";
  }, 1600);
});
document.body.style.overflow = "hidden";

/* ============================================================
   CURSOR CUSTOMIZADO
   ============================================================ */
const cursor      = document.getElementById("cursor");
const cursorTrail = document.getElementById("cursor-trail");
let trailX = 0, trailY = 0, mouseX = 0, mouseY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = mouseX + "px";
  cursor.style.top  = mouseY + "px";
});
function animateTrail() {
  trailX += (mouseX - trailX) * 0.14;
  trailY += (mouseY - trailY) * 0.14;
  cursorTrail.style.left = trailX + "px";
  cursorTrail.style.top  = trailY + "px";
  requestAnimationFrame(animateTrail);
}
animateTrail();

/* ============================================================
   NAVBAR — scroll + mobile
   ============================================================ */
const navbar    = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navMobile = document.getElementById("nav-mobile");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
});
hamburger.addEventListener("click", () => navMobile.classList.toggle("open"));
navMobile.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => navMobile.classList.remove("open"));
});

/* ============================================================
   PARTÍCULAS NO HERO
   ============================================================ */
function createParticles() {
  const container = document.getElementById("particles-container");
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left   = Math.random() * 100 + "%";
    p.style.bottom = "-5px";
    p.style.width  = (Math.random() * 3 + 1) + "px";
    p.style.height = p.style.width;
    p.style.opacity = Math.random() * 0.6 + 0.1;
    p.style.animationDuration = (Math.random() * 8 + 6) + "s";
    p.style.animationDelay    = (Math.random() * 10) + "s";
    if (Math.random() > 0.7) {
      p.style.background = "#9b30ff";
      p.style.boxShadow  = "0 0 4px #9b30ff";
    } else {
      p.style.boxShadow = "0 0 4px var(--neon)";
    }
    container.appendChild(p);
  }
}
createParticles();

/* ============================================================
   EASTER EGG — 5 cliques no avatar
   ============================================================ */
const avatarEaster  = document.getElementById("avatar-easter");
const easterOverlay = document.getElementById("easter-egg-overlay");

avatarEaster.addEventListener("click", () => {
  easterClickCount++;
  avatarEaster.style.transform = "scale(1.05)";
  setTimeout(() => avatarEaster.style.transform = "", 150);
  if (easterClickCount >= 5) {
    easterOverlay.classList.remove("hidden");
    easterClickCount = 0;
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => easterOverlay.classList.add("hidden"), 3500);
  }
});
easterOverlay.addEventListener("click", () => {
  easterOverlay.classList.add("hidden");
  easterClickCount = 0;
});

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add("visible");
        const counter = entry.target.querySelector(".stat-value[data-target]");
        if (counter) animateCounter(counter);
      }, parseInt(delay));
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
function animateCounter(el) {
  if (el.dataset.display) return;
  const target   = parseInt(el.dataset.target);
  const suffix   = el.dataset.suffix || "";
  const duration = 1400;
  const start    = performance.now();
  function update(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ============================================================
   BACKEND API — CARREGAR DADOS DO CANAL
   ============================================================ */
async function loadChannelData() {
  try {
    // Busca dados do canal no backend
    const res = await fetch(`${BACKEND_URL}/api/channel`);
    if (!res.ok) throw new Error(`Backend error: ${res.status}`);
    const channel = await res.json();

    // Foto de perfil
    if (channel.user?.profile_image) {
      document.querySelectorAll('#nav-avatar-img, #tropa-avatar-img').forEach(img => {
        img.src = channel.user.profile_image;
      });
    }

    // Status ao vivo
    setLiveStatus(channel.live?.isLive, channel.live?.viewers);

    // Carrega VODs e calcula stats
    const vods = await loadVODs();
    const stats = calculateStats(vods, channel.followers, channel.user?.view_count);

    renderStats(stats);
    renderCalendar(calCurrentYear, calCurrentMonth);

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    showStatsError();
    showCalError();
  }
}

/* ============================================================
   BACKEND API — CARREGAR VODS (paginate até START_DATE)
   ============================================================ */
async function loadVODs() {
  let allVods   = [];
  let cursor    = null;
  let keepGoing = true;

  while (keepGoing) {
    const url = cursor
      ? `${BACKEND_URL}/api/vods?after=${cursor}`
      : `${BACKEND_URL}/api/vods`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error(`VODs error: ${res.status}`);
    const data = await res.json();
    const vods = data.vods || [];

    for (const vod of vods) {
      const vodDate = new Date(vod.created_at);
      if (vodDate < START_DATE) {
        keepGoing = false;
        break;
      }
      allVods.push(vod);
    }

    if (!data.cursor || vods.length === 0) {
      keepGoing = false;
    } else {
      cursor = data.cursor;
    }
  }

  return allVods;
}

/* ============================================================
   CALCULAR STATS A PARTIR DOS VODS
   ============================================================ */
function parseDuration(durationStr) {
  const hours   = (durationStr.match(/(\d+)h/) || [0, 0])[1];
  const minutes = (durationStr.match(/(\d+)m/) || [0, 0])[1];
  const seconds = (durationStr.match(/(\d+)s/) || [0, 0])[1];
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

function calculateStats(vods, followersCount, viewCount) {
  livesMap = {};
  let totalSeconds = 0;

  vods.forEach(vod => {
    const date    = new Date(vod.created_at);
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
    const secs    = parseDuration(vod.duration || '0s');
    const hours   = secs / 3600;

    totalSeconds += secs;

    if (livesMap[dateStr]) {
      livesMap[dateStr].totalSecs += secs;
      livesMap[dateStr].longa = livesMap[dateStr].totalSecs / 3600 >= 4;
    } else {
      livesMap[dateStr] = {
        data:      dateStr,
        totalSecs: secs,
        duracao:   formatDuration(secs),
        jogo:      vod.game_name || vod.title || 'Sem título',
        longa:     hours >= 4,
        title:     vod.title || '',
        url:       vod.url || '#',
      };
    }
  });

  Object.values(livesMap).forEach(live => {
    live.duracao = formatDuration(live.totalSecs);
    live.longa   = live.totalSecs / 3600 >= 4;
  });

  const streakResult = calcStreak(livesMap);

  return {
    followers:  followersCount,
    views:      viewCount || 0,
    totalLives: vods.length,
    totalHours: Math.round(totalSeconds / 3600),
    streak:     streakResult.current,
    maxStreak:  streakResult.max,
  };
}

function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${m}m`;
}

function calcStreak(livesMap) {
  const dates = Object.keys(livesMap).sort();
  if (dates.length === 0) return { current: 0, max: 0 };

  let current = 1, max = 1, prev = new Date(dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
    prev = curr;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let currentStreak = 0;
  let checkDate = new Date(today);

  while (true) {
    const ds = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth()+1).padStart(2,'0')}-${String(checkDate.getUTCDate()).padStart(2,'0')}`;
    if (livesMap[ds]) {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { current: currentStreak, max };
}

/* ============================================================
   RENDERIZAR STATS
   ============================================================ */
function renderStats(stats) {
  document.getElementById('stats-loading').style.display = 'none';
  document.getElementById('stats-grid').style.display    = 'grid';
  document.getElementById('stats-note').style.display    = 'block';

  function setCard(idVal, value, suffix, barPct) {
    const el = document.getElementById(idVal);
    if (!el) return;
    el.setAttribute('data-target', value);
    el.setAttribute('data-suffix', suffix || '');
    el.textContent = '0';
    const bar = document.getElementById(idVal.replace('stat-','bar-'));
    if (bar) {
      bar.dataset.targetWidth = barPct + '%';
      bar.style.width = '0%';
    }
  }

  setCard('stat-followers', stats.followers, '',  100);
  setCard('stat-views',     stats.views,     '',  Math.min(Math.round(stats.views / 10000), 100));
  setCard('stat-vods',      stats.totalLives,'',  Math.min(stats.totalLives * 3, 100));
  setCard('stat-hours',     stats.totalHours,'h', Math.min(stats.totalHours, 100));
  setCard('stat-streak',    stats.streak,    '',  Math.min(stats.streak * 3, 100));
  setCard('stat-maxstreak', stats.maxStreak, '',  100);

  document.querySelectorAll('#stats-grid .stat-card').forEach(card => {
    revealObserver.observe(card);
    barObserver.observe(card);
  });
}

function showStatsError() {
  document.getElementById('stats-loading').style.display = 'none';
  document.getElementById('stats-error').classList.remove('hidden');
}
function showCalError() {
  document.getElementById('cal-loading').style.display = 'none';
}

/* ============================================================
   CALENDÁRIO DE LIVES
   ============================================================ */
function renderCalendar(year, month) {
  document.getElementById('cal-loading').style.display = 'none';
  const wrap = document.getElementById('cal-wrap');
  wrap.style.display = 'block';
  if (!wrap.classList.contains('visible')) wrap.classList.add('visible');

  const grid  = document.getElementById("calendar-grid");
  const title = document.getElementById("cal-title");

  title.textContent = MESES_PT[month] + " " + year;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  grid.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEl   = document.createElement("div");
    const live    = livesMap[dateStr];

    dayEl.className  = "cal-day";
    dayEl.textContent = d;

    if (live) {
      dayEl.classList.add(live.longa ? "long-day" : "live-day");
      dayEl.addEventListener("mouseenter", (e) => showTooltip(e, live, dateStr));
      dayEl.addEventListener("mousemove",  (e) => moveTooltip(e));
      dayEl.addEventListener("mouseleave",      hideTooltip);
    }
    if (dateStr === todayStr) dayEl.classList.add("today");

    grid.appendChild(dayEl);
  }
}

document.getElementById("cal-prev").addEventListener("click", () => {
  calCurrentMonth--;
  if (calCurrentMonth < 0) { calCurrentMonth = 11; calCurrentYear--; }
  renderCalendar(calCurrentYear, calCurrentMonth);
});
document.getElementById("cal-next").addEventListener("click", () => {
  calCurrentMonth++;
  if (calCurrentMonth > 11) { calCurrentMonth = 0; calCurrentYear++; }
  renderCalendar(calCurrentYear, calCurrentMonth);
});

/* ============================================================
   TOOLTIP DO CALENDÁRIO
   ============================================================ */
const tooltip = document.getElementById("cal-tooltip");

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function showTooltip(e, live, dateStr) {
  tooltip.innerHTML = `
    <strong>${formatDate(dateStr)}</strong> · ${live.duracao}
    <br><span style="color:var(--neon)">🎮 ${live.jogo}</span>
    ${live.longa ? '<br><span style="color:#f0c040">⭐ Live longa</span>' : ''}
    ${live.url && live.url !== '#' ? `<br><a href="${live.url}" target="_blank" style="color:var(--purple2);font-size:.75rem">▶ Assistir VOD</a>` : ''}
  `;
  tooltip.classList.remove("hidden");
  moveTooltip(e);
}
function moveTooltip(e) {
  tooltip.style.left = (e.clientX + 14) + "px";
  tooltip.style.top  = (e.clientY + 14) + "px";
}
function hideTooltip() { tooltip.classList.add("hidden"); }

/* ============================================================
   STATUS AO VIVO
   ============================================================ */
function setLiveStatus(live, viewers) {
  const badge  = document.getElementById("live-badge");
  const text   = document.getElementById("live-text");
  const navDot = document.getElementById("nav-live-indicator");

  if (live) {
    badge.classList.add("is-live");
    text.textContent = viewers
      ? `🔴 AO VIVO · ${viewers.toLocaleString('pt-BR')} espectadores`
      : '🔴 AO VIVO';
    if (navDot) navDot.classList.remove("hidden");
  } else {
    badge.classList.remove("is-live");
    text.textContent = "⚫ OFFLINE";
    if (navDot) navDot.classList.add("hidden");
  }
}

/* ============================================================
   GALERIA — LIGHTBOX
   ============================================================ */
const lightbox      = document.getElementById("lightbox");
const lightboxImg   = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");

document.querySelectorAll(".galeria-item").forEach(item => {
  item.addEventListener("click", () => {
    lightboxImg.src = item.dataset.src || item.querySelector("img").src;
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
});
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
function closeLightbox() {
  lightbox.classList.add("hidden");
  document.body.style.overflow = "";
}

/* ============================================================
   TEMA CLARO / ESCURO
   ============================================================ */
const themeToggle = document.getElementById("theme-toggle");
const themeIcon   = document.getElementById("theme-icon");

themeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("light-mode", !isDarkMode);
  document.body.classList.toggle("dark-mode",  isDarkMode);
  themeIcon.className = isDarkMode ? "fas fa-sun" : "fas fa-moon";
});

/* ============================================================
   FOOTER — ANO ATUAL
   ============================================================ */
document.getElementById("footer-year").textContent = new Date().getFullYear();

/* ============================================================
   SCROLL SUAVE
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

/* ============================================================
   GLITCH no nome do hero (hover)
   ============================================================ */
const heroName = document.getElementById("hero-name");
if (heroName) {
  heroName.addEventListener("mouseenter", () => {
    heroName.style.animation = "glitch1 0.4s steps(1) forwards";
  });
  heroName.addEventListener("mouseleave", () => {
    heroName.style.animation = "";
  });
}

/* ============================================================
   ANIMAÇÃO DE BARRAS de stat
   ============================================================ */
document.querySelectorAll(".stat-bar-fill").forEach(bar => {
  const targetWidth = bar.style.width;
  bar.style.width = "0";
  bar.dataset.targetWidth = targetWidth;
});

const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const bars = entry.target.querySelectorAll(".stat-bar-fill");
      bars.forEach(bar => {
        setTimeout(() => { bar.style.width = bar.dataset.targetWidth; }, 300);
      });
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll(".stat-card").forEach(card => barObserver.observe(card));

/* ============================================================
   RETRY STATS
   ============================================================ */
const retryBtn = document.getElementById('stats-retry');
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    document.getElementById('stats-error').classList.add('hidden');
    document.getElementById('stats-loading').style.display = 'flex';
    loadChannelData();
  });
}

/* ============================================================
   TOQUE MOBILE
   ============================================================ */
window.addEventListener("touchstart", () => {
  cursor.style.display      = "none";
  cursorTrail.style.display = "none";
}, { once: true });

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
loadChannelData();

/* ============================================================
   LOG DE BOAS-VINDAS no console (easter egg dev)
   ============================================================ */
console.log(
  "%c🎮 CEBOLINHA — TROPA DO GOTI\n%cSite feito com amor pela comunidade 💚\nhttps://www.twitch.tv/cebolinhofc_",
  "color:#39ff14;font-size:1.2rem;font-weight:bold;",
  "color:#aaa;font-size:.9rem;"
);
