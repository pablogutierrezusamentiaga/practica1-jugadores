# Práctica 1 — Foundations API: Jugadores del Racing

## Integrantes y tema

- Pablo Gutiérrez Usamentiaga
- **Tema:** Racing de Santander (el de los laboratorios del bloque I).
- **Recurso:** `jugadores`, la plantilla del club.

## Instalación y uso

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

La aplicación queda en http://localhost:3000. La página y la API comparten origen.

No hay suite de pruebas automatizadas (la ampliación con Jest y Supertest es opcional y no se ha incluido), por lo que no existe `npm test`.

## Estructura

```
src/
  app.js                       construye y exporta la app
  server.js                    arranca el servidor
  middleware/logger.js         registra cada petición
  routes/jugadores.js          rutas ligeras
  controllers/jugadoresController.js   lógica HTTP
  data/store.js                almacenamiento en memoria (módulo sustituible)
  validators/jugadoresValidator.js     validación
public/                        cliente web (HTML, CSS y JavaScript vanilla)
AI/                            componente de IA agéntica
```

El controlador nunca accede al array de datos: siempre pasa por `data/store.js`, de modo que el almacenamiento puede sustituirse (por una base de datos, por ejemplo) sin tocar el controlador.

## Forma del recurso

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | entero | Lo genera el servidor. Si el cliente lo envía, se ignora. |
| `nombre` | texto | Obligatorio. Entre 1 y 60 caracteres (se recortan los espacios). |
| `goles` | entero | Entre 0 y 100. Por defecto, 0. |
| `titular` | booleano | `true` o `false`. Por defecto, `false`. |
| `posicion` | texto de valores cerrados | Obligatorio. Uno de: `portero`, `defensa`, `centrocampista`, `delantero`. |

Ejemplo:

```json
{ "id": 1, "nombre": "Íñigo Vicente", "goles": 5, "titular": true, "posicion": "delantero" }
```

Los campos desconocidos del cuerpo no se guardan.

## Endpoints

| Método | Ruta | Parámetros de consulta | Respuesta correcta | Respuestas de error |
|---|---|---|---|---|
| `GET` | `/jugadores` | `search`, `titular`, `posicion`, `sort`, `order`, `limit`, `offset` | `200` con un array de jugadores y la cabecera `X-Total-Count` | `400` si algún parámetro es desconocido o inválido |
| `POST` | `/jugadores` | — | `201` con el jugador creado y la cabecera `Location` | `400` con `{ "errors": [...] }` |
| `GET` | `/jugadores/stats` | — | `200` con el resumen | — |
| `GET` | `/jugadores/:id` | — | `200` con el jugador | `404` si no existe |
| `PUT` | `/jugadores/:id` | — | `200` con el jugador sustituido | `400` validación, `404` si no existe |
| `PATCH` | `/jugadores/:id` | — | `200` con el jugador actualizado | `400` validación, `404` si no existe |
| `DELETE` | `/jugadores/:id` | — | `204` sin cuerpo | `404` si no existe |

Otras respuestas:

- Cualquier ruta que no exista responde `404` con `{ "error": "Ruta no encontrada" }`.
- Un `id` que no es un entero positivo (por ejemplo `/jugadores/abc`) responde `404`.
- Un cuerpo JSON mal formado responde `400` con `{ "error": "..." }`.
- Un error inesperado responde `500` con `{ "error": "Error interno del servidor" }`, sin trazas.

### Parámetros de consulta de `GET /jugadores`

Todos son opcionales y combinables.

| Parámetro | Valores | Efecto |
|---|---|---|
| `search` | texto | Búsqueda parcial, sin distinguir mayúsculas, en `nombre`. |
| `titular` | `true` o `false` | Filtra por el campo booleano. |
| `posicion` | `portero`, `defensa`, `centrocampista`, `delantero` | Filtra por el campo de valores cerrados. |
| `sort` | `nombre` o `goles` | Campo de ordenación. |
| `order` | `asc` o `desc` | Sentido de la ordenación (por defecto `asc`). |
| `limit` | entero de 1 a 100 | Tamaño de la ventana de resultados. |
| `offset` | entero ≥ 0 | Posición de inicio de la ventana. |

