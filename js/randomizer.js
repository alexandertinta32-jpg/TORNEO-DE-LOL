/* =========================================
   RANDOMIZER — CATÁLOGO Y MODOS EXTENSIBLES
========================================= */
const RANDOMIZER_MODES = Object.freeze({ single: { count: 1 }, duel: { count: 2 } });
let randomizerTimer = null;
let randomizerRunning = false;
const randomizerResults = document.getElementById("randomizerResults");
const randomizeButton = document.getElementById("randomizeButton");

// Función independiente para incorporar filtros, exclusiones u objetos después.
function drawChampions(count, pool = LOL_CHAMPIONS) {
    const available = [...new Set(pool)];
    if (count > available.length || count < 1) return [];
    return Array.from({ length: count }, () => available.splice(randomIndex(available.length), 1)[0]);
}

function drawBalancedDuel() {
    const pools = Object.entries(CHAMPION_ROLE_POOLS).filter(([, names]) => names.length > 1);
    const [, names] = pools[randomIndex(pools.length)];
    return drawChampions(2, names);
}

function cancelRandomizer() {
    clearTimeout(randomizerTimer);
    randomizerRunning = false;
}

function renderRandomizer() {
    const state = getTournamentState().randomizer;
    const count = RANDOMIZER_MODES[state.mode].count;
    document.getElementById("championCatalogInfo").textContent = `${LOL_CHAMPIONS.length} campeones · Parche ${CHAMPION_CATALOG.version}`;
    document.querySelectorAll("[data-random-mode]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.randomMode === state.mode));
        button.disabled = randomizerRunning;
    });
    randomizerResults.classList.toggle("is-duel", count === 2);
    randomizerResults.innerHTML = Array.from({ length: count }, (_, index) => {
        const playerId = state.playerIds[index];
        return `${index ? '<span class="random-versus" aria-hidden="true">VS</span>' : ""}<article class="random-champion-card">
            <label for="random-player-${index}" class="eyebrow">${count === 2 ? `JUGADOR ${index + 1}` : "PARTICIPANTE"}</label>
            <select id="random-player-${index}" data-random-player="${index}" ${randomizerRunning ? "disabled" : ""}>
                <option value="">${count === 2 ? `Jugador ${index + 1}` : "Sorteo libre"}</option>
                ${getPlayers().map(player => `<option value="${escapeHTML(player.id)}" ${player.id === playerId ? "selected" : ""}
                    ${state.playerIds[1 - index] === player.id ? "disabled" : ""}>${escapeHTML(player.name)}</option>`).join("")}
            </select>
            <div class="champion-media" aria-hidden="true"><span>?</span></div>
            <span class="eyebrow">CAMPEÓN SELECCIONADO</span>
            <strong class="champion-result" ${index === 0 ? 'id="champion-result"' : ""}>${escapeHTML(state.champions[index] || "POR REVELAR")}</strong>
            <span class="champion-role">${state.champions[index] ? escapeHTML(getChampionRole(state.champions[index]).toUpperCase()) : "ROL EMPAREJADO"}</span>
        </article>`;
    }).join("");
    randomizeButton.disabled = randomizerRunning;
    randomizeButton.textContent = randomizerRunning ? "SORTEANDO…" : "RANDOMIZAR";
    document.getElementById("randomizerStatus").textContent = state.champions.length
        ? state.champions.map((name, index) => `${getPlayerById(state.playerIds[index])?.name || `Jugador ${index + 1}`}: ${name}`).join(" · ")
        : count === 2 ? "Dos campeones diferentes para tu próximo 1VS1." : "Todo el catálogo puede salir. Prueba tu próximo campeón.";
}

function runRandomizer() {
    if (randomizerRunning) return;
    const count = RANDOMIZER_MODES[getTournamentState().randomizer.mode].count;
    const result = count === 2 ? drawBalancedDuel() : drawChampions(count);
    randomizerRunning = true;
    renderRandomizer();
    randomizerResults.classList.add("is-rolling");
    document.getElementById("randomizerStatus").textContent = "Seleccionando campeones…";
    const started = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 1500;
    function tick() {
        if (!randomizerRunning) return;
        if (performance.now() - started >= duration) {
            randomizerRunning = false;
            randomizerResults.classList.remove("is-rolling");
            const next = getTournamentState();
            next.randomizer.champions = result;
            saveTournamentState(next, "randomizer");
            renderRandomizer();
            return;
        }
        const temporary = count === 2 ? drawBalancedDuel() : drawChampions(count);
        randomizerResults.querySelectorAll(".champion-result").forEach((element, index) => { element.textContent = temporary[index]; });
        randomizerTimer = setTimeout(tick, 85);
    }
    tick();
}

document.querySelectorAll("[data-random-mode]").forEach(button => button.addEventListener("click", () => {
    if (randomizerRunning) return;
    const next = getTournamentState();
    if (next.randomizer.mode === button.dataset.randomMode) return;
    next.randomizer.mode = button.dataset.randomMode;
    next.randomizer.champions = [];
    saveTournamentState(next, "randomizer");
    renderRandomizer();
}));
randomizerResults.addEventListener("change", event => {
    const select = event.target.closest("[data-random-player]");
    if (!select || randomizerRunning) return;
    const next = getTournamentState();
    const slot = Number(select.dataset.randomPlayer);
    if (select.value && next.randomizer.playerIds[1 - slot] === select.value) { renderRandomizer(); return; }
    next.randomizer.playerIds[slot] = select.value || null;
    next.randomizer.champions = [];
    saveTournamentState(next, "randomizer");
    renderRandomizer();
});
randomizeButton.addEventListener("click", runRandomizer);
document.addEventListener("DOMContentLoaded", renderRandomizer);
document.addEventListener("tournament:changed", event => {
    if (["players", "reset"].includes(event.detail.reason)) {
        cancelRandomizer();
        randomizerResults.classList.remove("is-rolling");
        renderRandomizer();
    }
});
