/* =========================================
   BRACKET — MÓDULOS INDEPENDIENTES
   No hay eliminación ni pases automáticos hasta definir esas reglas.
========================================= */
function createModuleMatches(moduleId) {
    const definition = TOURNAMENT_MODULES.find(module => module.id === moduleId && module.enabled);
    const roster = getPlayers();
    if (!definition || roster.length < 2) return;
    const next = getTournamentState();
    if (next.modules[moduleId].created && !confirm("¿Volver a preparar los cruces de este módulo? Se borrarán solamente sus resultados.")) return;
    next.modules[moduleId] = {
        created: true,
        matches: Array.from({ length: Math.ceil(roster.length / 2) }, (_, index) => ({
            id: `${moduleId}-match-${index + 1}`,
            // Los cruces se preparan vacíos para que el organizador decida
            // desde cero quién ocupa cada lado del bracket.
            playerIds: [null, null],
            winnerId: null,
            derived: false
        })),
        loserMatches: []
    };
    if (definition.enabled) {
        next.modules[moduleId].matches.push(
            { id: `${moduleId}-semi-1`, playerIds: [null, null], winnerId: null, derived: true },
            { id: `${moduleId}-semi-2`, playerIds: [null, null], winnerId: null, derived: true },
            { id: `${moduleId}-final-1`, playerIds: [null, null], winnerId: null, derived: true },
            { id: `${moduleId}-revanch-1`, playerIds: [null, null], winnerId: null, derived: true }
        );
        next.modules[moduleId].loserMatches = Array.from({ length: 5 }, (_, index) => ({
            id: `${moduleId}-loser-${index + 1}`, playerIds: [null, null], winnerId: null, derived: true
        }));
    }
    syncBracketProgression(next);
    saveTournamentState(next, "bracket");
}

function syncBracketProgression(state) {
    let changed = false;
    const update = (match, playerIds) => {
        if (!match) return;
        const ids = [playerIds[0] || null, playerIds[1] || null];
        const winnerId = ids.includes(match.winnerId) && ids.every(Boolean) ? match.winnerId : null;
        if (match.playerIds[0] !== ids[0] || match.playerIds[1] !== ids[1] || match.winnerId !== winnerId) changed = true;
        match.playerIds = ids;
        match.winnerId = winnerId;
    };
    for (const definition of TOURNAMENT_MODULES.filter(item => item.enabled)) {
        const module = state?.modules?.[definition.id];
        if (!module?.created || module.loserMatches.length < 5) continue;
        const quarter = module.matches.filter(match => match.id.includes("-match-")).slice(0, 4);
        const semiOne = module.matches.find(match => match.id === `${definition.id}-semi-1`);
        const semiTwo = module.matches.find(match => match.id === `${definition.id}-semi-2`);
        const final = module.matches.find(match => match.id === `${definition.id}-final-1`);
        const revenge = module.matches.find(match => match.id === `${definition.id}-revanch-1`);
        if (quarter.length < 4 || !semiOne || !semiTwo || !final) continue;
        update(semiOne, [quarter[0].winnerId, quarter[1].winnerId]);
        update(semiTwo, [quarter[2].winnerId, quarter[3].winnerId]);
        const loserOf = match => match?.winnerId && match.playerIds?.every(Boolean)
            ? match.playerIds.find(id => id !== match.winnerId) : null;
        update(final, [semiOne.winnerId, semiTwo.winnerId]);
        update(module.loserMatches[0], [loserOf(quarter[0]), loserOf(quarter[1])]);
        update(module.loserMatches[1], [loserOf(quarter[2]), loserOf(quarter[3])]);
        // Primera ronda del Infierno: perdedores de cuartos.
        // Semifinales del Infierno: ganadores de esa ronda contra los
        // eliminados de las semifinales principales.
        update(module.loserMatches[2], [module.loserMatches[0].winnerId, loserOf(semiOne)]);
        update(module.loserMatches[3], [module.loserMatches[1].winnerId, loserOf(semiTwo)]);
        update(module.loserMatches[4], [module.loserMatches[2].winnerId, module.loserMatches[3].winnerId]);
        // La revancha enfrenta al ganador del cuadro principal con el ganador del Infierno.
        update(revenge, [final.winnerId, module.loserMatches[4].winnerId]);
    }
    return changed;
}

