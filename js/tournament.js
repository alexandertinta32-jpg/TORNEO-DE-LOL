/* =========================================
   CONFIGURACIÓN Y ESTADO COMPARTIDO
   Los jugadores siguen viviendo en players.js / torneoLOL_players.
========================================= */
const TOURNAMENT_STORAGE_KEY = "torneoLOL_tournament_v1";
const TOURNAMENT_CONFIG = Object.freeze({
    pointsWin: 3,
    pointsLoss: 0,
    pointsLoserWin: 1,
    version: 1
});
const TOURNAMENT_MODULES = Object.freeze([
    { id: "module-1", label: "MÓDULO 1", title: "PRIMER 1VS1", enabled: true },
    { id: "module-2", label: "MÓDULO 2", title: "SEGUNDO 1VS1", enabled: true },
    { id: "module-3", label: "MÓDULO 3", title: "TERCER 1VS1", enabled: true },
    { id: "extra", label: "EXTRA", title: "MÓDULO EXTRA", enabled: false }
]);

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function announce(message, error = false) {
    const notice = document.getElementById("appNotice");
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle("is-error", error);
    notice.hidden = false;
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => { notice.hidden = true; }, error ? 12000 : 4500);
}

function writeStoredJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        announce("No se pudo guardar en este navegador. Mantén la página abierta para no perder los cambios.", true);
        return false;
    }
}

function randomIndex(length) {
    // Rechazo del sobrante para no favorecer a ningún participante.
    if (!Number.isInteger(length) || length < 1) throw new Error("La lista está vacía.");
    const range = 2 ** 32;
    const limit = range - range % length;
    const buffer = new Uint32Array(1);
    do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
    return buffer[0] % length;
}

let tournamentState = null;

function createTournamentState() {
    return {
        version: TOURNAMENT_CONFIG.version,
        participantIds: getPlayers().map(player => player.id),
        currentModule: TOURNAMENT_MODULES[0].id,
        modules: Object.fromEntries(TOURNAMENT_MODULES.map(module => [module.id, { matches: [], loserMatches: [], created: false }])),
        roulette: { selectedIds: [], lastId: null, rotation: 0 },
        randomizer: { mode: "single", playerIds: [null, null], champions: [] }
    };
}

/* Normalizar al cargar y al cambiar participantes. No acumular estadísticas:
   clasificación y progreso se derivan siempre de los resultados vigentes. */
