/* =========================================
   SISTEMA DE JUGADORES
========================================= */

const MAX_PLAYERS = 8;

const PLAYERS_STORAGE_KEY = "torneoLOL_players";
const SAVED_PLAYERS_STORAGE_KEY = "torneoLOL_saved_players_v1";
const CUSTOM_PLAYERS_STORAGE_KEY = "torneoLOL_custom_players_v1";
const SAVED_PLAYERS_MODE_KEY = "torneoLOL_saved_players_active_v1";


/* =========================================
   CARGAR JUGADORES GUARDADOS
========================================= */

let players = loadPlayers();
/* =========================================
   COMPLETAR DATOS DE JUGADORES ANTIGUOS
========================================= */

players = players.map(player => {

    return {

        ...player,
        // Campo adicional: las claves y los datos antiguos se conservan.
        id: player.id || createPlayerId(),

        name: player.name || "",

        summonerName:
            player.summonerName || "",

        lastRank:
            player.lastRank || "Sin registrar",

        rankSeason:
            player.rankSeason || "",

        mainChampion:
            player.mainChampion || "Sin registrar",

        champions:
            Array.isArray(player.champions)
                ? [
                    player.champions[0] || "",
                    player.champions[1] || "",
                    player.champions[2] || ""
                ]
                : ["", "", ""],

        primaryRole:
            player.primaryRole || "Sin registrar",

        secondaryRole:
            player.secondaryRole || "Sin registrar",

        server:
            player.server || "Sin registrar",

        description:
            player.description || "",

        banner:
            player.banner || "",

        theme:
            player.theme || "blue"

    };

});

// La primera carga conserva en una lista fija todos los perfiles ya guardados.
// La lista editable se mantiene aparte para poder alternar sin perder datos.
function readPlayerCollection(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return Array.isArray(value) ? value.filter(player => player && typeof player.name === "string") : null;
    } catch (error) {
        console.warn(`No se pudo leer ${key}:`, error);
        return null;
    }
}

function copyPlayerCollection(collection) {
    return collection.map(player => ({
        ...player,
        id: player.id || createPlayerId(),
        name: player.name || "",
        summonerName: player.summonerName || "",
        lastRank: player.lastRank || "Sin registrar",
        rankSeason: player.rankSeason || "",
        mainChampion: player.mainChampion || "Sin registrar",
        champions: Array.isArray(player.champions) ? [...player.champions] : ["", "", ""],
        primaryRole: player.primaryRole || "Sin registrar",
        secondaryRole: player.secondaryRole || "Sin registrar",
        server: player.server || "Sin registrar",
        description: player.description || "",
        banner: player.banner || "",
        theme: player.theme || "blue"
    }));
}

let savedRoster = readPlayerCollection(SAVED_PLAYERS_STORAGE_KEY);
let customRoster = readPlayerCollection(CUSTOM_PLAYERS_STORAGE_KEY);

if (!savedRoster) {
    const initialRoster = players.length ? players : ["Cafe", "Masa", "Meilin", "Richard", "Myles", "Chato", "Kevo", "Raquel"].map(name => ({ name }));
    savedRoster = copyPlayerCollection(initialRoster);
    writeStoredJSON(SAVED_PLAYERS_STORAGE_KEY, savedRoster);
}

if (!customRoster) {
    // El modo editable empieza limpio para que se puedan registrar otros jugadores.
    customRoster = [];
    writeStoredJSON(CUSTOM_PLAYERS_STORAGE_KEY, customRoster);
}

let savedRosterActive = localStorage.getItem(SAVED_PLAYERS_MODE_KEY) !== "false";
players = copyPlayerCollection(savedRosterActive ? savedRoster : customRoster);
localStorage.setItem(SAVED_PLAYERS_MODE_KEY, String(savedRosterActive));


savePlayers();


/* =========================================
   ELEMENTOS DEL HTML
========================================= */

const playerNameInput =
    document.getElementById("playerNameInput");

const addPlayerButton =
    document.getElementById("addPlayerButton");

const playersList =
    document.getElementById("playersList");

const playerCount =
    document.getElementById("playerCount");

const playerMessage =
    document.getElementById("playerMessage");

const savedRosterToggle = document.getElementById("savedRosterToggle");
const addPlayerArea = document.querySelector(".add-player-area");


