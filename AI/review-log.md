# Review log: tester agent

Registro de la revisión crítica del único *tester agent* de la Práctica 1. Para cada aportación relevante del agente se indica qué se solicitó, qué devolvió, qué se corrigió o rechazó y el motivo. El prompt, el contrato y las 130 comprobaciones están en [`agents.md`](agents.md).

## Resumen

- **Agente:** un único *tester agent* de caja negra. Recibió solo el contrato de la API (reproducido en `agents.md`) y la API en ejecución en `http://localhost:3000`, sin acceso a la implementación.
- **Resultado:** 130 comprobaciones HTTP en 13 bloques (A a M), de las cuales 31 quedaron marcadas como SUPUESTO.
- **Revisión:** las 130 se ejecutaron a mano, en orden, con la API recién arrancada, comparando código de estado, cabeceras y estructura del cuerpo con lo esperado. Después se repitió la batería de forma automatizada sobre un clon limpio del repositorio (commit `5066909`, antes de añadir `AI/`): 117 comprobaciones con resultado definido por el contrato, todas correctas; 13 comprobaciones fuera del contrato, observadas y registradas. Además, los 130 comandos de `agents.md`, copiados sin modificar, dan los mismos códigos de estado.
- **Código de la API corregido a raíz de la revisión:** ninguno. La salida del agente no reveló ningún incumplimiento del contrato.
- **Salida del agente rechazada o corregida:** una predicción (caso 123) y una limitación de diseño de la batería (entrada 5).

## Entrada 1. Batería inicial de 130 comprobaciones

- **Solicitado:** generar comprobaciones HTTP de caja negra a partir del contrato, con comando `curl -i`, resultado esperado y marca SUPUESTO cuando dependan de algo que el contrato no especifica; ordenadas para ejecutarse en secuencia con la colección vacía.
- **Devuelto:** 130 comprobaciones con validación de cada campo (límites incluidos), 404, parámetros de consulta inválidos y desconocidos, PUT frente a PATCH, filtros combinados, ordenación, paginación, estadísticas y borrado.
- **Revisión:** se comprobaron también los valores calculados por el agente (medias de las estadísticas, orden por nombre y por goles, ventanas de paginación y filtros combinados). Todos coincidieron con el comportamiento de la API.
- **Corregido o rechazado:** nada con resultado definido por el contrato.
- **Motivo:** las 117 comprobaciones con resultado definido coinciden con el contrato, así que no hay nada que corregir en la API ni en la batería.

## Entrada 2. Supuestos que el agente marcó, y cómo se resolvieron

- **Solicitado:** no inventar comportamientos fuera del contrato y marcarlos como SUPUESTO.
- **Devuelto:** 31 supuestos. Los que condicionaban otras comprobaciones se verificaron con las propias ejecuciones:

| Supuesto del agente | Casos | Resultado observado | Decisión |
|---|---|---|---|
| `X-Total-Count` es el total tras filtrar y antes de paginar | 38, 48, 72, 73 | Confirmado (por ejemplo, `limit=3` devuelve 3 elementos y `X-Total-Count: 7`) | Aceptado |
| `PUT` restablece a su valor por defecto los campos omitidos | 80, 81 | Confirmado (`goles: 0`, `titular: false`) | Aceptado; coincide con el README |
| Un `400` no modifica el recurso | 86, 104 | Confirmado | Aceptado |
| Un id borrado no se reutiliza | 116 | Confirmado (tras borrar el 7, el nuevo jugador recibe el id 8) | Aceptado |
| `Location` apunta al recurso creado | 23, 116 | `/jugadores/1` y `/jugadores/8` | Aceptado |
| Rutas inexistentes responden JSON | 4 | `Content-Type: application/json` | Aceptado |
| Redondeo y forma de `mediaGoles` y `porPosicion` | 2, 78, 107, 115, 117 | `mediaGoles` con 2 decimales (23.71, 22.86…); `porPosicion` es un objeto con las cuatro posiciones, también con la colección vacía (todas a 0) | Aceptado; se comprobó con tolerancia |
| `order` por defecto | 57 | Ascendente (el README lo documenta) | Aceptado |

- **Corregido o rechazado:** nada.
- **Motivo:** el agente marcó correctamente como supuestos los puntos que el contrato no define y no los presentó como hechos.

## Entrada 3. Predicción del agente rechazada: PATCH con cuerpo vacío (caso 123)