function setMatchParticipant(moduleId, matchId, slot, playerId) {
    const next = getTournamentState();
    const module = next.modules[moduleId];
    const match = [...(module?.matches || []), ...(module?.loserMatches || [])].find(item => item.id === matchId);
    if (!match || ![0, 1].includes(slot)) return false;
    if (playerId && (!getPlayerById(playerId) || module.matches.some(item => item.playerIds.some((id, side) =>
        id === playerId && (item.id !== matchId || side !== slot))))) return false;
    if (match.derived) return false;
    if (match.playerIds[slot] === playerId) return true;
    match.playerIds[slot] = playerId || null;
    match.winnerId = null;
    syncBracketProgression(next);
    saveTournamentState(next, "bracket");
    return true;
}

function setMatchWinner(moduleId, matchId, winnerId) {
    const next = getTournamentState();
    const module = next.modules[moduleId];
    const match = [...(module?.matches || []), ...(module?.loserMatches || [])].find(item => item.id === matchId);
    if (!match || !match.playerIds.every(id => id && getPlayerById(id))) return false;
    if (winnerId !== null && !match.playerIds.includes(winnerId)) return false;
    match.winnerId = winnerId;
    syncBracketProgression(next);
    saveTournamentState(next, "result");
    return true;
}

function matchPlayerMarkup(playerId, match, slot, used) {
    const player = getPlayerById(playerId);
    const banner = getPlayerBanner(player);
    const winner = playerId && match.winnerId === playerId;
    const ready = match.playerIds.every(Boolean);
    const selectId = `${match.id}-slot-${slot}`;
    return `<div class="match-side ${winner ? "is-winner" : ""}">
        <label class="sr-only" for="${selectId}">Jugador ${slot + 1} · ${match.id}</label>
        <select id="${selectId}" data-match="${match.id}" data-slot="${slot}" class="match-player-select">
            <option value="">Elegir jugador</option>
            ${getPlayers().map(item => `<option value="${escapeHTML(item.id)}" ${item.id === playerId ? "selected" : ""}
                ${used.has(item.id) && item.id !== playerId ? "disabled" : ""}>${escapeHTML(item.name)}</option>`).join("")}
        </select>
        <button type="button" class="match-player ${winner ? "is-winner" : ""}" data-match="${match.id}"
            data-winner="${escapeHTML(playerId || "")}" aria-pressed="${Boolean(winner)}"
            aria-label="Marcar victoria de ${escapeHTML(player?.name || "jugador pendiente")}" ${!ready ? "disabled" : ""}>
            ${banner ? `<img class="match-banner" src="${banner.image}" alt="" loading="lazy">` : '<span class="match-emblem" aria-hidden="true">⚔</span>'}
            <span class="match-player-content"><strong>${escapeHTML(player?.name || "POR DEFINIR")}</strong>
                <span>${winner ? "✓ VICTORIA" : match.winnerId ? "DERROTA" : player ? "MARCAR VICTORIA" : "ESPERANDO JUGADOR"}</span></span>
        </button>
    </div>`;
}

function bracketPreviewMarkup(module) {
    const winners = module.matches.map(match => getPlayerById(match.winnerId)?.name || "A CONFIRMAR");
    const semifinal = (index) => `<div class="preview-match"><span>${escapeHTML(winners[index] || "A CONFIRMAR")}</span><i>VS</i><span>${escapeHTML(winners[index + 1] || "A CONFIRMAR")}</span></div>`;
    const finalLeft = module.matches.length > 2 ? "SEMIFINAL 1" : "A CONFIRMAR";
    const finalRight = module.matches.length > 2 ? "SEMIFINAL 2" : "A CONFIRMAR";
    return `<aside class="bracket-preview" aria-label="Vista previa de avance del módulo">
        <div class="bracket-preview-round"><span class="bracket-round-label">SIGUIENTE RONDA</span>${semifinal(0)}${semifinal(2)}</div>
        <div class="bracket-preview-round bracket-preview-final"><span class="bracket-round-label">FINAL</span><div class="preview-match"><span>${finalLeft}</span><i>VS</i><span>${finalRight}</span></div></div>
    </aside>`;
}