/* =========================================
   PERFIL DEL JUGADOR
========================================= */

const playerModal =
    document.getElementById("playerModal");

const closePlayerModal =
    document.getElementById("closePlayerModal");

const modalPlayerName =
    document.getElementById("modalPlayerName");

const modalSummonerName =
    document.getElementById("modalSummonerName");

const modalLastRank =
    document.getElementById("modalLastRank");

const modalRankSeason =
    document.getElementById("modalRankSeason");

const modalMainChampion =
    document.getElementById("modalMainChampion");

const modalChampion1 =
    document.getElementById("modalChampion1");

const modalChampion2 =
    document.getElementById("modalChampion2");

const modalChampion3 =
    document.getElementById("modalChampion3");

const modalPrimaryRole =
    document.getElementById("modalPrimaryRole");

const modalSecondaryRole =
    document.getElementById("modalSecondaryRole");

const modalServer =
    document.getElementById("modalServer");

const modalDescription =
    document.getElementById("modalDescription");


let selectedPlayerIndex = null;
/* =========================================
   SONIDO DEL PERFIL
========================================= */

let currentPlayerSound = null;
function playPlayerBannerSound() {

    /* Detener sonido anterior */

    if (currentPlayerSound) {

        currentPlayerSound.pause();

        currentPlayerSound.currentTime = 0;

        currentPlayerSound = null;

    }


    /* Comprobar jugador */

    if (selectedPlayerIndex === null) return;


    const player =
        players[selectedPlayerIndex];


    if (!player || !player.banner) return;


    /* Buscar banner */

    const banner =
        BANNERS.find(
            (item) => item.id === player.banner
        );


    if (!banner || !banner.sound) return;


    /* Crear audio */

    currentPlayerSound =
        new Audio(banner.sound);


    /* Volumen */

    currentPlayerSound.volume = 0.5;


    /* Reproducir */

    currentPlayerSound.play().catch(
        (error) => {

            console.warn(
                "No se pudo reproducir el sonido:",
                error
            );

        }
    );

}
/* =========================================
   BANNER DEL JUGADOR
========================================= */

const selectedPlayerBanner =
    document.getElementById("selectedPlayerBanner");

const noBannerMessage =
    document.getElementById("noBannerMessage");

const changeBannerButton =
    document.getElementById("changeBannerButton");

const bannerSelector =
    document.getElementById("bannerSelector");

const closeBannerSelector =
    document.getElementById("closeBannerSelector");

const bannerGrid =
    document.getElementById("bannerGrid");

const backBannerButton =
    document.getElementById("backBannerButton");

/* =========================================
   GENERAR SELECTOR DE BANNERS
========================================= */

function renderBannerSelector() {

    bannerGrid.innerHTML = "";

    BANNERS.forEach((banner) => {

        const bannerCard = document.createElement("button");

        bannerCard.type = "button";

        bannerCard.className = "banner-option";

        bannerCard.dataset.bannerId = banner.id;


        bannerCard.innerHTML = `
            <img
                src="${banner.image}"
                alt="${banner.name}"
            >

            <span>
                ${banner.name}
            </span>
        `;


        bannerGrid.appendChild(bannerCard);

    });

}


/* =========================================
   SELECCIONAR BANNER
========================================= */

bannerGrid.addEventListener("click", (event) => {

    if (savedRosterActive) return;

    const bannerOption =
        event.target.closest(".banner-option");

    if (!bannerOption) return;


    const bannerId =
        bannerOption.dataset.bannerId;


    if (selectedPlayerIndex === null) return;


   const selectedBanner =
    BANNERS.find(
        (banner) => banner.id === bannerId
    );


if (!selectedBanner) return;


players[selectedPlayerIndex].banner =
    selectedBanner.id;


players[selectedPlayerIndex].theme =
    selectedBanner.theme;


    savePlayers();


    renderPlayers();


    updateSelectedPlayerBanner();


    bannerSelector.classList.remove("active");

});


/* =========================================
   ACTUALIZAR BANNER DEL JUGADOR
========================================= */

