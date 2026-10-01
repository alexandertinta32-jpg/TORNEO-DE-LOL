# Torneo LoL 1v1

Página estática para administrar un torneo personalizado de League of Legends. Se ejecuta directamente con Live Server y no necesita backend, framework ni base de datos externa.

## Cómo abrirla

Abre `index.html` con Live Server. La vista local de desarrollo usada durante esta fase es `http://127.0.0.1:8000/index.html`.

## Arquitectura

- `index.html` contiene las secciones Jugadores, Bracket, Clasificación, Ruleta y Randomizer.
- `css/style.css` conserva el tema gaming existente y añade los componentes de torneo y sus breakpoints responsive.
- `js/players.js` mantiene jugadores, perfiles, banners y `torneoLOL_players`.
- `js/tournament.js` es la fuente común del estado del torneo (`torneoLOL_tournament_v1`), normaliza datos antiguos y coordina eventos.
- `js/bracket.js` gestiona tres módulos, cruces editables y ganadores corregibles. Cada módulo enlaza cuartos, semifinales, final, revancha y un bracket del Infierno de cinco cruces: dos entradas desde cuartos, dos semifinales con los perdedores de la llave principal y una final; `MÓDULO EXTRA` queda como placeholder.
- El cuadro principal de los tres módulos usa una composición de doble llave: cuartos, semifinales, final del bracket principal, final de revancha contra el ganador del Infierno y tarjetas de posiciones 1.º–4.º. Los perdedores de cuartos alimentan el bracket del Infierno; el ganador de la revancha es campeón, el otro queda segundo, el perdedor de la final principal queda tercero y el perdedor del Infierno queda cuarto. En pantallas pequeñas, el cuadro permite desplazamiento horizontal.
- `js/standings.js` deriva PJ, PG, PP y puntos de los resultados vigentes; no acumula contadores, por lo que corregir un ganador no duplica estadísticas.
- `js/roulette.js` dibuja nombres desde los jugadores y guarda solamente el historial del sorteo. Al completar ocho selecciones muestra los ocho banners en orden, reproduce `assets/sounds/EEG.mp3` y permite cerrar la pantalla con CONTINUAR. No modifica el bracket automáticamente.
- `data/champions.js` contiene el catálogo local de 173 campeones de Data Dragon 16.19.1 (`es_MX`), sin descargar imágenes.
- `js/randomizer.js` admite sorteo individual por jugador y modo 1VS1. En individual, cada giro se guarda en el apartado del participante activo hasta un máximo de tres campeones, sin repetir dentro de su lista; en 1VS1 selecciona una categoría compartida (luchador, mago, asesino, tirador, soporte o tanque).

## Reglas provisionales

La configuración actual está centralizada en `TOURNAMENT_CONFIG`: victoria = 3 puntos y derrota = 0 puntos. La clasificación ordena por puntos, victorias y conserva el orden de registro como desempate estable hasta definir una regla adicional.

Los módulos no aplican eliminación ni pases automáticos: cada cruce se prepara y se edita manualmente. Un cruce con un solo participante no suma estadísticas. Reiniciar los brackets pide confirmación y borra resultados, cruces y progreso, conservando jugadores, perfiles, banners, ruleta y randomizer.

## Compatibilidad

Los identificadores se añaden de forma compatible a jugadores guardados previamente. Los nombres de archivos de banners respetan su capitalización real para funcionar en GitHub Pages. El catálogo de campeones se actualiza manualmente cuando cambie la versión de Data Dragon; la fecha y fuente están indicadas al inicio de `data/champions.js`.
