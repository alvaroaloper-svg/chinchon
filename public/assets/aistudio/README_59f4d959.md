# Chinchón online

Servidor Node.js **sin dependencias** (HTTP + WebSocket propio) que sirve el cliente y valida toda la partida.
El navegador solo recibe su mano; las manos ajenas se envían únicamente al cerrar la ronda.

## Local
1. Instala Node 18+ (nodejs.org).
2. `cd chinchon && node server.js` y abre http://localhost:3000
3. Prueba en red local: abre `http://IP-de-tu-PC:3000` desde otros dispositivos.
4. Test automático del servidor: con el servidor en marcha, `node test.js`.

## Publicar en Internet (Render, gratis)
1. Sube la carpeta a un repositorio de GitHub.
2. render.com → New → Web Service → elige el repo. Runtime: Node. Build: vacío. Start: `node server.js`.
3. Render te da una URL https; los WebSockets (wss) funcionan sin configurar nada. Railway, Fly.io o cualquier VPS con Node valen igual.
   (En el plan gratuito el servicio se duerme tras un rato; la primera carga tarda ~30 s.)

## Cómo jugar
1. Escribe tu nombre y pulsa **Crear partida**. 2. Copia el código y envíaselo a tus amigos.
3. Ellos escriben nombre + código y **Unirse**. 4. El creador ajusta reglas y pulsa **Empezar** (2–4 jugadores).
Si alguien recarga o pierde la conexión, vuelve solo a su sitio (token guardado en el navegador). Un jugador desconectado juega automáticamente tras 10 s para no bloquear la mesa.

## Reglas
Básicas (fijas): 40 cartas, 7 por jugador, robar y descartar, grupos y escaleras, no descartar la carta recién cogida del descarte, Chinchón = escalera de 7.
Configurables: límite 50/70/100 (se elimina al superarlo), cierre con 0–5 puntos sueltos (por defecto 5), Chinchón gana la partida o rivales +50, −10 al cerrar con 0, temporizador 30/60 s.

## Lista de pruebas manuales
- **2 jugadores:** crear, unirse, copiar código, empezar; robar/descartar; intentar actuar fuera de turno (rechazado).
- **3 y 4 jugadores:** el 5.º intento de unirse da «partida llena»; código erróneo da «no existe»; turnos rotan en orden.
- **Reconexión:** recarga la página en pleno turno; mismo sitio y misma mano. Cierra una pestaña: aparece «desconectado» y a los 10 s se juega solo.
- **Cierre:** con la mano 2-2-2 + 3-4-5 del mismo palo, el botón «Cerrar» se activa; con puntos por encima del máximo, no.
- **Puntos:** as 1, 2–7 valor, figuras 10; el resumen muestra combinaciones y sueltos; −10 con 0 puntos.
- **Chinchón:** 7 cartas consecutivas de un palo (p. ej. 1–7 de copas) → fin según la opción elegida.
- **Eliminación:** al superar el límite se marca eliminado; queda uno (o hay Chinchón) → pantalla final y «Jugar otra vez».

## Límites conocidos
Las salas viven en memoria: si el servidor se reinicia, se pierden. Las partidas no tienen modo «número fijo de rondas» (solo eliminación) ni comodines.