function updateSelectedPlayerBanner() {

    if (selectedPlayerIndex === null) return;


    const player =
        players[selectedPlayerIndex];


    if (!player.banner) {

        selectedPlayerBanner.src = "";

        selectedPlayerBanner.style.display = "none";

        noBannerMessage.style.display = "block";

        return;

    }


    const banner =
        BANNERS.find(
            (item) => item.id === player.banner
        );


    if (!banner) {

        selectedPlayerBanner.src = "";

        selectedPlayerBanner.style.display = "none";

        noBannerMessage.style.display = "block";

        return;

    }


    selectedPlayerBanner.src =
        banner.image;

    selectedPlayerBanner.alt =
        banner.name;


    selectedPlayerBanner.style.display =
        "block";

    noBannerMessage.style.display =
        "none";

}


/* =========================================
   ABRIR SELECTOR DE BANNERS
========================================= */

changeBannerButton.addEventListener("click", () => {

    if (savedRosterActive) return;

    renderBannerSelector();

    bannerSelector.classList.add("active");

});


/* =========================================
   CERRAR SELECTOR DE BANNERS
========================================= */

closeBannerSelector.addEventListener("click", () => {

    bannerSelector.classList.remove("active");

});


backBannerButton.addEventListener("click", () => {

    bannerSelector.classList.remove("active");

});

/* =========================================
   BANNERS DISPONIBLES
========================================= */

const BANNERS = [

    {
        id: "cafe",
        name: "Cafe",
        image: "assets/banners/Cafe.png",
        theme: "cafe",
        sound: "assets/sounds/cafe.mp3"
    },

    {
        id: "raquel",
        name: "Raquel",
        image: "assets/banners/Raquel.png",
        theme: "raquel",
        sound: "assets/sounds/raquel.mp3"
    },

    {
        id: "nexxel",
        name: "Nexxel",
        image: "assets/banners/Nexxel.png",
        theme: "nexxel",
        sound: null
    },

    {
        id: "chato",
        name: "Chato",
        image: "assets/banners/Chato.png",
        theme: "chato",
        sound: "assets/sounds/chato.mp3"
    },

    {
        id: "masa",
        name: "Masa",
        image: "assets/banners/Masa.png",
        theme: "masa",
        sound: "assets/sounds/masa.mp3"
    },

    {
        id: "myles",
        name: "Myles",
        image: "assets/banners/Myles.png",
        theme: "myles",
        sound: "assets/sounds/miles.mp3"
    },

    {
        id: "meilin",
        name: "Meilin",
        image: "assets/banners/Meilin.png",
        theme: "meilin",
        sound: "assets/sounds/meilin.mp3"
    },

    {
        id: "evan",
        name: "Evan",
        image: "assets/banners/Evan.png",
        theme: "evan",
        sound: "assets/sounds/evan.mp3"
    },

    {
        id: "richard",
        name: "Richard",
        image: "assets/banners/Richard.png",
        theme: "richard",
        sound: "assets/sounds/richard.mp3"
    }

];
/* =========================================
   CARGAR DESDE LOCALSTORAGE
========================================= */

function loadPlayers() {

    try {

        const savedPlayers =
            localStorage.getItem(
                PLAYERS_STORAGE_KEY
            );


        if (!savedPlayers) {

            return [];

        }


        const parsedPlayers =
            JSON.parse(savedPlayers);


        if (!Array.isArray(parsedPlayers)) {

            return [];

        }


        return parsedPlayers.filter(player => player && typeof player.name === "string");

    } catch (error) {

        console.error(
            "Error al cargar los jugadores:",
            error
        );

        return [];

    }

}


/* =========================================
   GUARDAR JUGADORES
========================================= */

function savePlayers() {
    const persisted = writeStoredJSON(PLAYERS_STORAGE_KEY, players);
    if (!savedRosterActive) {
        customRoster = copyPlayerCollection(players);
        writeStoredJSON(CUSTOM_PLAYERS_STORAGE_KEY, customRoster);
    }
    document.dispatchEvent(new CustomEvent("players:changed"));
    return persisted;
}

