/* =========================================
   TROFEOS — ESTADÍSTICAS, 2VS2 Y CLIPS
   Las estadísticas se guardan en localStorage y los clips en IndexedDB del navegador.
========================================= */
const TROPHY_STATS_KEY = "torneoLOL_trophy_stats_v1";
const CLIP_DB_NAME = "torneoLOL_trophy_clips_v1";
const CLIP_STORE_NAME = "clips";
let trophyStats = {};
let clipDatabase = null;
const clipObjectUrls = new Map();

function readTrophyStats() {
    try {
        const saved = JSON.parse(localStorage.getItem(TROPHY_STATS_KEY) || "{}");
        return saved && typeof saved === "object" ? saved : {};
    } catch { return {}; }
}

function normalizedTrophyStats() {
    const roster = getPlayers();
    return Object.fromEntries(roster.map(player => {
        const source = trophyStats[player.id] || {};
        return [player.id, {
            minions: Math.max(0, Number.parseInt(source.minions, 10) || 0),
            kills: Math.max(0, Number.parseInt(source.kills, 10) || 0),
            turrets: Math.max(0, Number.parseInt(source.turrets, 10) || 0)
        }];
    }));
}

function saveTrophyStats() {
    const next = {};
    document.querySelectorAll("[data-trophy-player]").forEach(row => {
        const id = row.dataset.trophyPlayer;
        next[id] = {};
        ["minions", "kills", "turrets"].forEach(metric => {
            next[id][metric] = Math.max(0, Number.parseInt(row.querySelector(`[data-trophy-metric=\"${metric}\"]`)?.value, 10) || 0);
        });
    });
    trophyStats = next;
    localStorage.setItem(TROPHY_STATS_KEY, JSON.stringify(trophyStats));
    announce("Estadísticas de trofeos guardadas.");
    renderTrophies();
}

function resetTrophyStats() {
    if (!confirm("¿Reiniciar las estadísticas? Los minions, kills y torretas volverán a cero.")) return;
    trophyStats = Object.fromEntries(getPlayers().map(player => [player.id, { minions: 0, kills: 0, turrets: 0 }]));
    localStorage.setItem(TROPHY_STATS_KEY, JSON.stringify(trophyStats));
    renderTrophies();
    announce("Estadísticas reiniciadas.");
}

