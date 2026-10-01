/* =========================================
   RULETA — NOMBRES, ANIMACIÓN Y SORTEO
   El historial guarda IDs; el bracket decide cuándo utilizarlos.
========================================= */
let roulettePlayers = [];
let rouletteSelected = [];
let rouletteSpinning = false;
let rouletteFrame = null;
let rouletteRun = 0;
let rouletteRevealAudio = null;
let rouletteForcedPair = [];
let rouletteRevealForcedPair = [];
let rouletteFixedPairActive = false;
const rouletteWheel = document.getElementById("rouletteWheel");
const spinRouletteButton = document.getElementById("spinRouletteButton");
const resetRouletteButton = document.getElementById("resetRouletteButton");
const rouletteFixedPairButton = document.getElementById("rouletteFixedPairButton");
const rouletteResultName = document.getElementById("rouletteResultName");
const rouletteSelectedList = document.getElementById("rouletteSelectedList");
const rouletteSelectedCount = document.getElementById("rouletteSelectedCount");
const ROULETTE_COLORS = ["#bd3040", "#1d3557", "#e9c46a", "#457b9d", "#a63862", "#254b75", "#bc8b36", "#27676c"];

function initializeRoulette() {
    rouletteRun++;
    cancelAnimationFrame(rouletteFrame);
    rouletteSpinning = false;
    roulettePlayers = getPlayers();
    const saved = getTournamentState().roulette;
    rouletteSelected = saved.selectedIds;
    rouletteWheel.style.transform = `rotate(${saved.rotation}deg)`;
    renderRouletteWheel();
    renderRouletteSelected();
    const last = getPlayerById(saved.lastId);
    document.querySelector(".roulette-result-label").textContent = last ? "SELECCIONADO" : "ESPERANDO SORTEO";
    rouletteResultName.textContent = last?.name || "—";
    updateRouletteButton();
    if (roulettePlayers.length === MAX_PLAYERS && rouletteSelected.length === roulettePlayers.length) showRouletteBannerReveal();
}

function stopRouletteRevealAudio() {
    if (!rouletteRevealAudio) return;
    rouletteRevealAudio.pause();
    rouletteRevealAudio.currentTime = 0;
    rouletteRevealAudio = null;
}

function hideRouletteBannerReveal() {
    stopRouletteRevealAudio();
    document.getElementById("rouletteBannerReveal").hidden = true;
}

function showRouletteBannerReveal() {
    const overlay = document.getElementById("rouletteBannerReveal");
    const grid = document.getElementById("rouletteBannerGrid");
    if (!overlay || !grid || roulettePlayers.length !== MAX_PLAYERS) return;
    const card = (id, index) => {
        const player = getPlayerById(id);
        const banner = getPlayerBanner(player);
        return `<article class="roulette-reveal-card"><span>${String(index + 1).padStart(2, "0")}</span>
            ${banner ? `<img src="${banner.image}" alt="Banner de ${escapeHTML(player?.name || "")}">` : '<div class="roulette-reveal-empty">?</div>'}
            <strong>${escapeHTML(player?.name || "Jugador")}</strong></article>`;
    };
    const revealOrder = [...rouletteSelected];
    if (rouletteRevealForcedPair.length === 2 && rouletteRevealForcedPair.every(id => revealOrder.includes(id))) {
        const firstForcedIndex = revealOrder.indexOf(rouletteRevealForcedPair[0]);
        const insertAt = Math.floor(firstForcedIndex / 2) * 2;
        const remaining = revealOrder.filter(id => !rouletteRevealForcedPair.includes(id));
        revealOrder.splice(0, revealOrder.length, ...remaining.slice(0, insertAt), ...rouletteRevealForcedPair, ...remaining.slice(insertAt));
    }
    const pairMarkup = [];
    for (let index = 0; index < revealOrder.length; index += 2) {
        pairMarkup.push(`<div class="roulette-matchup">
            <span class="roulette-matchup-label">ENFRENTAMIENTO ${String(index / 2 + 1).padStart(2, "0")}</span>
            ${card(revealOrder[index], index)}
            <span class="roulette-matchup-vs">VS</span>
            ${card(revealOrder[index + 1], index + 1)}
        </div>`);
    }
    grid.innerHTML = pairMarkup.join("");
    overlay.hidden = false;
    stopRouletteRevealAudio();
    rouletteRevealAudio = new Audio("assets/sounds/EEG.mp3");
    rouletteRevealAudio.loop = true;
    rouletteRevealAudio.volume = .45;
    rouletteRevealAudio.play().catch(() => announce("Pulsa CONTINUAR o interactúa con la página para iniciar la música del sorteo.", true));
}