function syncSavedRosterControls() {
    if (savedRosterToggle) {
        savedRosterToggle.textContent = savedRosterActive ? "JUGADORES GUARDADOS ✓" : "MIS JUGADORES";
        savedRosterToggle.setAttribute("aria-pressed", String(savedRosterActive));
        savedRosterToggle.classList.toggle("is-active", savedRosterActive);
        savedRosterToggle.title = savedRosterActive
            ? "Lista fija activa. Pulsa para usar tus jugadores editables."
            : "Modo editable activo. Pulsa para volver a la lista guardada.";
    }
    if (addPlayerArea) addPlayerArea.hidden = savedRosterActive;

    const editProfileButton = document.getElementById("editProfileButton");
    const deletePlayerButton = document.getElementById("deletePlayerButton");
    if (editProfileButton) editProfileButton.hidden = savedRosterActive;
    if (deletePlayerButton) deletePlayerButton.hidden = savedRosterActive;
    if (changeBannerButton) changeBannerButton.hidden = savedRosterActive;
}

function toggleSavedRoster() {
    if (savedRosterActive) {
        customRoster = readPlayerCollection(CUSTOM_PLAYERS_STORAGE_KEY) || [];
        savedRosterActive = false;
        players = copyPlayerCollection(customRoster);
    } else {
        customRoster = copyPlayerCollection(players);
        writeStoredJSON(CUSTOM_PLAYERS_STORAGE_KEY, customRoster);
        savedRosterActive = true;
        players = copyPlayerCollection(savedRoster);
    }

    localStorage.setItem(SAVED_PLAYERS_MODE_KEY, String(savedRosterActive));
    savePlayers();
    syncSavedRosterControls();
    renderPlayers();
    if (playerModal?.classList.contains("active")) closeModal();
}

function createPlayerId() {
    return crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Única fuente de participantes para todos los módulos. Devolver copias.
function getPlayers() {
    return players.map(player => ({ ...player, champions: [...player.champions] }));
}

function getPlayerById(id) {
    return getPlayers().find(player => player.id === id) || null;
}

function getPlayerBanner(player) {
    return BANNERS.find(banner => banner.id === player?.banner) || null;
}


/* =========================================
   MOSTRAR MENSAJE
========================================= */

function showPlayerMessage(message) {

    if (!playerMessage) return;

    playerMessage.textContent = message;

    playerMessage.classList.add("show");

}


/* =========================================
   OCULTAR MENSAJE
========================================= */

function hidePlayerMessage() {

    if (!playerMessage) return;

    playerMessage.textContent = "";

    playerMessage.classList.remove("show");

}


/* =========================================
   MOSTRAR JUGADORES
========================================= */

function renderPlayers() {

    if (!playerCount || !playersList) return;

    syncSavedRosterControls();


    playerCount.textContent =
        players.length;


    playersList.innerHTML = "";


    /* -------------------------------------
       SIN JUGADORES
    ------------------------------------- */

    if (players.length === 0) {

        playersList.innerHTML = `
            <div class="players-empty">

                <strong>
                    NO HAY JUGADORES
                </strong>

                <span>
                    Agrega los participantes del torneo.
                </span>

            </div>
        `;

        return;
    }


    /* -------------------------------------
       CREAR TARJETAS
    ------------------------------------- */

    players.forEach((player, index) => {

        const playerCard =
            document.createElement("div");


        playerCard.classList.add(
            "player-card"
        );


        playerCard.innerHTML = `

            <div class="player-number">
                ${index + 1}
            </div>

            <div class="player-info">

                <div class="player-name">
                    ${escapeHTML(player.name)}
                </div>

            </div>

            ${savedRosterActive ? "" : `<button
                class="edit-player-button"
                title="Editar jugador"
                data-index="${index}"
                type="button"
            >
                ✎
            </button>`}

        `;


        /* ---------------------------------
           CLIC EN TARJETA
        --------------------------------- */

        playerCard.addEventListener(
            "click",
            (event) => {

                if (event.target.closest("input, button")) return;

                openPlayerModal(index);

            }
        );


        /* ---------------------------------
           BOTÓN EDITAR
        --------------------------------- */

        const editButton =
            playerCard.querySelector(
                ".edit-player-button"
            );


        editButton?.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                startEditingPlayer(
                    index,
                    playerCard
                );

            }
        );


        playersList.appendChild(
            playerCard
        );

    });

}


/* =========================================
   EDITAR NOMBRE DIRECTAMENTE
========================================= */

