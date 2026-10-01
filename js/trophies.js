/* =========================================
   TROFEOS — ESTADÍSTICAS, 2VS2 Y CLIPS
   Las estadísticas se guardan en localStorage. Los clips se comparten con Supabase
   cuando está configurado, con copia local de respaldo en IndexedDB.
========================================= */
const TROPHY_STATS_KEY = "torneoLOL_trophy_stats_v1";
const CLIP_DB_NAME = "torneoLOL_trophy_clips_v1";
const CLIP_STORE_NAME = "clips";
let trophyStats = {};
let clipDatabase = null;
const clipObjectUrls = new Map();
const clipConfig = window.TORNEO_SUPABASE_CONFIG || {};
const clipBucket = clipConfig.bucket || "torneo-clips";
const clipSupabaseReady = Boolean(clipConfig.url && clipConfig.anonKey && window.supabase?.createClient);
const clipSupabase = clipSupabaseReady ? window.supabase.createClient(clipConfig.url, clipConfig.anonKey) : null;
let clipAdminSession = null;
let remoteClips = [];

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
    const localClips = await readClips();
    clipObjectUrls.forEach(url => URL.revokeObjectURL(url));
    clipObjectUrls.clear();
    const remoteIds = new Set(remoteClips.map(clip => clip.id));
    const clips = [
        ...remoteClips,
        ...localClips.filter(clip => !clip.cloudPath && !remoteIds.has(clip.id)).map(clip => ({ ...clip, local: true }))
    ];
    if (!clips.length) {
        target.innerHTML = '<p class="empty-state">Todavía no hay clips cargados.</p>';
        return;
    }
    target.innerHTML = clips.sort((a, b) => b.createdAt - a.createdAt).map(clip => {
        const url = clip.local ? URL.createObjectURL(clip.file) : clip.url;
        if (clip.local) clipObjectUrls.set(clip.id, url);
        const playerName = clip.playerName || getPlayerById(clip.playerId)?.name || "Sin jugador asignado";
        const deleteButton = clipAdminSession && clip.cloudPath ? `<button type="button" class="text-button" data-delete-clip="${escapeHTML(clip.cloudPath)}">Eliminar</button>` : clip.local && !clipSupabaseReady ? `<button type="button" class="text-button" data-delete-local-clip="${escapeHTML(clip.id)}">Eliminar</button>` : "";
        return `<article class="clip-card"><video controls preload="metadata" src="${escapeHTML(url)}"></video><div><strong>${escapeHTML(clip.title)}</strong><small>${escapeHTML(playerName)}</small></div>${deleteButton}</article>`;
    }).join("");
}

function setClipStatus(message) {
    const status = document.getElementById("clipCloudStatus");
    if (status) status.textContent = message;
}

function decodeClipPart(part) {
    try { return decodeURIComponent(part || ""); } catch { return part || ""; }
}

async function refreshSharedClips() {
    if (!clipSupabaseReady) {
        remoteClips = [];
        setClipStatus("Clips guardados en este navegador. La nube gratuita aún no está configurada.");
        document.getElementById("clipAdminToggle")?.setAttribute("hidden", "");
        document.getElementById("clipUploadControls")?.removeAttribute("hidden");
        await renderClips();
        return;
    }
    const { data, error } = await clipSupabase.storage.from(clipBucket).list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
        remoteClips = [];
        const toggle = document.getElementById("clipAdminToggle");
        if (toggle) { toggle.hidden = Boolean(clipAdminSession); toggle.textContent = "INGRESAR PARA SUBIR"; }
        const logout = document.getElementById("clipAdminLogout");
        if (logout) logout.hidden = !clipAdminSession;
        const upload = document.getElementById("clipUploadControls");
        if (upload) upload.hidden = !clipAdminSession;
        setClipStatus("No se pudieron cargar los clips compartidos. Revisa la configuración del almacenamiento.");
        await renderClips();
        return;
    }
    remoteClips = (data || []).filter(item => item.name && !item.name.startsWith("." )).map(item => {
        const [id, rawPlayer, ...rawTitle] = item.name.split("--");
        const title = decodeClipPart(rawTitle.join("--")) || item.name;
        const playerName = decodeClipPart(rawPlayer);
        const { data: publicData } = clipSupabase.storage.from(clipBucket).getPublicUrl(item.name);
        return { id, title, playerName, createdAt: Date.parse(item.created_at || item.updated_at || "") || Date.now(), cloudPath: item.name, url: publicData.publicUrl };
    });
    const toggle = document.getElementById("clipAdminToggle");
    const logout = document.getElementById("clipAdminLogout");
    const upload = document.getElementById("clipUploadControls");
    const loggedIn = Boolean(clipAdminSession);
    if (toggle) { toggle.hidden = loggedIn; toggle.textContent = "INGRESAR PARA SUBIR"; }
    if (logout) logout.hidden = !loggedIn;
    if (upload) upload.hidden = !loggedIn;
    setClipStatus(loggedIn ? "Clips compartidos activos. Puedes subir nuevos videos." : "Clips compartidos activos. Inicia sesión para subir videos.");
    await renderClips();
}

