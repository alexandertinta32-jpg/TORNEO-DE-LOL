/* Catálogo local de Riot Data Dragon, es_MX. Sin peticiones ni imágenes en tiempo de ejecución.
   Fuente: https://ddragon.leagueoflegends.com/cdn/16.19.1/data/es_MX/champion.json
   Actualizar esta lista y los metadatos juntos cuando se publique un campeón. */
const CHAMPION_CATALOG = Object.freeze({ version: "16.19.1", checkedAt: "2026-09-29", locale: "es_MX" });
const LOL_CHAMPIONS = Object.freeze([
    "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie", "Aphelios",
    "Ashe", "Aurelion Sol", "Aurora", "Azir", "Bardo", "Bel'Veth", "Blitzcrank", "Brand", "Braum", "Briar",
    "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana", "Dr. Mundo", "Draven",
    "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz", "Galio", "Gangplank", "Garen",
    "Gnar", "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger", "Hwei", "Illaoi", "Irelia", "Ivern",
    "Janna", "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx", "K'Sante", "Kai'Sa", "Kalista", "Karma",
    "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw",
    "LeBlanc", "Lee Sin", "Leona", "Lillia", "Lissandra", "Locke", "Lucian", "Lulu", "Lux", "Maestro Yi",
    "Malphite", "Malzahar", "Maokai", "Mel", "Milio", "Miss Fortune", "Mordekaiser", "Morgana", "Naafiri",
    "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu y Willump", "Olaf",
    "Orianna", "Ornn", "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai",
    "Rell", "Renata Glasc", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna",
    "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder",
    "Sona", "Soraka", "Swain", "Sylas", "Syndra", "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo",
    "Thresh", "Tristana", "Trundle", "Tryndamere", "Twisted Fate", "Twitch", "Udyr", "Urgot", "Varus",
    "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", "Volibear", "Warwick",
    "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo", "Yone", "Yorick", "Yunara", "Yuumi", "Zaahen",
    "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"
]);

/* Rol principal para el 1VS1 balanceado. Los campeones híbridos se agrupan
   con una etiqueta estable para que el motor pueda ampliarse después. */
const CHAMPION_ROLE_POOLS = Object.freeze({
    luchador: ["Aatrox", "Ambessa", "Bel'Veth", "Briar", "Camille", "Darius", "Diana", "Dr. Mundo", "Fiora", "Garen", "Gnar", "Gragas", "Hecarim", "Illaoi", "Irelia", "Jarvan IV", "Jax", "Jayce", "K'Sante", "Kayn", "Kled", "Lee Sin", "Mordekaiser", "Nasus", "Olaf", "Pantheon", "Renekton", "Rengar", "Riven", "Sett", "Shyvana", "Sion", "Skarner", "Trundle", "Tryndamere", "Udyr", "Urgot", "Vi", "Viego", "Volibear", "Warwick", "Wukong", "Xin Zhao", "Yasuo", "Yone", "Yorick", "Zaahen"],
    mago: ["Anivia", "Annie", "Aurelion Sol", "Aurora", "Azir", "Brand", "Cassiopeia", "Heimerdinger", "Hwei", "Karthus", "Lissandra", "Lux", "Malzahar", "Neeko", "Orianna", "Ryze", "Seraphine", "Swain", "Syndra", "Taliyah", "Twisted Fate", "Veigar", "Vel'Koz", "Vex", "Viktor", "Vladimir", "Xerath", "Ziggs", "Zoe", "Zyra"],
    asesino: ["Akali", "Akshan", "Ekko", "Evelynn", "Fizz", "Kassadin", "Katarina", "Kha'Zix", "LeBlanc", "Naafiri", "Nocturne", "Qiyana", "Shaco", "Talon", "Zed"],
    tirador: ["Aphelios", "Ashe", "Caitlyn", "Corki", "Draven", "Ezreal", "Graves", "Jhin", "Jinx", "Kai'Sa", "Kalista", "Kindred", "Lucian", "Miss Fortune", "Nilah", "Quinn", "Samira", "Senna", "Sivir", "Smolder", "Tristana", "Twitch", "Varus", "Vayne", "Xayah", "Zeri"],
    soporte: ["Bardo", "Braum", "Janna", "Karma", "Leona", "Lulu", "Milio", "Nami", "Nautilus", "Pyke", "Rakan", "Rell", "Renata Glasc", "Sona", "Soraka", "Taric", "Thresh", "Yuumi"],
    tanque: ["Alistar", "Amumu", "Blitzcrank", "Cho'Gath", "Galio", "Malphite", "Maokai", "Ornn", "Poppy", "Rammus", "Sejuani", "Shen", "Tahm Kench", "Zac"]
});
const LOL_CHAMPION_ROLES = Object.freeze(Object.fromEntries(Object.entries(CHAMPION_ROLE_POOLS).flatMap(([role, names]) => names.map(name => [name, role]))));
function getChampionRole(name) { return LOL_CHAMPION_ROLES[name] || "versátil"; }