function startEditingPlayer(
    index,
    playerCard
) {

    if (savedRosterActive) return;

    const player = players[index];

    if (!player) return;


    const playerInfo =
        playerCard.querySelector(
            ".player-info"
        );


    const editButton =
        playerCard.querySelector(
            ".edit-player-button"
        );


    /* -------------------------------------
       EVITAR EDITAR DOS VECES
    ------------------------------------- */

    if (
        playerCard.classList.contains(
            "editing"
        )
    ) {

        return;

    }


    playerCard.classList.add(
        "editing"
    );


    /* -------------------------------------
       INPUT
    ------------------------------------- */

    playerInfo.innerHTML = `

        <input
            type="text"
            class="edit-player-input"
            value="${escapeHTML(player.name)}"
            maxlength="20"
            autocomplete="off"
        >

    `;


    editButton.innerHTML = "✓";

    editButton.title =
        "Guardar nombre";


    const input =
        playerInfo.querySelector(
            ".edit-player-input"
        );


    input.focus();

    input.select();


    /* -------------------------------------
       GUARDAR
    ------------------------------------- */

    function saveEdit() {

        const newName =
            input.value.trim();


        if (newName === "") {

            showPlayerMessage(
                "El nombre no puede estar vacío."
            );

            input.focus();

            return;

        }


        /* ---------------------------------
           DUPLICADOS
        --------------------------------- */

        const alreadyExists =
            players.some(
                (
                    otherPlayer,
                    otherIndex
                ) =>

                    otherIndex !== index &&

                    otherPlayer.name
                        .toLowerCase() ===
                    newName.toLowerCase()
            );


        if (alreadyExists) {

            showPlayerMessage(
                "Ese nombre ya pertenece a otro jugador."
            );

            input.focus();

            return;

        }


        /* ---------------------------------
           GUARDAR
        --------------------------------- */

        player.name =
            newName;


        savePlayers();

        hidePlayerMessage();

        renderPlayers();

    }


    /* -------------------------------------
       ENTER
    ------------------------------------- */

    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                saveEdit();

            }


            if (
                event.key === "Escape"
            ) {

                event.preventDefault();

                hidePlayerMessage();

                renderPlayers();

            }

        }
    );


    /* -------------------------------------
       CLIC CHECK
    ------------------------------------- */

    editButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            saveEdit();

        }
    );


    /* -------------------------------------
       ESCRIBIR
    ------------------------------------- */

    input.addEventListener(
        "input",
        () => {

            hidePlayerMessage();

        }
    );

}


/* =========================================
   AGREGAR JUGADOR
========================================= */

function addPlayer() {

    if (savedRosterActive) return;

    const name =
        playerNameInput.value.trim();


    hidePlayerMessage();


    /* -------------------------------------
       VACÍO
    ------------------------------------- */

    if (name === "") {

        showPlayerMessage(
            "Escribe el nombre del jugador."
        );

        playerNameInput.focus();

        return;

    }


    /* -------------------------------------
       MÁXIMO
    ------------------------------------- */

    if (
        players.length >= MAX_PLAYERS
    ) {

        showPlayerMessage(
            "No se puede agregar más de 8 jugadores."
        );

        playerNameInput.focus();

        return;

    }


    /* -------------------------------------
       DUPLICADO
    ------------------------------------- */

    const alreadyExists =
        players.some(
            player =>
                player.name
                    .toLowerCase() ===
                name.toLowerCase()
        );


    if (alreadyExists) {

        showPlayerMessage(
            "Ese jugador ya está registrado."
        );

        playerNameInput.focus();

        return;

    }


    /* -------------------------------------
       NUEVO JUGADOR
    ------------------------------------- */

    const newPlayer = {

    /* ==============================
       IDENTIDAD
    ============================== */

    name: name,

    id: createPlayerId(),

    summonerName: "",


    /* ==============================
       RANGO
    ============================== */

    lastRank: "Sin registrar",

    rankSeason: "",


    /* ==============================
       CAMPEONES
    ============================== */

    mainChampion: "Sin registrar",

    champions: [
        "",
        "",
        ""
    ],


    /* ==============================
       ROLES
    ============================== */

    primaryRole: "Sin registrar",

    secondaryRole: "Sin registrar",


    /* ==============================
       SERVIDOR
    ============================== */

    server: "Sin registrar",


    /* ==============================
       DESCRIPCIÓN
    ============================== */

    description: "",


    /* ==============================
       BANNER
    ============================== */

    banner: "",


    /* ==============================
       TEMA VISUAL
    ============================== */

    theme: "blue"

    };


    players.push(
        newPlayer
    );


    savePlayers();


    playerNameInput.value = "";


    hidePlayerMessage();


    renderPlayers();


    playerNameInput.focus();

}