function rankingMarkup(metric, label) {
    const rows = getPlayers().map(player => ({ player, value: trophyStats[player.id]?.[metric] || 0 }))
        .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name));
    return `<article class="trophy-ranking-card"><span class="eyebrow">${label}</span><ol>${rows.length ? rows.map((row, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHTML(row.player.name)}</span><strong>${row.value}</strong></li>`).join("") : '<li class="empty-state">Registra jugadores primero.</li>'}</ol></article>`;
}

function module3TeamName(module, teamId) {
    const team = module?.teams?.find(item => item.id === teamId);
    return team?.playerIds.map(id => getPlayerById(id)?.name).filter(Boolean).join(" / ") || "A CONFIRMAR";
}

function renderTeamStandings() {
    const target = document.getElementById("teamStandingBody");
    if (!target) return;
    const module = getTournamentState()?.modules?.["module-3"];
    if (!module?.created) {
        target.innerHTML = '<p class="empty-state">Prepara los equipos del módulo 3 para ver sus posiciones.</p>';
        return;
    }
    const loserOf = match => match?.winnerId && match.teamIds?.every(Boolean) ? match.teamIds.find(id => id !== match.winnerId) : null;
    const final = module.matches.find(match => match.id.endsWith("-final-1"));
    const revenge = module.matches.find(match => match.id.endsWith("-revanch-1"));
    const hellFinal = module.loserMatches.find(match => match.id.endsWith("-loser-2"));
    const order = [revenge?.winnerId, loserOf(revenge), loserOf(final), loserOf(hellFinal)];
    const labels = ["CAMPEÓN 2 VS 2", "FINALISTA", "PERDEDOR DE LA FINAL PRINCIPAL", "PERDEDOR DEL INFIERNO"];
    target.innerHTML = order.map((teamId, index) => `<div class="team-standing-row"><span>${index + 1}º</span><strong>${escapeHTML(module3TeamName(module, teamId))}</strong><small>${labels[index]}</small></div>`).join("");
}

function renderTrophies() {
    trophyStats = normalizedTrophyStats();
    const rankings = document.getElementById("trophyRankings");
    const body = document.getElementById("trophyStatsBody");
    if (!rankings || !body) return;
    rankings.innerHTML = rankingMarkup("minions", "MÁS MINIONS") + rankingMarkup("kills", "MÁS KILLS") + rankingMarkup("turrets", "MÁS TORRETAS");
    body.innerHTML = getPlayers().length ? getPlayers().map(player => {
        const stats = trophyStats[player.id] || { minions: 0, kills: 0, turrets: 0 };
        const banner = getPlayerBanner(player);
        return `<tr data-trophy-player="${escapeHTML(player.id)}"><th scope="row"><span class="trophy-player-cell">${banner ? `<img src="${banner.image}" alt="" loading="lazy">` : '<i>⚔</i>'}<span>${escapeHTML(player.name)}</span></span></th><td><input type="number" min="0" step="1" data-trophy-metric="minions" value="${stats.minions}"></td><td><input type="number" min="0" step="1" data-trophy-metric="kills" value="${stats.kills}"></td><td><input type="number" min="0" step="1" data-trophy-metric="turrets" value="${stats.turrets}"></td></tr>`;
    }).join("") : '<tr><td colspan="4" class="empty-state">Registra jugadores para comenzar.</td></tr>';
    const playerSelect = document.getElementById("clipPlayerSelect");
    if (playerSelect) playerSelect.innerHTML = '<option value="">Sin jugador asignado</option>' + getPlayers().map(player => `<option value="${escapeHTML(player.id)}">${escapeHTML(player.name)}</option>`).join("");
    renderTeamStandings();
    renderClips();
}

function openClipDatabase() {
    if (clipDatabase) return Promise.resolve(clipDatabase);
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise(resolve => {
        const request = indexedDB.open(CLIP_DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(CLIP_STORE_NAME, { keyPath: "id" });
        request.onsuccess = () => { clipDatabase = request.result; resolve(clipDatabase); };
        request.onerror = () => resolve(null);
    });
}

function readClips() {
    return openClipDatabase().then(db => new Promise(resolve => {
        if (!db) return resolve([]);
        const request = db.transaction(CLIP_STORE_NAME, "readonly").objectStore(CLIP_STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    }));
}

function saveClip(clip) {
    return openClipDatabase().then(db => new Promise(resolve => {
        if (!db) return resolve(false);
        const request = db.transaction(CLIP_STORE_NAME, "readwrite").objectStore(CLIP_STORE_NAME).put(clip);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
    }));
}

function deleteClip(id) {
    return openClipDatabase().then(db => new Promise(resolve => {
        if (!db) return resolve(false);
        const request = db.transaction(CLIP_STORE_NAME, "readwrite").objectStore(CLIP_STORE_NAME).delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
    }));
}

async function renderClips() {
    const target = document.getElementById("clipList");
    if (!target) return;
    const clips = await readClips();
    clipObjectUrls.forEach(url => URL.revokeObjectURL(url));
    clipObjectUrls.clear();
    if (!clips.length) {
        target.innerHTML = '<p class="empty-state">Todavía no hay clips cargados.</p>';
        return;
    }
    target.innerHTML = clips.sort((a, b) => b.createdAt - a.createdAt).map(clip => {
        const url = URL.createObjectURL(clip.file);
        clipObjectUrls.set(clip.id, url);
        const player = getPlayerById(clip.playerId);
        return `<article class="clip-card"><video controls preload="metadata" src="${url}"></video><div><strong>${escapeHTML(clip.title)}</strong><small>${escapeHTML(player?.name || "Sin jugador asignado")}</small></div><button type="button" class="text-button" data-delete-clip="${escapeHTML(clip.id)}">Eliminar</button></article>`;
    }).join("");
}

document.getElementById("saveTrophyStatsButton")?.addEventListener("click", saveTrophyStats);
document.getElementById("resetTrophyStatsButton")?.addEventListener("click", resetTrophyStats);
document.getElementById("clipInput")?.addEventListener("change", async event => {
    const playerId = document.getElementById("clipPlayerSelect")?.value || null;
    for (const file of [...event.target.files]) {
        await saveClip({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: file.name, playerId, file, createdAt: Date.now() });
    }
    event.target.value = "";
    renderClips();
});
document.getElementById("clipList")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-clip]");
    if (!button) return;
    await deleteClip(button.dataset.deleteClip);
    renderClips();
});
document.addEventListener("DOMContentLoaded", () => { trophyStats = readTrophyStats(); renderTrophies(); });
document.addEventListener("players:changed", renderTrophies);
document.addEventListener("tournament:changed", event => {
    if (["bracket", "result", "reset"].includes(event.detail.reason)) renderTrophies();
});
