# Torneo LoL 1v1

Página estática para administrar un torneo personalizado de League of Legends. Se ejecuta directamente con Live Server y no necesita backend, framework ni base de datos externa.

## Cómo abrirla

Abre `index.html` con Live Server. La vista local de desarrollo usada durante esta fase es `http://127.0.0.1:8000/index.html`.

## Arquitectura

- `index.html` contiene las secciones Jugadores, Bracket, Clasificación, Ruleta y Randomizer.
- `css/style.css` conserva el tema gaming existente y añade los componentes de torneo y sus breakpoints responsive.
- `js/players.js` mantiene jugadores, perfiles, banners y `torneoLOL_players`.
- `js/tournament.js` es la fuente común del estado del torneo (`torneoLOL_tournament_v1`), normaliza datos antiguos y coordina eventos.
- `js/bracket.js` gestiona tres módulos, cruces editables y ganadores corregibles. Cada módulo enlaza cuartos, semifinales, final y un bracket del infierno exclusivo para los cuatro perdedores de cuartos; `MÓDULO EXTRA` queda como placeholder.
- El cuadro principal de los tres módulos avanza de izquierda a derecha: cuatro tarjetas de cuartos, cuatro banners seleccionables para semifinales, dos banners seleccionables para la final y el banner del campeón con acceso a su perfil. Las líneas siguen cada cruce y el tercer puesto se disputa debajo del cuadro. En pantallas pequeñas, el cuadro permite desplazamiento horizontal. El diseño del bracket del infierno se conserva.
- `js/standings.js` deriva PJ, PG, PP y puntos de los resultados vigentes; no acumula contadores, por lo que corregir un ganador no duplica estadísticas.
- `js/roulette.js` dibuja nombres desde los jugadores y guarda solamente el historial del sorteo. Al completar ocho selecciones muestra los ocho banners en orden, reproduce `assets/sounds/EEG.mp3` y permite cerrar la pantalla con CONTINUAR. No modifica el bracket automáticamente.
- `data/champions.js` contiene el catálogo local de 173 campeones de Data Dragon 16.19.1 (`es_MX`), sin descargar imágenes.
- `js/randomizer.js` admite sorteo individual y modo 1VS1 sin repetir campeón. En 1VS1 selecciona una categoría compartida (luchador, mago, asesino, tirador, soporte o tanque) y reserva el contenedor para imágenes futuras.

## Reglas provisionales

La configuración actual está centralizada en `TOURNAMENT_CONFIG`: victoria = 3 puntos y derrota = 0 puntos. La clasificación ordena por puntos, victorias y conserva el orden de registro como desempate estable hasta definir una regla adicional.

Los módulos no aplican eliminación ni pases automáticos: cada cruce se prepara y se edita manualmente. Un cruce con un solo participante no suma estadísticas. Reiniciar el torneo pide confirmación y borra resultados, cruces, progreso e historial de ruleta, conservando jugadores, perfiles y banners.

## Compatibilidad

Los identificadores se añaden de forma compatible a jugadores guardados previamente. Los nombres de archivos de banners respetan su capitalización real para funcionar en GitHub Pages. El catálogo de campeones se actualiza manualmente cuando cambie la versión de Data Dragon; la fecha y fuente están indicadas al inicio de `data/champions.js`.