function treePlayerMarkup(playerId, match, slot, used) {
    const player = getPlayerById(playerId);
    const banner = getPlayerBanner(player);
    const winner = playerId && match.winnerId === playerId;
    const selectId = `${match.id}-tree-slot-${slot}`;
    return `<div class="tree-player-wrap">
        <label class="sr-only" for="${selectId}">Jugador ${slot + 1} · ${match.id}</label>
        <select id="${selectId}" data-match="${match.id}" data-slot="${slot}" class="tree-player-select" ${match.derived ? "disabled" : ""}>
            <option value="">Elegir jugador</option>
            ${getPlayers().map(item => `<option value="${escapeHTML(item.id)}" ${item.id === playerId ? "selected" : ""} ${used.has(item.id) && item.id !== playerId ? "disabled" : ""}>${escapeHTML(item.name)}</option>`).join("")}
        </select>
        <button type="button" class="match-player tree-player ${winner ? "is-winner" : ""}" data-match="${match.id}" data-winner="${escapeHTML(playerId || "")}" aria-pressed="${Boolean(winner)}" aria-label="Marcar victoria de ${escapeHTML(player?.name || "jugador pendiente")}" ${!match.playerIds.every(Boolean) ? "disabled" : ""}>
            ${banner ? `<img class="tree-banner" src="${banner.image}" alt="" loading="lazy">` : ""}
            <span class="tree-banner-shade" aria-hidden="true"></span>
            <strong>${escapeHTML(player?.name || "A CONFIRMAR")}</strong><small>${winner ? "✓ VICTORIA" : match.winnerId ? "DERROTA" : ""}</small>
        </button>
    </div>`;
}

function treeMatchMarkup(match, index, used) {
    const stageLabel = match.id.includes("-semi-")
        ? `SEMIFINAL ${match.id.endsWith("2") ? "02" : "01"}`
        : match.id.includes("-third-") ? "TERCER PUESTO"
        : match.id.includes("-revanch-") ? "FINAL (REVANCHA)"
        : match.id.includes("-final-") ? "FINAL"
        : match.id.includes("-loser-") ? `INFIERNO ${String(Number(match.id.split("-").pop())).padStart(2, "0")}`
        : `CUARTOS DE FINAL ${String(index + 1).padStart(2, "0")}`;
    return `<article class="tree-match ${match.winnerId ? "is-resolved" : ""}" data-match-id="${match.id}">
        <div class="tree-match-label">${stageLabel}</div>
        ${treePlayerMarkup(match.playerIds[0], match, 0, used)}
        <span class="tree-vs">VS</span>
        ${treePlayerMarkup(match.playerIds[1], match, 1, used)}
        <div class="tree-match-footer"><span>${match.winnerId ? `Ganó ${escapeHTML(getPlayerById(match.winnerId)?.name)}` : "Selecciona un ganador"}</span>${match.winnerId ? `<button type="button" class="text-button" data-clear="${match.id}">Deshacer</button>` : ""}</div>
    </article>`;
}

function treePreviewMatch(first, second) {
    return `<div class="tree-preview-match"><span>${escapeHTML(first || "A CONFIRMAR")}</span><i>VS</i><span>${escapeHTML(second || "A CONFIRMAR")}</span></div>`;
}

function championMarkup(module) {
    const final = module.matches.find(match => match.id.endsWith("-final-1"));
    const champion = getPlayerById(final?.winnerId);
    if (!champion) return `<div class="bracket-champion is-pending"><span class="bracket-round-label">CAMPEÓN</span><div class="champion-placeholder">A CONFIRMAR</div></div>`;
    const banner = getPlayerBanner(champion);
    return `<div class="bracket-champion"><span class="bracket-round-label">CAMPEÓN</span><button type="button" class="champion-profile-button" data-bracket-champion="${escapeHTML(champion.id)}" aria-label="Abrir perfil de ${escapeHTML(champion.name)}">
        ${banner ? `<img src="${banner.image}" alt="" loading="lazy">` : ""}<span class="champion-profile-shade"></span><strong>${escapeHTML(champion.name)}</strong><small>VER PERFIL</small>
    </button></div>`;
}

function syncBracketChampionTheme(state) {
    const prefix = "bracket-theme-";
    document.body.classList.forEach(className => {
        if (className.startsWith(prefix)) document.body.classList.remove(className);
    });
    const activeModuleId = state?.currentModule;
    const modules = TOURNAMENT_MODULES.filter(definition => definition.enabled)
        .sort((left, right) => left.id === activeModuleId ? -1 : right.id === activeModuleId ? 1 : 0);
    const championId = modules.map(definition => {
        const module = state?.modules?.[definition.id];
        return module?.matches?.find(match => match.id.endsWith("-revanch-1"))?.winnerId || null;
    }).find(Boolean);
    const champion = getPlayerById(championId);
    const theme = getPlayerBanner(champion)?.theme || champion?.theme;
    if (theme) document.body.classList.add(`${prefix}${theme}`);
}