/* =========================================
   ABRIR PERFIL
========================================= */

function openPlayerModal(index) {

    const player =
        players[index];


    if (!player) return;

    if (!playerModal) return;


    selectedPlayerIndex =
        index;
playPlayerBannerSound();
/* -------------------------------------
   TEMA VISUAL
------------------------------------- */

const themeClassPrefix = "player-theme-";

/* Limpiar temas anteriores */

playerModal.classList.forEach((className) => {

    if (className.startsWith(themeClassPrefix)) {

        playerModal.classList.remove(className);

    }

});


/* Aplicar tema actual */

if (player.theme) {

    playerModal.classList.add(
        `${themeClassPrefix}${player.theme}`
    );

}

/* -------------------------------------
   BANNER
------------------------------------- */

updateSelectedPlayerBanner();


    /* -------------------------------------
       NOMBRE
    ------------------------------------- */

    if (modalPlayerName) {

        modalPlayerName.textContent =
            player.name;

    }


    /* -------------------------------------
       INVOCADOR
    ------------------------------------- */

    if (modalSummonerName) {

        modalSummonerName.textContent =
            player.summonerName ||
            "Sin registrar";

    }


    /* -------------------------------------
       RANGO
    ------------------------------------- */

    if (modalLastRank) {

        modalLastRank.textContent =
            player.lastRank ||
            "Sin registrar";

    }


    /* -------------------------------------
       TEMPORADA
    ------------------------------------- */

    if (modalRankSeason) {

        modalRankSeason.textContent =
            player.rankSeason ||
            "—";

    }


    /* -------------------------------------
       MAIN
    ------------------------------------- */

    if (modalMainChampion) {

        modalMainChampion.textContent =
            player.mainChampion ||
            "Sin registrar";

    }


    /* -------------------------------------
       CAMPEONES
    ------------------------------------- */

    const champions =
        Array.isArray(
            player.champions
        )
            ? player.champions
            : ["", "", ""];


    if (modalChampion1) {

        modalChampion1.textContent =
            champions[0] ||
            "Sin registrar";

    }


    if (modalChampion2) {

        modalChampion2.textContent =
            champions[1] ||
            "Sin registrar";

    }


    if (modalChampion3) {

        modalChampion3.textContent =
            champions[2] ||
            "Sin registrar";

    }


    /* -------------------------------------
       ROLES
    ------------------------------------- */

    if (modalPrimaryRole) {

        modalPrimaryRole.textContent =
            player.primaryRole ||
            "Sin registrar";

    }


    if (modalSecondaryRole) {

        modalSecondaryRole.textContent =
            player.secondaryRole ||
            "Sin registrar";

    }


    /* -------------------------------------
       SERVIDOR
    ------------------------------------- */

    if (modalServer) {

        modalServer.textContent =
            player.server ||
            "Sin registrar";

    }


    /* -------------------------------------
       DESCRIPCIÓN
    ------------------------------------- */

    if (modalDescription) {

        modalDescription.textContent =
            player.description ||
            "Sin descripción.";

    }


    /* -------------------------------------
       ABRIR
    ------------------------------------- */

    playerModal.classList.add(
        "active"
    );

    document.getElementById("playerProfileForm").hidden = true;
    document.getElementById("editProfileButton").textContent = "EDITAR PERFIL";


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================
   CERRAR PERFIL
========================================= */

function closeModal() {

    if (!playerModal) return;


    /* Detener sonido */

    if (currentPlayerSound) {

        currentPlayerSound.pause();

        currentPlayerSound.currentTime = 0;

        currentPlayerSound = null;

    }


    playerModal.classList.remove(
        "active"
    );

    bannerSelector.classList.remove("active");


    document.body.classList.remove(
        "modal-open"
    );


    selectedPlayerIndex =
        null;


}


/* =========================================
   BOTÓN CERRAR
========================================= */

if (closePlayerModal) {

    closePlayerModal.addEventListener(
        "click",
        closeModal
    );

}


/* =========================================
   CLIC FUERA DEL PERFIL
========================================= */

if (playerModal) {

    playerModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                playerModal
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================
   ESC
========================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            playerModal &&
            playerModal.classList.contains(
                "active"
            )
        ) {

            closeModal();

        }

    }
);