### Política de parámetros desconocidos

La política es única: **un parámetro de consulta desconocido o mal formado responde `400`** con la lista de incidencias. Nunca detiene el servidor.

En cambio, los **campos desconocidos del cuerpo** de `POST`, `PUT` y `PATCH` se ignoran y no se persisten.

### Estadísticas

`GET /jugadores/stats` calcula el resumen en cada petición; nunca se almacena. Se declara antes de `/:id` para que `stats` no se interprete como un identificador.

### Ejemplos

Crear un jugador:

```bash
curl -i -X POST localhost:3000/jugadores \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Íñigo Vicente","goles":5,"titular":true,"posicion":"delantero"}'
```

```
HTTP/1.1 201 Created
Location: /jugadores/1

{"id":1,"nombre":"Íñigo Vicente","goles":5,"titular":true,"posicion":"delantero"}
```

Datos inválidos:

```bash
curl -i -X POST localhost:3000/jugadores \
  -H "Content-Type: application/json" \
  -d '{"nombre":"","goles":500,"posicion":"extremo"}'
```

```
HTTP/1.1 400 Bad Request

{"errors":[
  {"field":"nombre","message":"El nombre debe ser un texto no vacío"},
  {"field":"goles","message":"Los goles deben ser un entero entre 0 y 100"},
  {"field":"posicion","message":"La posición debe ser una de: portero, defensa, centrocampista, delantero"}
]}
```

Consulta con filtros:

```bash
curl -i "localhost:3000/jugadores?titular=true&sort=goles&order=desc&limit=5"
```

```
HTTP/1.1 200 OK
X-Total-Count: 2

[{"id":1,"nombre":"Íñigo Vicente","goles":5,"titular":true,"posicion":"delantero"}, ...]
```

Estadísticas:

```bash
curl -i localhost:3000/jugadores/stats
```

```
HTTP/1.1 200 OK

{"total":3,"titulares":2,"mediaGoles":2.33,"porPosicion":{"portero":1,"defensa":0,"centrocampista":1,"delantero":1}}
```

Actualización parcial:

```bash
curl -i -X PATCH localhost:3000/jugadores/1 \
  -H "Content-Type: application/json" -d '{"goles":6}'
```

```
HTTP/1.1 200 OK

{"id":1,"nombre":"Íñigo Vicente","goles":6,"titular":true,"posicion":"delantero"}
```

## Contenido estático

El cliente web está en `public/` y lo sirve Express con `express.static` desde `src/app.js`, tras `express.json()` y el `logger` y antes de las rutas de la API. Se hace así para que la página y la API compartan origen (mismo host y puerto): el navegador no necesita CORS y no hay que arrancar un segundo servidor.

## ¿Por qué el filtrado se hace en el servidor?

- El cliente solo recibe lo que necesita: con la paginación (`limit` y `offset`) no se transfiere toda la colección.
- La lógica de filtrado, ordenación y validación de parámetros vive en un único sitio y es la misma para cualquier cliente de la API, no solo para esta página.
- La colección puede crecer o cambiar de almacenamiento (una base de datos que filtre con consultas) sin tocar el cliente.
- El navegador no tiene por qué conocer ni cargar todos los datos.

## Diferencia entre `PUT` y `PATCH`

- `PUT` **sustituye completamente** el recurso: se valida el objeto entero y los campos no enviados vuelven a su valor por defecto (`goles` a 0 y `titular` a `false`; `nombre` y `posicion` son obligatorios).
- `PATCH` **actualiza solo los campos recibidos** y deja los demás como estaban. Se valida de forma parcial, y exige al menos un campo válido.

La edición del cliente web usa **`PUT`**, porque el formulario envía siempre el jugador completo (los cuatro campos).

## Componente de IA agéntica

La carpeta `AI/` contiene `agents.md` (configuración del *tester agent*, el contrato recibido y las comprobaciones generadas) y `review-log.md` (qué aportó el agente, qué se corrigió o rechazó y por qué).