- **Solicitado:** comportamiento de `PATCH /jugadores/:id` con cuerpo `{}`.
- **Devuelto:** "200 con el jugador sin cambios (probable)", marcado como SUPUESTO porque el contrato no lo define.
- **Observado:** `400` con `{"errors":[{"field":"body","message":"Debes enviar al menos un campo para actualizar"}]}`.
- **Rechazado:** la predicción del agente. **No se cambió la API.**
- **Motivo:** el contrato exige "validación parcial" pero no dice qué pasa sin campos. Un `PATCH` que no actualiza nada es probablemente un error del cliente, y devolver `400` con la estructura `errors` es coherente con el resto de la API. La decisión está documentada en el README ("exige al menos un campo válido").

## Entrada 4. Casos fuera del contrato que el agente dejó abiertos (118 a 130)

- **Solicitado:** comprobar qué hace la API donde el contrato no especifica nada.
- **Devuelto:** 13 casos con un resultado esperado alternativo ("201 o 400", "200 o 400", "404 o 405"…), todos marcados como SUPUESTO.
- **Observado y decidido:**

| Caso | Qué se probó | Observado | Decisión |
|---|---|---|---|
| 118 | JSON malformado | 400 | Aceptado: se rechaza sin 500 ni trazas |
| 119 | `nombre` solo con espacios | 400 | Aceptado: el nombre se recorta y se trata como vacío (README) |
| 120 | `posicion: "Portero"` | 400 | Aceptado: los valores cerrados distinguen mayúsculas |
| 121 | `goles: null` | 400 | Aceptado: `null` no equivale a campo ausente |
| 122 | 60 caracteres no ASCII (`ñ`) | 201 | Aceptado: se cuentan caracteres, no bytes |
| 123 | PATCH con `{}` | 400 | Ver entrada 3 |
| 124 | PUT inválido sobre id inexistente | 404 | Aceptado: el 404 tiene prioridad sobre la validación |
| 125 | Parámetro repetido (`limit=1&limit=2`) | 400 | Aceptado: se rechaza en lugar de elegir un valor |
| 126 | `Titular=true` | 400 | Aceptado: los nombres de parámetro distinguen mayúsculas |
| 127 | `titular=TRUE` | 400 | Aceptado: solo `true` o `false` en minúsculas |
| 128 | `search=` vacío | 200, con `X-Total-Count` igual al total de la colección (8) | Aceptado: el parámetro vacío se ignora y no filtra |
| 129 | `POST /jugadores/1` | 404 | Aceptado: se trata como ruta inexistente, sin 405 |
| 130 | `DELETE /jugadores` | 404, la colección sigue con 8 jugadores | Aceptado |

- **Corregido o rechazado:** nada en la API. Ningún caso produjo un `500`.
- **Motivo:** todas las respuestas son coherentes con el resto de las reglas y con la política de parámetros documentada en el README (`400` ante parámetros desconocidos o mal formados). Se documentan para que el comportamiento sea explícito.

## Entrada 5. Limitaciones de la batería detectadas en la revisión

- **Solicitado:** ordenar las comprobaciones "para que funcionen en secuencia con la API recién arrancada".
- **Devuelto:** una batería que cumple lo pedido, pero que **depende del estado**: los ids y los resultados esperados suponen la colección vacía al empezar y el orden exacto de ejecución.
- **Detectado:** al repetir comprobaciones sueltas con la API ya usada, los resultados cambiaron, porque la colección ya no estaba vacía (por ejemplo, `GET /jugadores/1` ya no puede dar 404 si el jugador 1 existe). No era un fallo de la API, sino de la forma de la batería.
- **Decisión:** se acepta la batería tal cual y se documenta cómo repetirla: reiniciar la API antes de empezar (el almacenamiento es solo en memoria) y ejecutar desde la comprobación 1, en orden. El caso 122 crea un jugador, por lo que no conviene repetirlo suelto.
- **Otras limitaciones aceptadas:**
  - Un error `500` no se puede provocar desde fuera sin conocer la implementación, así que el agente no lo incluyó y no se ha comprobado externamente.
  - De los mensajes de error solo se comprueba la estructura (`field` y `message`), no el texto, como pedía el contrato.
- **Motivo:** hacer la batería independiente del estado exigiría limpiar la colección entre pruebas, y el contrato no define ningún *endpoint* para ello.

## Cómo reproducir la verificación

1. `npm install` y `npm start`, para arrancar la API con la colección vacía.
2. Ejecutar los comandos de [`agents.md`](agents.md) en orden, del 1 al 130.
3. Comparar cada respuesta con el resultado esperado indicado.
4. Para repetirla, parar la API, volver a arrancarla y empezar de nuevo.