function placementCardMarkup(rank, playerId, description, champion = false) {
    const player = getPlayerById(playerId);
    const banner = getPlayerBanner(player);
    const label = player?.name || "A CONFIRMAR";
    const buttonAttrs = champion && player
        ? `data-bracket-champion="${escapeHTML(player.id)}" aria-label="Abrir perfil de ${escapeHTML(player.name)}, campeón"`
        : "disabled";
    return `<div class="placement-card placement-${rank.replace("º", "").replace("°", "")}">
        <span class="placement-rank">${rank}</span>
        <button type="button" class="placement-player" ${buttonAttrs}>
            <span class="placement-art">${banner ? `<img src="${banner.image}" alt="" loading="lazy">` : ""}<i></i></span>
            <span class="placement-info"><strong>${escapeHTML(label)}</strong><small>${escapeHTML(description)}</small></span>
        </button>
    </div>`;
}

function bracketTreeMarkup(module) {
    const used = new Set(module.matches.filter(match => !match.derived).flatMap(match => match.playerIds).filter(Boolean));
    const quarters = module.matches.filter(match => match.id.includes("-match-")).slice(0, 4);
    const semiOne = module.matches.find(match => match.id.endsWith("-semi-1"));
    const semiTwo = module.matches.find(match => match.id.endsWith("-semi-2"));
    const final = module.matches.find(match => match.id.endsWith("-final-1"));
    const revenge = module.matches.find(match => match.id.endsWith("-revanch-1"));
    const loserOf = match => match?.winnerId && match.playerIds?.every(Boolean)
        ? match.playerIds.find(id => id !== match.winnerId) : null;
    const hellFinal = module.loserMatches?.find(match => match.id.endsWith("-loser-5"));
    const first = revenge?.winnerId || null;
    const second = loserOf(revenge);
    const third = loserOf(final);
    const fourth = loserOf(hellFinal);
    const connector = (column, row, span, path, height, resolved) => `<svg class="flow-connector ${resolved ? "is-resolved" : ""}" style="grid-column:${column};grid-row:${row} / span ${span}" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" /></svg>`;
    return `<section class="bracket-composition" aria-label="Bracket principal con final de revancha">
        <p class="composition-help">Marca la victoria en cada cruce. En semifinales, la final principal y la revancha, elige el banner del ganador; los perdedores de cuartos pasan al bracket del Infierno.</p>
        <div class="composition-scroll" role="region" aria-label="Bracket principal desplazable" tabindex="0">
            <div class="flow-board composition-flow-board">
                <span class="flow-round" style="grid-column:1"><small>01 / CRUCES</small>CUARTOS DE FINAL</span>
                <span class="flow-round" style="grid-column:3"><small>02 / TOP 4</small>SEMIFINALES</span>
                <span class="flow-round" style="grid-column:5"><small>03 / TOP 2</small>FINAL DEL BRACKET PRINCIPAL</span>
                <span class="flow-round flow-round-champion" style="grid-column:7"><small>04 / ÚLTIMA OPORTUNIDAD</small>FINAL (REVANCHA)</span>
                ${quarters.map((match, index) => {
                    const semifinal = index < 2 ? semiOne : semiTwo;
                    const row = 2 + index * 2;
                    return `<div class="flow-quarter" style="grid-column:1;grid-row:${row} / span 2">${treeMatchMarkup(match, index, used)}</div>
                        ${connector(2, row, 2, "M0 60 H42 V116 H0 M42 88 H100", 176, match?.winnerId)}
                        <div class="flow-node" style="grid-column:3;grid-row:${row} / span 2">${flowBannerMarkup(match?.winnerId, semifinal, `Ganador de cuartos ${String(index + 1).padStart(2, "0")}`, "SEMIFINAL")}</div>`;
                }).join("")}
                ${[semiOne, semiTwo].map((match, index) => {
                    const row = 2 + index * 4;
                    return `${connector(4, row, 4, "M0 88 H48 V264 H0 M48 176 H100", 352, match?.winnerId)}
                        <div class="flow-node flow-finalist" style="grid-column:5;grid-row:${row} / span 4">${flowBannerMarkup(match?.winnerId, final, `Ganador de semifinal ${index + 1}`, "FINAL")}${match?.winnerId ? `<button type="button" class="text-button flow-undo" data-clear="${match.id}" aria-label="Deshacer resultado de semifinal ${index + 1}">Deshacer semifinal ${index + 1}</button>` : ""}</div>`;
                }).join("")}
                ${connector(6, 2, 8, "M0 176 H48 V528 H0 M48 352 H100", 704, final?.winnerId && hellFinal?.winnerId)}
                <div class="flow-node composition-revenge-main" style="grid-column:7;grid-row:2 / span 4">${flowBannerMarkup(final?.winnerId, revenge, "Ganador de la final principal", "REVANCHA")}</div>
                <div class="flow-node composition-revenge-hell" style="grid-column:7;grid-row:6 / span 4">${flowBannerMarkup(hellFinal?.winnerId, revenge, "Ganador del Infierno", "REVANCHA")}</div>
            </div>
        </div>
        <p class="composition-scroll-hint">Desliza horizontalmente para ver todas las rondas →</p>
        <div class="placement-strip" aria-label="Posiciones finales del módulo">
            ${placementCardMarkup("1º", first, "CAMPEÓN", true)}
            ${placementCardMarkup("2º", second, "FINAL DE REVANCHA")}
            ${placementCardMarkup("3º", third, "PERDEDOR DE LA FINAL PRINCIPAL")}
            ${placementCardMarkup("4º", fourth, "PERDEDOR DEL INFIERNO")}
        </div>
    </section>`;
}

