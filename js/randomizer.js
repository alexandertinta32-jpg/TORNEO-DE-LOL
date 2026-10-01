/* =========================================
   RANDOMIZER — CAMPEONES POR PARTICIPANTE
========================================= */
const RANDOMIZER_MODES = Object.freeze({ single: { count: 1 }, duel: { count: 2 } });
const RANDOMIZER_PLAYER_LIMIT = 3;
let randomizerTimer = null;
let randomizerRunning = false;
const randomizerResults = document.getElementById("randomizerResults");
const randomizerPlayerPanel = document.getElementById("randomizerPlayerPanel");
const randomizeButton = document.getElementById("randomizeButton");

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

function activeRandomizerPlayer(state) {
    const players = getPlayers();
    const id = players.some(player => player.id === state.activePlayerId) ? state.activePlayerId : players[0]?.id;
    return getPlayerById(id);
}

function playerChampionList(state, playerId) {
    return Array.isArray(state.championsByPlayer?.[playerId]) ? state.championsByPlayer[playerId] : [];
}

function renderPlayerPanel(state) {
    if (!randomizerPlayerPanel) return;
    const players = getPlayers();
    if (!players.length) {
        randomizerPlayerPanel.innerHTML = `<div class="randomizer-player-empty">Agrega participantes para abrir sus apartados.</div>`;
        return;
    }
    const player = activeRandomizerPlayer(state) || players[0];
    const picks = playerChampionList(state, player.id);
    randomizerPlayerPanel.innerHTML = `<div class="randomizer-player-panel-head"><span class="eyebrow">APARTADO DEL JUGADOR</span>
            <h3>${escapeHTML(player.name)}</h3><p>Cada jugador puede guardar hasta ${RANDOMIZER_PLAYER_LIMIT} campeones.</p></div>
        <label class="randomizer-player-label" for="randomizerPlayerSelect">ELEGIR PARTICIPANTE</label>
        <select id="randomizerPlayerSelect" data-randomizer-active-player ${randomizerRunning ? "disabled" : ""}>
            ${players.map(option => `<option value="${escapeHTML(option.id)}" ${option.id === player.id ? "selected" : ""}>${escapeHTML(option.name)}</option>`).join("")}
        </select>
        <details class="randomizer-player-details" open><summary><span><strong>${escapeHTML(player.name)}</strong><small>${picks.length}/${RANDOMIZER_PLAYER_LIMIT} CAMPEONES</small></span><b>⌄</b></summary>
            <div class="randomizer-picked-list">${picks.length ? picks.map((name, index) => `<article class="randomizer-picked-card"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHTML(name)}</strong><small>${escapeHTML(getChampionRole(name).toUpperCase())}</small></div></article>`).join("") : '<p class="randomizer-picked-empty">Pulsa RANDOMIZAR para agregar el primer campeón.</p>'}</div>
        </details>
        <div class="randomizer-player-switcher"><span class="eyebrow">CAMBIAR RÁPIDO</span><div>${players.map(option => `<button type="button" data-randomizer-player="${escapeHTML(option.id)}" class="${option.id === player.id ? "is-active" : ""}" ${randomizerRunning ? "disabled" : ""}>${escapeHTML(option.name)}</button>`).join("")}</div></div>`;
}

function renderDuelPanel(state) {
    if (!randomizerPlayerPanel) return;
    randomizerPlayerPanel.innerHTML = `<div class="randomizer-player-panel-head"><span class="eyebrow">MODO 1VS1 RANDOM</span><h3>Dos jugadores, un duelo</h3><p>Selecciona los participantes en las dos tarjetas y sortea un campeón para cada lado.</p></div>
        <div class="randomizer-duel-summary">${[0, 1].map(index => `<div><span>JUGADOR ${index + 1}</span><strong>${escapeHTML(getPlayerById(state.playerIds[index])?.name || "Por elegir")}</strong></div>`).join("")}</div>`;
}

function singleResultMarkup(state, player) {
    const picks = player ? playerChampionList(state, player.id) : [];
    const latest = picks[picks.length - 1] || "";
    return `<article class="random-champion-card random-champion-card-single"><span class="eyebrow">RANDOMIZER · ${escapeHTML(player?.name || "PARTICIPANTE")}</span>
        <div class="champion-media" aria-hidden="true"><span>${latest ? escapeHTML(latest.slice(0, 2).toUpperCase()) : "?"}</span></div>
        <span class="eyebrow">ÚLTIMO CAMPEÓN AÑADIDO</span><strong class="champion-result">${escapeHTML(latest || "POR REVELAR")}</strong>
        <span class="champion-role">${latest ? escapeHTML(getChampionRole(latest).toUpperCase()) : "ROL EMPAREJADO"}</span></article>`;
}

