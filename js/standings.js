/* =========================================
   CLASIFICACIÓN — DERIVADA DE LOS RESULTADOS
   Recalcular evita sumar dos veces y permite corregir / deshacer ganadores.
========================================= */
function compareFutureTiebreaker() {
    return 0; // Reservado: agregar un criterio solo cuando se definan las reglas.
}

const STANDING_PLACEMENT = Object.freeze({
    champion: 1,
    runnerUp: 2,
    thirdPlace: 3,
    fourthPlace: 4,
    loserBracketWinner: 5,
    loserBracketRunnerUp: 6,
    loserBracketSemifinalist: 7,
    quarterfinalist: 9,
    pending: 99
});

function lowerPlacement(row, placement) {
    if (row && row.placement > placement) row.placement = placement;
}

function registerMatchStats(match, byId, counted, rows) {
    if (counted.has(match.id) || !match.winnerId || !match.playerIds?.every(Boolean)) return;
    if (!match.playerIds.includes(match.winnerId)) return;
    const [first, second] = match.playerIds.map(id => byId.get(id));
    if (!first || !second || first === second) return;
    counted.add(match.id);
    const loserBracketMatch = match.id.includes("-loser-");
    [first, second].forEach(row => {
        row.played++;
        if (row.player.id === match.winnerId) {
            row.won++;
            row.points += loserBracketMatch ? TOURNAMENT_CONFIG.pointsLoserWin : TOURNAMENT_CONFIG.pointsWin;
        } else {
            row.lost++;
            row.points += TOURNAMENT_CONFIG.pointsLoss;
        }
    });
}

function registerModulePlacements(module, byId) {
    if (!module?.created) return;
    const main = module.matches || [];
    const loser = module.loserMatches || [];
    const rowFor = id => id ? byId.get(id) : null;
    const loserOf = match => match?.winnerId && match.playerIds?.every(Boolean)
        ? match.playerIds.find(id => id !== match.winnerId) : null;

    const final = main.find(match => match.id.endsWith("-final-1"));
    if (final?.winnerId) {
        lowerPlacement(rowFor(final.winnerId), STANDING_PLACEMENT.champion);
        lowerPlacement(rowFor(loserOf(final)), STANDING_PLACEMENT.runnerUp);
    }
    const semis = main.filter(match => match.id.includes("-semi-"));
    const third = main.find(match => match.id.endsWith("-third-1"));
    if (third?.winnerId) {
        lowerPlacement(rowFor(third.winnerId), STANDING_PLACEMENT.thirdPlace);
        lowerPlacement(rowFor(loserOf(third)), STANDING_PLACEMENT.fourthPlace);
    } else {
        semis.forEach(match => {
            const loser = loserOf(match);
            if (loser) lowerPlacement(rowFor(loser), STANDING_PLACEMENT.thirdPlace);
        });
    }
    main.filter(match => match.id.includes("-match-"))
        .forEach(match => {
            const loser = loserOf(match);
            if (loser) lowerPlacement(rowFor(loser), STANDING_PLACEMENT.quarterfinalist);
        });

    const loserFinal = loser.find(match => match.id.endsWith("-loser-3"));
    if (loserFinal?.winnerId) {
        lowerPlacement(rowFor(loserFinal.winnerId), STANDING_PLACEMENT.loserBracketWinner);
        lowerPlacement(rowFor(loserOf(loserFinal)), STANDING_PLACEMENT.loserBracketRunnerUp);
    }
    loser.filter(match => match.id.endsWith("-loser-1") || match.id.endsWith("-loser-2"))
        .forEach(match => {
            const loserId = loserOf(match);
            if (loserId) lowerPlacement(rowFor(loserId), STANDING_PLACEMENT.loserBracketSemifinalist);
        });
}

function calculateStandings(roster = getPlayers(), source = getTournamentState()) {
    const state = Array.isArray(source) ? getTournamentState() : source;
    const matches = Array.isArray(source) ? source : getTournamentMatches(state);
    const rows = roster.map((player, index) => ({
        player, order: index, played: 0, won: 0, lost: 0, points: 0,
        placement: STANDING_PLACEMENT.pending
    }));
    const byId = new Map(rows.map(row => [row.player.id, row]));
    const counted = new Set();
    for (const match of matches) registerMatchStats(match, byId, counted, rows);
    if (state?.modules) {
        for (const definition of TOURNAMENT_MODULES.filter(item => item.enabled)) {
            registerModulePlacements(state.modules[definition.id], byId);
        }
    }
    return rows.sort((a, b) => a.placement - b.placement || b.points - a.points || b.won - a.won
        || compareFutureTiebreaker(a, b) || a.order - b.order);
}

function updateStandings() {
    const rows = calculateStandings();
    document.getElementById("standingsRules").textContent = `Cuadro principal: ${TOURNAMENT_CONFIG.pointsWin} pts por victoria · Infierno: ${TOURNAMENT_CONFIG.pointsLoserWin} pt por victoria · Derrota: ${TOURNAMENT_CONFIG.pointsLoss} pts`;
    const completed = rows.reduce((total, row) => total + row.played, 0) / 2;
    document.getElementById("standingsMatchCount").textContent = `${completed} PARTIDAS FINALIZADAS`;
    document.getElementById("standingsBody").innerHTML = rows.length ? rows.map((row, index) => {
        const banner = getPlayerBanner(row.player);
        return `<tr class="${index < 3 ? `position-${index + 1}` : ""}" data-player-id="${escapeHTML(row.player.id)}">
            <td><span class="position-number">${String(index + 1).padStart(2, "0")}</span></td>
            <th scope="row"><div class="standings-player">${banner ? `<img src="${banner.image}" alt="" loading="lazy">` : '<span class="standings-avatar" aria-hidden="true">⚔</span>'}
                <span>${escapeHTML(row.player.name)}<small>${escapeHTML(row.player.summonerName || "Participante")}</small></span></div></th>
            <td>${row.played}</td><td class="stat-wins">${row.won}</td><td>${row.lost}</td><td class="stat-points">${row.points}</td></tr>`;
    }).join("") : '<tr><td colspan="6" class="empty-state">Registra jugadores para comenzar la clasificación.</td></tr>';
}
document.addEventListener("DOMContentLoaded", updateStandings);
document.addEventListener("tournament:changed", event => {
    if (["result", "bracket", "players", "reset"].includes(event.detail.reason)) updateStandings();
});