/* =========================================
   BOTÓN AGREGAR
========================================= */

if (addPlayerButton) {

    addPlayerButton.addEventListener(
        "click",
        addPlayer
    );

}

if (savedRosterToggle) {
    savedRosterToggle.addEventListener("click", toggleSavedRoster);
}


/* =========================================
   ENTER PARA AGREGAR
========================================= */

if (playerNameInput) {

    playerNameInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                addPlayer();

            }

        }
    );


    playerNameInput.addEventListener(
        "input",
        () => {

            hidePlayerMessage();

        }
    );

}


/* =========================================
   INICIALIZAR
========================================= */

renderPlayers();

/* =========================================
   EDICIÓN DEL PERFIL EXISTENTE
========================================= */
const PROFILE_FIELDS = [
    ["summonerName", "Nombre de invocador", 50], ["lastRank", "Último rango", 40],
    ["rankSeason", "Temporada", 30], ["mainChampion", "Main", 40],
    ["champion1", "Campeón 1", 40], ["champion2", "Campeón 2", 40], ["champion3", "Campeón 3", 40],
    ["primaryRole", "Rol principal", 30], ["secondaryRole", "Rol secundario", 30],
    ["server", "Servidor", 30], ["description", "Descripción", 600]
];
const profileForm = document.getElementById("playerProfileForm");
profileForm.innerHTML = `<div class="profile-edit-grid">${PROFILE_FIELDS.map(([key, label, max]) => `
    <label>${label}${key === "description"
        ? `<textarea name="${key}" maxlength="${max}" rows="3"></textarea>`
        : `<input name="${key}" maxlength="${max}" autocomplete="off">`}</label>`).join("")}</div>
    <div class="profile-edit-actions"><button type="submit" class="primary-button">GUARDAR PERFIL</button>
    <button type="button" class="secondary-button" id="cancelProfileEdit">CANCELAR</button></div>`;

document.getElementById("editProfileButton").addEventListener("click", () => {
    if (savedRosterActive) return;
    const player = players[selectedPlayerIndex];
    if (!player) return;
    profileForm.hidden = !profileForm.hidden;
    document.getElementById("editProfileButton").textContent = profileForm.hidden ? "EDITAR PERFIL" : "CERRAR EDICIÓN";
    if (profileForm.hidden) return;
    PROFILE_FIELDS.forEach(([key]) => {
        profileForm.elements[key].value = key.startsWith("champion")
            ? player.champions[Number(key.slice(-1)) - 1] || "" : player[key] || "";
    });
    profileForm.elements.summonerName.focus();
});
document.getElementById("cancelProfileEdit").addEventListener("click", () => {
    profileForm.hidden = true;
    document.getElementById("editProfileButton").textContent = "EDITAR PERFIL";
});
profileForm.addEventListener("submit", event => {
    event.preventDefault();
    if (savedRosterActive) return;
    const player = players[selectedPlayerIndex];
    if (!player) return;
    PROFILE_FIELDS.forEach(([key, , max]) => {
        const value = profileForm.elements[key].value.trim().slice(0, max);
        if (key.startsWith("champion")) player.champions[Number(key.slice(-1)) - 1] = value;
        else player[key] = value;
    });
    const persisted = savePlayers();
    openPlayerModal(selectedPlayerIndex);
    if (persisted) announce("Perfil guardado.");
});
document.getElementById("deletePlayerButton").addEventListener("click", () => {
    if (savedRosterActive) return;
    const player = players[selectedPlayerIndex];
    if (!player || !confirm(`¿Eliminar a ${player.name}? Sus enfrentamientos quedarán pendientes y sus resultados dejarán de contar.`)) return;
    players.splice(selectedPlayerIndex, 1);
    closeModal();
    savePlayers();
    renderPlayers();
});