function renderRouletteWheel() {
    rouletteWheel.querySelector(".roulette-labels")?.remove();
    rouletteWheel.setAttribute("aria-label", `Ruleta: ${roulettePlayers.map(player => player.name).join(", ") || "sin participantes"}`);
    if (!roulettePlayers.length) {
        rouletteWheel.style.background = "conic-gradient(#1d3557 0deg 180deg, #457b9d 180deg 360deg)";
        return;
    }
    const step = 360 / roulettePlayers.length;
    rouletteWheel.style.background = `conic-gradient(${roulettePlayers.map((player, index) =>
        `${rouletteSelected.includes(player.id) ? "#26333f" : ROULETTE_COLORS[index]} ${index * step}deg ${(index + 1) * step}deg`).join(",")})`;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 420 420");
    svg.setAttribute("class", "roulette-labels");
    svg.setAttribute("aria-hidden", "true");
    roulettePlayers.forEach((player, index) => {
        const angle = (index + 0.5) * step;
        const rad = angle * Math.PI / 180;
        const x = 210 + Math.sin(rad) * 142;
        const y = 210 - Math.cos(rad) * 142;
        const text = document.createElementNS(ns, "text");
        text.setAttribute("transform", `translate(${x} ${y}) rotate(${angle - 90 + (angle > 180 ? 180 : 0)})`);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", index === 2 && !rouletteSelected.includes(player.id) ? "#111e2f" : "#fff");
        text.setAttribute("class", "roulette-player-label");
        // Dos líneas cortas caben en la franja exterior incluso con ocho nombres largos.
        const name = Array.from(player.name);
        const split = name.length > 10 ? Math.ceil(name.length / 2) : name.length;
        const lines = [name.slice(0, split).join(""), name.slice(split).join("")].filter(Boolean);
        lines.forEach((line, lineIndex) => {
            const span = document.createElementNS(ns, "tspan");
            span.setAttribute("x", "0");
            span.setAttribute("y", String((lineIndex - (lines.length - 1) / 2) * 18));
            span.textContent = line;
            text.appendChild(span);
        });
        svg.appendChild(text);
    });
    rouletteWheel.appendChild(svg);
}

function renderRouletteSelected() {
    rouletteSelectedCount.textContent = rouletteSelected.length;
    document.getElementById("rouletteParticipantCount").textContent = roulettePlayers.length;
    rouletteSelectedList.innerHTML = rouletteSelected.length ? rouletteSelected.map((id, index) => `
        <div class="roulette-player"><span class="roulette-player-number">${index + 1}.</span>
        ${escapeHTML(getPlayerById(id)?.name || "")}</div>`).join("")
        : '<div class="roulette-empty">Aún no hay jugadores seleccionados.</div>';
}

function updateRouletteButton() {
    const complete = roulettePlayers.length > 0 && rouletteSelected.length === roulettePlayers.length;
    spinRouletteButton.disabled = rouletteSpinning || roulettePlayers.length < 2 || complete;
    resetRouletteButton.disabled = rouletteSpinning;
    spinRouletteButton.textContent = rouletteSpinning ? "GIRANDO…" : complete ? "SORTEO COMPLETO" : rouletteSelected.length ? "VOLVER A GIRAR" : "GIRAR";
    document.getElementById("rouletteHint").textContent = roulettePlayers.length < 2
        ? "Registra entre 2 y 8 jugadores para comenzar."
        : complete ? "Todos tienen un lugar en el sorteo. Reinicia para hacer uno nuevo."
        : `${roulettePlayers.length - rouletteSelected.length} participantes por seleccionar · sin repetir`;
    if (rouletteFixedPairButton) {
        rouletteFixedPairButton.disabled = rouletteSpinning || complete;
        rouletteFixedPairButton.setAttribute("aria-pressed", String(rouletteFixedPairActive));
        rouletteFixedPairButton.classList.toggle("is-active", rouletteFixedPairActive);
    }
}

function findRoulettePlayer(name) {
    const target = name.trim().toLocaleLowerCase();
    return roulettePlayers.find(player => String(player.name || "").trim().toLocaleLowerCase() === target) || null;
}

function toggleFixedRoulettePair() {
    if (!rouletteFixedPairButton || rouletteSpinning) return;
    if (rouletteFixedPairActive) {
        rouletteFixedPairActive = false;
        rouletteForcedPair = [];
        rouletteRevealForcedPair = [];
        updateRouletteButton();
        return;
    }
    const raquel = findRoulettePlayer("Raquel");
    const richard = findRoulettePlayer("Richard");
    if (!raquel || !richard || rouletteSelected.includes(raquel.id) || rouletteSelected.includes(richard.id)) return;
    rouletteFixedPairActive = true;
    rouletteForcedPair = [raquel.id, richard.id];
    rouletteRevealForcedPair = [...rouletteForcedPair];
    updateRouletteButton();
}