function flowBannerMarkup(playerId, nextMatch, pendingLabel, stage) {
    const player = getPlayerById(playerId);
    const banner = getPlayerBanner(player);
    const ready = Boolean(player && nextMatch?.playerIds.every(id => id && getPlayerById(id)));
    const winner = Boolean(player && nextMatch?.winnerId === player.id);
    const champion = stage === "CAMPEÓN";
    const status = champion ? (player ? "VER PERFIL" : "ESPERANDO LA FINAL")
        : !player ? "POR DEFINIR" : winner ? (stage === "REVANCHA" ? "✓ CAMPEÓN" : stage === "FINAL" ? "✓ AVANZA A REVANCHA" : "✓ FINALISTA")
        : nextMatch?.winnerId ? "DERROTA" : ready ? `ELEGIR EN ${stage}` : "ESPERANDO RIVAL";
    return `<button type="button" class="flow-banner ${player ? "" : "is-pending"} ${winner ? "is-winner" : ""} ${champion && player ? "is-champion" : ""}"
        ${champion ? `data-bracket-champion="${escapeHTML(playerId || "")}" aria-label="${player ? `Abrir perfil de ${escapeHTML(player.name)}, campeón` : pendingLabel}"`
            : `data-match="${nextMatch?.id || ""}" data-winner="${escapeHTML(playerId || "")}" aria-pressed="${winner}" aria-label="Marcar victoria de ${escapeHTML(player?.name || pendingLabel)} en ${stage.toLowerCase()}"`}
        ${!(champion ? player : ready) ? "disabled" : ""}>
        <span class="flow-banner-art">${banner ? `<img src="${banner.image}" alt="" loading="lazy">` : `<span class="flow-banner-placeholder" aria-hidden="true">${player ? escapeHTML(player.name.trim().slice(0, 2).toUpperCase()) : "?"}</span>`}</span>
        <strong>${escapeHTML(player?.name || pendingLabel)}</strong><small>${status}</small>
    </button>`;
}