function makeClipPath(id, playerName, title) {
    return `${id}--${encodeURIComponent(playerName || "")}--${encodeURIComponent(title)}`;
}

async function syncLocalClipsToCloud() {
    const localClips = await readClips();
    let failed = 0;
    let tooLarge = 0;
    for (const clip of localClips.filter(item => !item.cloudPath)) {
        if (!clip.file) continue;
        if (clip.file.size > 50 * 1024 * 1024) { tooLarge += 1; continue; }
        const playerName = getPlayerById(clip.playerId)?.name || clip.playerName || "";
        const path = makeClipPath(clip.id, playerName, clip.title || clip.file.name);
        const { error } = await clipSupabase.storage.from(clipBucket).upload(path, clip.file, { contentType: clip.file.type || "video/mp4", cacheControl: "3600", upsert: false });
        if (!error || error.message?.toLowerCase().includes("already exists")) {
            await saveClip({ ...clip, cloudPath: path, playerName });
        } else failed += 1;
    }
    await refreshSharedClips();
    if (tooLarge || failed) setClipStatus(`Sincronización parcial: ${tooLarge} clip(s) superan 50 MB y ${failed} no se pudieron copiar. Los originales siguen guardados en este navegador.`);
}

async function uploadClips(files) {
    const select = document.getElementById("clipPlayerSelect");
    const playerId = select?.value || null;
    const playerName = getPlayerById(playerId)?.name || "";
    for (const file of files) {
        if (!file.type.startsWith("video/")) continue;
        if (clipSupabaseReady) {
            if (!clipAdminSession) { setClipStatus("Inicia sesión para subir clips compartidos."); continue; }
            if (file.size > 50 * 1024 * 1024) { setClipStatus(`${file.name} supera el límite gratuito de 50 MB.`); continue; }
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const path = makeClipPath(id, playerName, file.name);
            setClipStatus(`Subiendo ${file.name}…`);
            const { error } = await clipSupabase.storage.from(clipBucket).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
            if (error) { setClipStatus(`No se pudo subir ${file.name}: ${error.message}`); continue; }
        } else {
            await saveClip({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: file.name, playerId, playerName, file, createdAt: Date.now() });
        }
    }
    await refreshSharedClips();
}

document.getElementById("saveTrophyStatsButton")?.addEventListener("click", saveTrophyStats);
document.getElementById("resetTrophyStatsButton")?.addEventListener("click", resetTrophyStats);
document.getElementById("clipInput")?.addEventListener("change", async event => {
    await uploadClips([...event.target.files]);
    event.target.value = "";
});
document.getElementById("clipList")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-clip]");
    if (button && clipAdminSession) {
        const { error } = await clipSupabase.storage.from(clipBucket).remove([button.dataset.deleteClip]);
        if (error) setClipStatus(`No se pudo eliminar el clip: ${error.message}`);
        await refreshSharedClips();
        return;
    }
    const localButton = event.target.closest("[data-delete-local-clip]");
    if (localButton) { await deleteClip(localButton.dataset.deleteLocalClip); renderClips(); }
});
document.getElementById("clipAdminToggle")?.addEventListener("click", () => { document.getElementById("clipAdminLogin").hidden = false; });
document.getElementById("clipAdminLogin")?.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("clipAdminMessage");
    const email = document.getElementById("clipAdminEmail").value.trim();
    const password = document.getElementById("clipAdminPassword").value;
    const { data, error } = await clipSupabase.auth.signInWithPassword({ email, password });
    if (error) { message.textContent = "No se pudo iniciar sesión. Revisa el correo y la contraseña."; return; }
    clipAdminSession = data.session;
    document.getElementById("clipAdminPassword").value = "";
    document.getElementById("clipAdminLogin").hidden = true;
    await syncLocalClipsToCloud();
});
document.getElementById("clipAdminLogout")?.addEventListener("click", async () => {
    await clipSupabase.auth.signOut();
    clipAdminSession = null;
    await refreshSharedClips();
});
document.addEventListener("DOMContentLoaded", async () => {
    trophyStats = readTrophyStats();
    renderTrophies();
    if (clipSupabaseReady) {
        const { data } = await clipSupabase.auth.getSession();
        clipAdminSession = data.session;
    }
    await refreshSharedClips();
});
document.addEventListener("players:changed", renderTrophies);
document.addEventListener("tournament:changed", event => {
    if (["bracket", "result", "reset"].includes(event.detail.reason)) renderTrophies();
});