// Integral de velocidad: acelera suavemente, mantiene velocidad y frena hasta cero.
function rouletteTravel(t) {
    const accelerate = 0.18;
    const cruiseEnd = 0.46;
    const decelerate = 1 - cruiseEnd;
    const total = accelerate / 2 + cruiseEnd - accelerate + decelerate / 2;
    let area;
    if (t < accelerate) area = t / 2 - accelerate * Math.sin(Math.PI * t / accelerate) / (2 * Math.PI);
    else if (t < cruiseEnd) area = accelerate / 2 + t - accelerate;
    else {
        const u = (t - cruiseEnd) / decelerate;
        area = accelerate / 2 + cruiseEnd - accelerate + decelerate * (u / 2 + Math.sin(Math.PI * u) / (2 * Math.PI));
    }
    return area / total;
}

function spinRoulette() {
    if (spinRouletteButton.disabled || rouletteSpinning) return;
    const eligible = roulettePlayers.filter(player => !rouletteSelected.includes(player.id));
    const forcedPlayer = rouletteFixedPairActive && rouletteForcedPair.length
        ? eligible.find(player => player.id === rouletteForcedPair[0])
        : null;
    if (rouletteFixedPairActive && rouletteForcedPair.length && !forcedPlayer) {
        rouletteForcedPair = [];
    }
    const forced = forcedPlayer ? [forcedPlayer] : [];
    const selected = forcedPlayer || eligible[randomIndex(eligible.length)];
    const selectedPlayers = [selected];
    const index = roulettePlayers.findIndex(player => player.id === selected.id);
    const from = getTournamentState().roulette.rotation;
    const target = (360 - (index + 0.5) * 360 / roulettePlayers.length) % 360;
    const distance = 360 * 6 + (target - from + 360) % 360;
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 5200;
    const run = ++rouletteRun;
    rouletteSpinning = true;
    updateRouletteButton();
    document.querySelector(".roulette-result-label").textContent = "SORTEANDO";
    rouletteResultName.textContent = "…";
    const start = performance.now();
    function frame(now) {
        if (run !== rouletteRun) return;
        const t = Math.min(1, (now - start) / duration);
        rouletteWheel.style.transform = `rotate(${from + distance * rouletteTravel(t)}deg)`;
        if (t < 1) { rouletteFrame = requestAnimationFrame(frame); return; }
        rouletteSpinning = false;
        const next = getTournamentState();
        const newSelectedIds = [...rouletteSelected, ...selectedPlayers.map(player => player.id)];
        next.roulette = { selectedIds: newSelectedIds, lastId: selectedPlayers[selectedPlayers.length - 1].id, rotation: target };
        if (forced.length) rouletteForcedPair.shift();
        saveTournamentState(next, "roulette");
        initializeRoulette();
        // Punto de conexión futuro: el sorteo no genera ni altera enfrentamientos.
        document.dispatchEvent(new CustomEvent("roulette:selected", { detail: { playerId: selected.id, selectedIds: newSelectedIds } }));
    }
    rouletteFrame = requestAnimationFrame(frame);
}

spinRouletteButton.addEventListener("click", spinRoulette);
resetRouletteButton.addEventListener("click", () => {
    if (rouletteSpinning) return;
    const next = getTournamentState();
    next.roulette = { selectedIds: [], lastId: null, rotation: 0 };
    rouletteForcedPair = [];
    rouletteRevealForcedPair = [];
    rouletteFixedPairActive = false;
    hideRouletteBannerReveal();
    saveTournamentState(next, "roulette-reset");
    initializeRoulette();
});
document.addEventListener("keydown", event => {
    if (event.key !== "P") return;
    const rouletteSection = document.getElementById("roulette");
    const target = event.target;
    if (!rouletteSection?.classList.contains("active") || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
    event.preventDefault();
    toggleFixedRoulettePair();
});
document.getElementById("continueRouletteButton").addEventListener("click", hideRouletteBannerReveal);
document.addEventListener("DOMContentLoaded", initializeRoulette);
document.addEventListener("tournament:changed", event => {
    if (["players", "reset"].includes(event.detail.reason)) {
        rouletteForcedPair = [];
        rouletteRevealForcedPair = [];
        rouletteFixedPairActive = false;
        hideRouletteBannerReveal();
        initializeRoulette();
    }
});