function loserBracketMarkup(module) {
    if (!module.loserMatches?.length) return "";
    const first = module.loserMatches[0];
    const second = module.loserMatches[1];
    const semiOne = module.loserMatches[2];
    const semiTwo = module.loserMatches[3];
    const final = module.loserMatches[4];
    const entry = (match, slot, label, column, row) => `<div class="hell-flow-node" style="grid-column:${column};grid-row:${row} / span 2"><span class="hell-flow-label">${label}</span>${flowBannerMarkup(match?.playerIds?.[slot], match, label, "INFIERNO")}</div>`;
    return `<section class="loser-bracket hell-composition" aria-labelledby="loserBracketTitle">
        <div class="loser-bracket-heading"><div><span class="eyebrow">SEGUNDA OPORTUNIDAD</span><h3 id="loserBracketTitle">BRACKET DEL INFIERNO</h3><p>Los perdedores de cuartos abren la llave; quienes caen en semifinales principales entran en la ronda siguiente. El campeón del Infierno sube a la final de revancha.</p></div><span class="status-pill">5 CRUCES</span></div>
        <div class="hell-flow-scroll" role="region" aria-label="Bracket del Infierno desplazable" tabindex="0">
            <div class="hell-flow-board">
                <span class="hell-flow-heading" style="grid-column:1"><small>01 / ENTRADA</small>PRIMERA RONDA</span>
                <span class="hell-flow-heading" style="grid-column:3"><small>02 / SUPERVIVIENTES</small>SEMIFINALES</span>
                <span class="hell-flow-heading" style="grid-column:5"><small>03 / ÚLTIMO CRUCE</small>FINAL DEL INFIERNO</span>
                ${entry(first, 0, "PERDEDOR DE CUARTOS 01", 1, 2)}
                ${entry(first, 1, "PERDEDOR DE CUARTOS 02", 1, 4)}
                ${entry(second, 0, "PERDEDOR DE CUARTOS 03", 1, 6)}
                ${entry(second, 1, "PERDEDOR DE CUARTOS 04", 1, 8)}
                ${entry(semiOne, 0, "SEMIFINAL DEL INFIERNO 01", 3, 3)}
                ${entry(semiOne, 1, "PERDEDOR DE SEMIFINAL 01", 3, 5)}
                ${entry(semiTwo, 0, "SEMIFINAL DEL INFIERNO 02", 3, 7)}
                ${entry(semiTwo, 1, "PERDEDOR DE SEMIFINAL 02", 3, 9)}
                <svg class="hell-flow-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M21 18 H29 V28 H39"/><path d="M21 38 H29 V28 H39"/><path d="M21 60 H29 V72 H39"/><path d="M21 80 H29 V72 H39"/><path d="M59 35 H68 V50 H78"/><path d="M59 77 H68 V50 H78"/></svg>
                <div class="hell-flow-final hell-flow-node" style="grid-column:5;grid-row:4 / span 6"><span class="hell-flow-label">FINAL DEL INFIERNO</span><div class="hell-final-players">${flowBannerMarkup(final?.playerIds?.[0], final, "Ganador del Infierno 01", "INFIERNO")}${flowBannerMarkup(final?.playerIds?.[1], final, "Ganador del Infierno 02", "INFIERNO")}</div></div>
            </div>
        </div>
        <p class="hell-flow-hint">El ganador aparece después en la final de revancha del bracket principal →</p>
    </section>`;
}