function renderRandomizer() {
    const state = getTournamentState().randomizer;
    const count = RANDOMIZER_MODES[state.mode].count;
    document.getElementById("championCatalogInfo").textContent = `${LOL_CHAMPIONS.length} campeones · Parche ${CHAMPION_CATALOG.version}`;
    document.querySelectorAll("[data-random-mode]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.randomMode === state.mode));
        button.disabled = randomizerRunning;
    });
    if (state.mode === "single") {
        const player = activeRandomizerPlayer(state);
        const picks = player ? playerChampionList(state, player.id) : [];
        renderPlayerPanel(state);
        randomizerResults.classList.remove("is-duel");
        randomizerResults.innerHTML = singleResultMarkup(state, player);
        const limit = picks.length >= RANDOMIZER_PLAYER_LIMIT;
        randomizeButton.disabled = randomizerRunning || limit || !player;
        randomizeButton.textContent = randomizerRunning ? "SORTEANDO…" : limit ? "LÍMITE ALCANZADO" : "RANDOMIZAR";
        document.getElementById("randomizerStatus").textContent = !player ? "Agrega participantes para comenzar." : limit
            ? `${player.name} ya tiene sus ${RANDOMIZER_PLAYER_LIMIT} campeones guardados.`
            : picks.length ? `${player.name}: ${picks.length}/${RANDOMIZER_PLAYER_LIMIT}. Cada giro agrega un campeón nuevo.` : `El próximo giro se guardará en el apartado de ${player.name}.`;
        return;
    }
    renderDuelPanel(state);
    randomizerResults.classList.add("is-duel");
    randomizerResults.innerHTML = Array.from({ length: count }, (_, index) => {
        const playerId = state.playerIds[index];
        return `${index ? '<span class="random-versus" aria-hidden="true">VS</span>' : ""}<article class="random-champion-card"><label for="random-player-${index}" class="eyebrow">JUGADOR ${index + 1}</label>
            <select id="random-player-${index}" data-random-player="${index}" ${randomizerRunning ? "disabled" : ""}><option value="">Jugador ${index + 1}</option>
                ${getPlayers().map(option => `<option value="${escapeHTML(option.id)}" ${option.id === playerId ? "selected" : ""} ${state.playerIds[1 - index] === option.id ? "disabled" : ""}>${escapeHTML(option.name)}</option>`).join("")}</select>
            <div class="champion-media" aria-hidden="true"><span>?</span></div><span class="eyebrow">CAMPEÓN SELECCIONADO</span>
            <strong class="champion-result">${escapeHTML(state.champions[index] || "POR REVELAR")}</strong><span class="champion-role">${state.champions[index] ? escapeHTML(getChampionRole(state.champions[index]).toUpperCase()) : "ROL EMPAREJADO"}</span></article>`;
    }).join("");
    randomizeButton.disabled = randomizerRunning;
    randomizeButton.textContent = randomizerRunning ? "SORTEANDO…" : "RANDOMIZAR";
    document.getElementById("randomizerStatus").textContent = state.champions.length
        ? state.champions.map((name, index) => `${getPlayerById(state.playerIds[index])?.name || `Jugador ${index + 1}`}: ${name}`).join(" · ") : "Dos campeones diferentes para tu próximo 1VS1.";
}

function runRandomizer() {
    if (randomizerRunning) return;
    const state = getTournamentState();
    const count = RANDOMIZER_MODES[state.randomizer.mode].count;
    let result;
    let activeId = null;
    if (state.randomizer.mode === "single") {
        const player = activeRandomizerPlayer(state);
        activeId = player?.id || null;
        const picks = activeId ? playerChampionList(state.randomizer, activeId) : [];
        if (!activeId || picks.length >= RANDOMIZER_PLAYER_LIMIT) return;
        result = drawChampions(1, LOL_CHAMPIONS.filter(name => !picks.includes(name)));
    } else result = drawBalancedDuel();
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
            if (next.randomizer.mode === "single") {
                const current = playerChampionList(next.randomizer, activeId);
                next.randomizer.activePlayerId = activeId;
                next.randomizer.championsByPlayer[activeId] = [...current, result[0]].slice(0, RANDOMIZER_PLAYER_LIMIT);
                next.randomizer.champions = [result[0]];
            } else next.randomizer.champions = result;
            saveTournamentState(next, "randomizer");
            renderRandomizer();
            return;
        }
        const temporary = count === 2 ? drawBalancedDuel() : drawChampions(1);
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
randomizerPlayerPanel?.addEventListener("change", event => {
    const select = event.target.closest("[data-randomizer-active-player]");
    if (!select || randomizerRunning) return;
    const next = getTournamentState();
    next.randomizer.activePlayerId = select.value;
    next.randomizer.champions = [];
    saveTournamentState(next, "randomizer");
    renderRandomizer();
});
randomizerPlayerPanel?.addEventListener("click", event => {
    const button = event.target.closest("[data-randomizer-player]");
    if (!button || randomizerRunning) return;
    const next = getTournamentState();
    next.randomizer.activePlayerId = button.dataset.randomizerPlayer;
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