function normalizeTournamentState(saved) {
    const next = createTournamentState();
    const ids = new Set(next.participantIds);
    if (!saved || typeof saved !== "object" || saved.version !== TOURNAMENT_CONFIG.version) return next;
    if (TOURNAMENT_MODULES.some(module => module.id === saved.currentModule)) next.currentModule = saved.currentModule;
    for (const definition of TOURNAMENT_MODULES) {
        if (!definition.enabled) continue;
        const source = saved.modules?.[definition.id];
        if (!source || !Array.isArray(source.matches)) continue;
        const used = new Set();
        next.modules[definition.id].created = source.created === true;
        const matchLimit = definition.enabled ? 8 : MAX_PLAYERS / 2;
        next.modules[definition.id].matches = source.matches.slice(0, matchLimit).map((match, index) => {
            const playerIds = [0, 1].map(slot => {
                const id = match?.playerIds?.[slot];
                if (match?.derived === true) return ids.has(id) ? id : null;
                if (!ids.has(id) || used.has(id)) return null;
                used.add(id);
                return id;
            });
            const winnerId = playerIds.every(Boolean) && playerIds.includes(match?.winnerId) ? match.winnerId : null;
            return { id: match?.id || `${definition.id}-match-${index + 1}`, playerIds, winnerId, derived: match?.derived === true };
        });
        // Al agregar jugadores se habilitan espacios nuevos sin alterar cruces resueltos.
        const module = next.modules[definition.id];
        if (module.created) {
            while (module.matches.length < Math.ceil(ids.size / 2)) {
                module.matches.push({ id: `${definition.id}-match-${module.matches.length + 1}`, playerIds: [null, null], winnerId: null, derived: false });
            }
            if (definition.enabled) {
                const requiredDerived = ["semi-1", "semi-2", "third-1", "final-1"];
                requiredDerived.forEach(suffix => {
                    if (!module.matches.some(match => match.id === `${definition.id}-${suffix}`)) {
                        module.matches.push({ id: `${definition.id}-${suffix}`, playerIds: [null, null], winnerId: null, derived: true });
                    }
                });
                const loserSource = Array.isArray(source.loserMatches) ? source.loserMatches : [];
                module.loserMatches = loserSource.slice(0, 3).map((match, index) => ({
                    id: match?.id || `${definition.id}-loser-${index + 1}`,
                    playerIds: [0, 1].map(slot => ids.has(match?.playerIds?.[slot]) ? match.playerIds[slot] : null),
                    winnerId: ids.has(match?.winnerId) ? match.winnerId : null,
                    derived: true
                }));
                while (module.loserMatches.length < 3) {
                    module.loserMatches.push({ id: `${definition.id}-loser-${module.loserMatches.length + 1}`, playerIds: [null, null], winnerId: null, derived: true });
                }
            }
        }
    }
    const selected = Array.isArray(saved.roulette?.selectedIds) ? saved.roulette.selectedIds : [];
    next.roulette.selectedIds = [...new Set(selected.filter(id => ids.has(id)))].slice(0, MAX_PLAYERS);
    next.roulette.lastId = ids.has(saved.roulette?.lastId) ? saved.roulette.lastId : null;
    next.roulette.rotation = Number.isFinite(saved.roulette?.rotation) ? saved.roulette.rotation % 360 : 0;
    if (saved.randomizer?.mode === "duel") next.randomizer.mode = "duel";
    next.randomizer.playerIds = [0, 1].map(slot => ids.has(saved.randomizer?.playerIds?.[slot]) ? saved.randomizer.playerIds[slot] : null);
    if (next.randomizer.playerIds[0] === next.randomizer.playerIds[1]) next.randomizer.playerIds[1] = null;
    next.randomizer.champions = Array.isArray(saved.randomizer?.champions)
        ? saved.randomizer.champions.filter(name => typeof name === "string").slice(0, 2) : [];
    return next;
}

function getTournamentState() {
    return JSON.parse(JSON.stringify(tournamentState));
}

function saveTournamentState(next, reason = "update") {
    tournamentState = normalizeTournamentState(next);
    const persisted = writeStoredJSON(TOURNAMENT_STORAGE_KEY, tournamentState);
    document.dispatchEvent(new CustomEvent("tournament:changed", { detail: { reason, persisted } }));
    return persisted;
}

function getTournamentMatches(state = tournamentState) {
    return TOURNAMENT_MODULES.filter(module => module.enabled)
        .flatMap(module => [...(state?.modules[module.id]?.matches || []), ...(state?.modules[module.id]?.loserMatches || [])]);
}

function getModuleProgress(module) {
    const matches = [...(module?.matches || []), ...(module?.loserMatches || [])];
    const playable = matches.filter(match => match.playerIds?.every(Boolean));
    const completed = playable.filter(match => match.winnerId).length;
    return { total: playable.length, completed, complete: playable.length > 0 && completed === playable.length };
}

function resetTournament() {
    if (!confirm("¿Seguro que deseas reiniciar el torneo? Se borrarán enfrentamientos, resultados y sorteos. Los jugadores, perfiles y banners permanecerán registrados.")) return;
    if (saveTournamentState(createTournamentState(), "reset")) {
        announce("Torneo reiniciado. Tus jugadores y banners siguen registrados.");
    }
}

document.addEventListener("players:changed", () => {
    if (tournamentState) saveTournamentState(tournamentState, "players");
});

document.addEventListener("DOMContentLoaded", () => {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(TOURNAMENT_STORAGE_KEY) || "null");
    } catch {
        announce("No se pudo leer el torneo guardado. Los jugadores se conservan.", true);
    }
    tournamentState = normalizeTournamentState(saved);
    document.getElementById("resetTournamentButton").addEventListener("click", resetTournament);
});