function renderBracket() {
    const state = getTournamentState();
    if (!state) return;
    syncBracketChampionTheme(state);
    const allMatches = getTournamentMatches(state);
    const playableMatches = allMatches.filter(match => match.playerIds?.every(Boolean));
    document.getElementById("tournamentProgress").textContent = `${getPlayers().length}/8 participantes · ${playableMatches.filter(match => match.winnerId).length}/${playableMatches.length} partidas resueltas`;
    const tabs = document.getElementById("bracketModuleTabs");
    tabs.innerHTML = TOURNAMENT_MODULES.map(module => {
        const progress = getModuleProgress(state.modules[module.id]);
        const active = state.currentModule === module.id;
        return `<button type="button" id="tab-${module.id}" role="tab" aria-controls="bracketModuleContent"
            aria-selected="${active}" tabindex="${active ? 0 : -1}" data-module="${module.id}" class="module-tab ${active ? "is-active" : ""}">
            <span>${module.label}</span><small>${module.enabled ? `${progress.completed}/${progress.total} partidas` : "PRÓXIMAMENTE"}</small>
        </button>`;
    }).join("");
    const definition = TOURNAMENT_MODULES.find(module => module.id === state.currentModule);
    const module = state.modules[definition.id];
    const content = document.getElementById("bracketModuleContent");
    content.setAttribute("aria-labelledby", `tab-${definition.id}`);
    if (!definition.enabled) {
        content.innerHTML = `<div class="extra-placeholder"><span class="eyebrow">EL SIGUIENTE CAPÍTULO</span>
            <span class="extra-symbol" aria-hidden="true">+</span><h3>MÓDULO EXTRA</h3><p>PRÓXIMAMENTE</p>
            <span class="muted">Una nueva fase. Las reglas se anunciarán más adelante.</span></div>`;
        return;
    }
    const roster = getPlayers();
    const progress = getModuleProgress(module);
    const used = new Set(module.matches.flatMap(match => match.playerIds).filter(Boolean));
    const available = roster.filter(player => !used.has(player.id));
    content.innerHTML = `<div class="module-heading"><div><span class="eyebrow">${definition.label}</span>
        <h3>${definition.title}</h3><p class="muted">Cruces independientes. Selecciona un jugador para registrar su victoria.</p></div>
        <span class="status-pill ${progress.complete ? "is-complete" : ""}">${progress.complete ? "COMPLETADO" : module.created ? "EN JUEGO" : "POR PREPARAR"}</span></div>
        <div class="module-progress"><div style="width:${progress.total ? progress.completed / progress.total * 100 : 0}%"></div></div>
        ${module.created ? `<div class="module-meta"><span>${progress.completed} de ${progress.total} partidas resueltas</span>
            <button type="button" class="text-button" data-prepare="${definition.id}">Volver a preparar cruces</button></div>` : ""}
        ${roster.length < 2 ? '<p class="empty-state">Registra al menos dos jugadores en la sección Jugadores.</p>' : !module.created ? `
            <div class="empty-state"><h4>Todo listo para empezar</h4><p>Prepara los cruces con los ${roster.length} jugadores registrados.
            Después puedes cambiar cada pareja desde sus selectores.</p>
            <button type="button" class="primary-button" data-prepare="${definition.id}">PREPARAR ENFRENTAMIENTOS</button></div>` : `
            ${available.length ? `<p class="pending-note">Por asignar: ${available.map(player => escapeHTML(player.name)).join(", ")}. Elige un espacio libre en los cruces.</p>` : ""}
            ${bracketTreeMarkup(module)}
            ${loserBracketMarkup(module)}
            <div class="module-winners"><span class="eyebrow">GANADORES DEL MÓDULO</span>
                <div class="winner-list">${module.matches.filter(match => match.winnerId).map(match => `<span class="winner-chip">✓ ${escapeHTML(getPlayerById(match.winnerId)?.name)}</span>`).join("") || '<span class="muted">Los ganadores aparecerán aquí.</span>'}</div></div>`}`;
}

document.getElementById("bracketModuleTabs").addEventListener("click", event => {
    const button = event.target.closest("[data-module]");
    if (!button) return;
    const next = getTournamentState();
    next.currentModule = button.dataset.module;
    saveTournamentState(next, "module");
    document.getElementById(`tab-${next.currentModule}`).focus({ preventScroll: true });
});
document.getElementById("bracketModuleTabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll("button")];
    const index = buttons.indexOf(event.target);
    const target = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[target].click();
});
document.getElementById("bracketModuleContent").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.bracketChampion) {
        const index = getPlayers().findIndex(player => player.id === button.dataset.bracketChampion);
        if (index >= 0) openPlayerModal(index);
        return;
    }
    const moduleId = getTournamentState().currentModule;
    if (button.dataset.prepare) createModuleMatches(moduleId);
    else if (button.dataset.clear) setMatchWinner(moduleId, button.dataset.clear, null);
    else if (button.dataset.winner) {
        setMatchWinner(moduleId, button.dataset.match, button.dataset.winner);
        document.getElementById("bracketMessage").textContent = "Resultado actualizado. Puedes corregirlo eligiendo al otro jugador o deshacerlo.";
    }
});
document.getElementById("bracketModuleContent").addEventListener("change", event => {
    const select = event.target.closest("select[data-match]");
    if (!select) return;
    const state = getTournamentState();
    const match = state.modules[state.currentModule].matches.find(item => item.id === select.dataset.match);
    if (match.winnerId && !confirm("Cambiar los participantes eliminará el resultado de este cruce. ¿Continuar?")) { renderBracket(); return; }
    setMatchParticipant(state.currentModule, match.id, Number(select.dataset.slot), select.value || null);
});
document.addEventListener("DOMContentLoaded", () => {
    const state = getTournamentState();
    if (syncBracketProgression(state)) saveTournamentState(state, "bracket-sync");
    renderBracket();
});
document.addEventListener("tournament:changed", event => {
    if (!["roulette", "roulette-reset", "randomizer"].includes(event.detail.reason)) renderBracket();
});
