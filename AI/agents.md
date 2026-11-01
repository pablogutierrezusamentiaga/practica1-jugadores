# Tester agent: configuración, contrato y comprobaciones

Este archivo recoge el único *tester agent* de la Práctica 1: el prompt con el que se configuró, el contrato que recibió y las comprobaciones HTTP de caja negra que generó. La revisión crítica de su salida está en [`review-log.md`](review-log.md).

## 1. Prompt o configuración del agente

El agente se configuró con el siguiente texto, tal cual:

```text
Eres un agente tester de caja negra. Tu trabajo es generar comprobaciones HTTP para una API REST en ejecución. No tienes acceso a su implementación ni debes suponer cómo está hecha: solo conoces el contrato que sigue. La API corre en http://localhost:3000.

REGLAS
- Solo puedes comprobar lo que dice el contrato. Si una comprobación depende de algo que el contrato no especifica, márcala como "SUPUESTO" y explica qué has supuesto.
- Genera cada comprobación como un comando curl con -i, para que se vea el código de estado y las cabeceras.
- Indica para cada una el resultado esperado: código de estado, cabeceras relevantes y forma del cuerpo.
- Ordena las comprobaciones para que funcionen en secuencia con la API recién arrancada (colección vacía, primer id = 1).
- Cubre casos correctos y casos de error: validación de cada campo (límites incluidos), 404, parámetros de consulta inválidos y desconocidos, PUT frente a PATCH, filtros combinados, ordenación, paginación y estadísticas.
- No inventes endpoints, campos ni mensajes de error exactos que el contrato no mencione. Para los mensajes, comprueba solo la estructura.

FORMATO DE SALIDA
Una lista numerada. Cada elemento: Descripción, Comando curl, Resultado esperado, y si es SUPUESTO.
```

## 2. Contrato recibido

```text
CONTRATO

Recurso: jugadores. Campos:
- id: entero generado por el servidor; si el cliente lo envía, se ignora.
- nombre: texto obligatorio, de 1 a 60 caracteres.
- goles: entero entre 0 y 100, por defecto 0.
- titular: booleano, por defecto false.
- posicion: obligatoria, valores cerrados: portero, defensa, centrocampista, delantero.
Los campos desconocidos del cuerpo no se guardan.

Endpoints:
- GET /jugadores: lista de jugadores. Respuesta 200 con un array y la cabecera X-Total-Count. Parámetros de consulta (todos opcionales y combinables): search (búsqueda parcial sin distinguir mayúsculas en nombre), titular (true o false), posicion (uno de los valores cerrados), sort (nombre o goles), order (asc o desc), limit (entero de 1 a 100), offset (entero mayor o igual que 0). Error 400 si algún parámetro es desconocido o inválido.
- POST /jugadores: crea un jugador. Respuesta 201 con el jugador creado y la cabecera Location. Error 400 con cuerpo { "errors": [ { "field": "...", "message": "..." } ] } con todas las incidencias.
- GET /jugadores/stats: resumen calculado en cada petición. Respuesta 200 con total, titulares, mediaGoles y porPosicion.
- GET /jugadores/:id: respuesta 200 con el jugador, o 404 si no existe.
- PUT /jugadores/:id: sustituye completamente el jugador. Validación completa. 200 con el jugador, 400 si hay errores, 404 si no existe.
- PATCH /jugadores/:id: actualiza solo los campos recibidos. Validación parcial. 200 con el jugador, 400 si hay errores, 404 si no existe.
- DELETE /jugadores/:id: elimina el jugador. Respuesta 204 sin cuerpo, o 404 si no existe.

Otras respuestas:
- Cualquier ruta inexistente: 404 con cuerpo JSON.
- Un id que no sea un entero positivo se trata como no encontrado (404).
- Un error inesperado: 500 con JSON, sin trazas.
```

## 3. Comprobaciones generadas

El agente devolvió 130 comprobaciones agrupadas en 13 bloques (A a M). Deben ejecutarse **en este orden y con la API recién arrancada** (colección vacía, primer id = 1), porque los ids y los resultados esperados dependen del estado que dejan las anteriores. Todas las peticiones con cuerpo llevan `Content-Type: application/json`.

Notas del propio agente:

- No hay forma de provocar un 500 desde fuera sin conocer la implementación, así que ese caso no se comprueba.
- Los comandos que podrían crear datos de forma imprevista están al final (bloque M), para no desordenar los ids.

Dataset que se construye en los bloques B y C (tras ellos, ids 1 a 7):

| id | nombre | posicion | goles | titular |
|---|---|---|---|---|
| 1 | Iker Casillas | portero | 0 (defecto) | false (defecto) |
| 2 | Sergio Ramos | defensa | 15 | true |
| 3 | Xavi Hernandez | centrocampista | 8 | true |
| 4 | David Villa | delantero | 40 | true |
| 5 | Raul Gonzalez | delantero | 100 | false |
| 6 | A | defensa | 0 | false |
| 7 | 60 × "B" | centrocampista | 3 | false |

### A. Estado inicial y rutas

**1. Lista vacía**

```bash
curl -i 'http://localhost:3000/jugadores'
```

- Resultado esperado: 200, X-Total-Count: 0, cuerpo [].

**2. Estadísticas con colección vacía**

```bash
curl -i 'http://localhost:3000/jugadores/stats'
```

- Resultado esperado: 200, claves total (0), titulares (0), mediaGoles y porPosicion.
- **SUPUESTO**: El valor de mediaGoles con 0 jugadores y la forma exacta de porPosicion no están definidos; solo se comprueba que las claves existen y que total y titulares valen 0.

**3. GET de id inexistente**

```bash
curl -i 'http://localhost:3000/jugadores/1'
```

- Resultado esperado: 404.

**4. Ruta inexistente**

```bash
curl -i 'http://localhost:3000/equipos'
```

- Resultado esperado: 404 con cuerpo JSON.
- **SUPUESTO**: Content-Type es application/json (el contrato solo dice "cuerpo JSON").

**5. PUT sobre id inexistente**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/1' -H 'Content-Type: application/json' -d '{"nombre":"X","posicion":"portero"}'
```

- Resultado esperado: 404.

**6. PATCH sobre id inexistente**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/1' -H 'Content-Type: application/json' -d '{"goles":1}'
```

- Resultado esperado: 404.

**7. DELETE sobre id inexistente**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/1'
```

- Resultado esperado: 404.


### B. POST inválidos (no deben crear nada)

**8. nombre ausente**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"posicion":"portero"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).
- **SUPUESTO**: field vale "nombre" (el contrato no dice que field coincida con el nombre del campo).

**9. nombre vacío (límite inferior: 0 caracteres)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"","posicion":"portero"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**10. nombre de 61 caracteres (límite superior + 1)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","posicion":"portero"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**11. nombre que no es texto**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":123,"posicion":"portero"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**12. posicion ausente**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**13. posicion fuera de los valores cerrados**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"lateral"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**14. goles = -1**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","goles":-1}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**15. goles = 101**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","goles":101}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**16. goles no entero (1.5)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","goles":1.5}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**17. goles como texto**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","goles":"10"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**18. titular como texto**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","titular":"true"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**19. titular como número**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","titular":1}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 1 elemento(s).

**20. Cuerpo vacío {} (faltan dos obligatorios)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 2 elemento(s).

**21. Todas las incidencias a la vez**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"","goles":101,"titular":"si","posicion":"x"}'
```

- Resultado esperado: 400 con {"errors":[...]}; errors con 4 elemento(s).

**22. Los rechazos no han persistido nada**

```bash
curl -i 'http://localhost:3000/jugadores'
```

- Resultado esperado: 200, [], X-Total-Count: 0.
- **SUPUESTO**: Un POST rechazado no consume id (los ids siguientes asumen que el primer jugador creado recibe el 1).


### C. POST válidos

**23. Mínimo válido + id enviado por el cliente + campo desconocido**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"id":99,"nombre":"Iker Casillas","posicion":"portero","extra":"x"}'
```

- Resultado esperado: 201, Location, id: 1 (el 99 se ignora), goles: 0, titular: false, sin el campo extra.
- **SUPUESTO**: El valor de Location (se espera /jugadores/1); el contrato solo exige que exista.

**24. Lo creado es recuperable y no contiene campos extra**

```bash
curl -i 'http://localhost:3000/jugadores/1'
```

- Resultado esperado: 200, mismo cuerpo que en 23, sin extra.

**25. Jugador completo (id 2)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Sergio Ramos","goles":15,"titular":true,"posicion":"defensa"}'
```

- Resultado esperado: 201, Location, id: 2.

**26. Jugador id 3**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Xavi Hernandez","goles":8,"titular":true,"posicion":"centrocampista"}'
```

- Resultado esperado: 201, Location, id: 3.

**27. Jugador id 4**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"David Villa","goles":40,"titular":true,"posicion":"delantero"}'
```

- Resultado esperado: 201, Location, id: 4.

**28. goles = 100 (límite superior válido), id 5**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Raul Gonzalez","goles":100,"titular":false,"posicion":"delantero"}'
```

- Resultado esperado: 201, Location, id: 5.

**29. nombre de 1 carácter y goles = 0 explícito (límites inferiores), id 6**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"A","goles":0,"titular":false,"posicion":"defensa"}'
```

- Resultado esperado: 201, Location, id: 6.

**30. nombre de 60 caracteres (límite superior válido), id 7**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","goles":3,"titular":false,"posicion":"centrocampista"}'
```

- Resultado esperado: 201, Location, id: 7.


### D. GET por id

**31. Jugador existente**

```bash
curl -i 'http://localhost:3000/jugadores/2'
```

- Resultado esperado: 200, cuerpo de Sergio Ramos.

**32. Id inexistente**

```bash
curl -i 'http://localhost:3000/jugadores/999'
```

- Resultado esperado: 404.

**33. Id = 0 (no es entero positivo)**

```bash
curl -i 'http://localhost:3000/jugadores/0'
```

- Resultado esperado: 404.

**34. Id negativo**

```bash
curl -i 'http://localhost:3000/jugadores/-1'
```

- Resultado esperado: 404.

**35. Id no numérico**

```bash
curl -i 'http://localhost:3000/jugadores/abc'
```

- Resultado esperado: 404.

**36. Id decimal**

```bash
curl -i 'http://localhost:3000/jugadores/1.5'
```

- Resultado esperado: 404.


### E. GET /jugadores: paginación

**37. Lista completa**

```bash
curl -i 'http://localhost:3000/jugadores'
```

- Resultado esperado: 200, array de 7 elementos, X-Total-Count: 7 (no se comprueba el orden por defecto).

**38. limit=3**

```bash
curl -i 'http://localhost:3000/jugadores?limit=3'
```

- Resultado esperado: 200, 3 elementos.
- **SUPUESTO**: X-Total-Count: 7 (total sin paginar); el contrato no aclara si el total ignora limit y offset.

**39. limit=1 (mínimo)**

```bash
curl -i 'http://localhost:3000/jugadores?limit=1'
```

- Resultado esperado: 200, 1 elemento.

**40. limit=100 (máximo)**

```bash
curl -i 'http://localhost:3000/jugadores?limit=100'
```

- Resultado esperado: 200, 7 elementos.

**41. limit=0**

```bash
curl -i 'http://localhost:3000/jugadores?limit=0'
```

- Resultado esperado: 400.

**42. limit=101**

```bash
curl -i 'http://localhost:3000/jugadores?limit=101'
```

- Resultado esperado: 400.

**43. limit no numérico**

```bash
curl -i 'http://localhost:3000/jugadores?limit=abc'
```

- Resultado esperado: 400.

**44. limit decimal**

```bash
curl -i 'http://localhost:3000/jugadores?limit=1.5'
```

- Resultado esperado: 400.

**45. limit negativo**

```bash
curl -i 'http://localhost:3000/jugadores?limit=-1'
```

- Resultado esperado: 400.

**46. offset=0 (mínimo válido)**

```bash
curl -i 'http://localhost:3000/jugadores?offset=0'
```

- Resultado esperado: 200, 7 elementos.

**47. offset=5**

```bash
curl -i 'http://localhost:3000/jugadores?offset=5'
```

- Resultado esperado: 200, 2 elementos.

**48. offset igual al total**

```bash
curl -i 'http://localhost:3000/jugadores?offset=7'
```

- Resultado esperado: 200, [].
- **SUPUESTO**: X-Total-Count: 7 (mismo supuesto que en 38).

**49. offset negativo**

```bash
curl -i 'http://localhost:3000/jugadores?offset=-1'
```

- Resultado esperado: 400.

**50. offset no numérico**

```bash
curl -i 'http://localhost:3000/jugadores?offset=abc'
```

- Resultado esperado: 400.


### F. GET /jugadores: ordenación

**51. goles descendente**

```bash
curl -i 'http://localhost:3000/jugadores?sort=goles&order=desc'
```

- Resultado esperado: 200, goles no crecientes (100, 40, 15, 8, 3, 0, 0), primer elemento id 5.

**52. goles ascendente**

```bash
curl -i 'http://localhost:3000/jugadores?sort=goles&order=asc'
```

- Resultado esperado: 200, goles no decrecientes (0, 0, 3, 8, 15, 40, 100), último elemento id 5.

**53. nombre ascendente**

```bash
curl -i 'http://localhost:3000/jugadores?sort=nombre&order=asc'
```

- Resultado esperado: 200, ids en orden 6, 7, 4, 1, 5, 2, 3.

**54. nombre descendente**

```bash
curl -i 'http://localhost:3000/jugadores?sort=nombre&order=desc'
```

- Resultado esperado: 200, ids en orden 3, 2, 5, 1, 4, 7, 6.

**55. sort con campo no permitido**

```bash
curl -i 'http://localhost:3000/jugadores?sort=posicion'
```

- Resultado esperado: 400.

**56. order inválido**

```bash
curl -i 'http://localhost:3000/jugadores?sort=goles&order=up'
```

- Resultado esperado: 400.

**57. sort sin order**

```bash
curl -i 'http://localhost:3000/jugadores?sort=goles'
```

- Resultado esperado: 200, 7 elementos ordenados por goles en alguna dirección.
- **SUPUESTO**: El contrato no define el order por defecto; solo se comprueba que la lista es monótona en goles.

**58. order sin sort**

```bash
curl -i 'http://localhost:3000/jugadores?order=desc'
```

- Resultado esperado: 200, 7 elementos.
- **SUPUESTO**: El contrato declara los parámetros opcionales y combinables pero no dice qué pasa con order sin sort.


### G. GET /jugadores: filtros y combinaciones

**59. search insensible a mayúsculas**

```bash
curl -i 'http://localhost:3000/jugadores?search=RAM'
```

- Resultado esperado: 200, 1 elemento (id 2), X-Total-Count: 1.

**60. search parcial con varios resultados**

```bash
curl -i 'http://localhost:3000/jugadores?search=ra'
```

- Resultado esperado: 200, ids 2 y 5, X-Total-Count: 2.

**61. search sin coincidencias**

```bash
curl -i 'http://localhost:3000/jugadores?search=zzz'
```

- Resultado esperado: 200, [], X-Total-Count: 0.

**62. search solo actúa sobre nombre**

```bash
curl -i 'http://localhost:3000/jugadores?search=portero'
```

- Resultado esperado: 200, [] ("portero" es una posición, no un nombre).

**63. titular=true**

```bash
curl -i 'http://localhost:3000/jugadores?titular=true'
```

- Resultado esperado: 200, ids 2, 3, 4, X-Total-Count: 3.

**64. titular=false**

```bash
curl -i 'http://localhost:3000/jugadores?titular=false'
```

- Resultado esperado: 200, ids 1, 5, 6, 7, X-Total-Count: 4.

**65. titular con valor inválido**

```bash
curl -i 'http://localhost:3000/jugadores?titular=yes'
```

- Resultado esperado: 400.

**66. titular=1**

```bash
curl -i 'http://localhost:3000/jugadores?titular=1'
```

- Resultado esperado: 400 (el contrato solo admite true o false).

**67. posicion válida**

```bash
curl -i 'http://localhost:3000/jugadores?posicion=delantero'
```

- Resultado esperado: 200, ids 4 y 5, X-Total-Count: 2.

**68. posicion inválida**

```bash
curl -i 'http://localhost:3000/jugadores?posicion=lateral'
```

- Resultado esperado: 400.

**69. posicion + titular**

```bash
curl -i 'http://localhost:3000/jugadores?posicion=delantero&titular=true'
```

- Resultado esperado: 200, solo id 4, X-Total-Count: 1.

**70. posicion + titular + search**

```bash
curl -i 'http://localhost:3000/jugadores?posicion=defensa&titular=true&search=ser'
```

- Resultado esperado: 200, solo id 2, X-Total-Count: 1.

**71. Combinación sin resultados**

```bash
curl -i 'http://localhost:3000/jugadores?titular=true&posicion=portero'
```

- Resultado esperado: 200, [], X-Total-Count: 0.

**72. Filtro + orden + paginación**

```bash
curl -i 'http://localhost:3000/jugadores?posicion=delantero&sort=goles&order=asc&limit=1&offset=1'
```

- Resultado esperado: 200, 1 elemento: id 5.
- **SUPUESTO**: X-Total-Count: 2 (total filtrado sin paginar).

**73. Otro filtro + orden + paginación**

```bash
curl -i 'http://localhost:3000/jugadores?titular=false&sort=goles&order=desc&limit=1&offset=1'
```

- Resultado esperado: 200, 1 elemento: id 7.
- **SUPUESTO**: X-Total-Count: 4.

**74. Parámetro desconocido**

```bash
curl -i 'http://localhost:3000/jugadores?foo=bar'
```

- Resultado esperado: 400.

**75. Parámetro desconocido junto a uno válido**

```bash
curl -i 'http://localhost:3000/jugadores?limit=10&foo=bar'
```

- Resultado esperado: 400.

**76. Parámetro page (no existe en el contrato)**

```bash
curl -i 'http://localhost:3000/jugadores?page=2'
```

- Resultado esperado: 400.

**77. Un parámetro inválido invalida toda la consulta**

```bash
curl -i 'http://localhost:3000/jugadores?titular=true&limit=0'
```

- Resultado esperado: 400.


### H. Estadísticas (estado inicial del dataset)

**78. Estadísticas**

```bash
curl -i 'http://localhost:3000/jugadores/stats'
```

- Resultado esperado: 200; total 7, titulares 3, mediaGoles ≈ 23.71 (166/7), porPosicion portero 1, defensa 2, centrocampista 2, delantero 2.
- **SUPUESTO**: Redondeo de mediaGoles (se comprueba con tolerancia) y forma de porPosicion (se supone un objeto con las posiciones como claves).


### I. PUT (sustitución completa)

**79. PUT completo válido sobre id 3**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"nombre":"Xavi Hernandez","goles":10,"titular":true,"posicion":"centrocampista"}'
```

- Resultado esperado: 200, id: 3, goles: 10, titular: true.

**80. PUT sin goles ni titular, con id y campo desconocido**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"id":50,"nombre":"Xavi Hernandez","posicion":"centrocampista","extra":true}'
```

- Resultado esperado: 200, id: 3 (el 50 se ignora), sin extra, goles: 0, titular: false.
- **SUPUESTO**: Al ser sustitución completa, los campos omitidos vuelven a sus valores por defecto en lugar de conservar los anteriores.

**81. La sustitución persistió**

```bash
curl -i 'http://localhost:3000/jugadores/3'
```

- Resultado esperado: 200, goles: 0, titular: false, sin extra.

**82. PUT sin nombre**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"posicion":"centrocampista","goles":5}'
```

- Resultado esperado: 400, errors con 1 elemento (validación completa).

**83. PUT sin posicion**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"nombre":"Xavi Hernandez"}'
```

- Resultado esperado: 400, errors con 1 elemento.

**84. PUT con nombre de 61 caracteres**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"nombre":"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB","posicion":"centrocampista"}'
```

- Resultado esperado: 400.

**85. PUT con todas las incidencias**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/3' -H 'Content-Type: application/json' -d '{"nombre":"","goles":101,"titular":"si","posicion":"x"}'
```

- Resultado esperado: 400, errors con 4 elementos.

**86. Los PUT rechazados no modificaron el jugador**

```bash
curl -i 'http://localhost:3000/jugadores/3'
```

- Resultado esperado: 200, sigue con nombre Xavi Hernandez, goles 0, titular false, centrocampista.
- **SUPUESTO**: La atomicidad de la validación (un 400 no modifica el recurso) se deduce, pero no está escrita en el contrato.

**87. PUT sobre id inexistente**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/999' -H 'Content-Type: application/json' -d '{"nombre":"X","posicion":"portero"}'
```

- Resultado esperado: 404.

**88. PUT con id no numérico**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/abc' -H 'Content-Type: application/json' -d '{"nombre":"X","posicion":"portero"}'
```

- Resultado esperado: 404.


### J. PATCH (actualización parcial)

**89. PATCH de un solo campo (id 4)**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/4' -H 'Content-Type: application/json' -d '{"goles":41}'
```

- Resultado esperado: 200, goles: 41; el resto de campos se conserva.

**90. PATCH de titular**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/4' -H 'Content-Type: application/json' -d '{"titular":false}'
```

- Resultado esperado: 200, titular: false, goles: 41.

**91. PATCH con id y campo desconocido**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/4' -H 'Content-Type: application/json' -d '{"id":77,"extra":"x","goles":42}'
```

- Resultado esperado: 200, id: 4, goles: 42, sin extra.

**92. PATCH goles = 100 (límite) sobre id 6**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/6' -H 'Content-Type: application/json' -d '{"goles":100}'
```

- Resultado esperado: 200, goles: 100.

**93. PATCH goles = 0 (límite)**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/6' -H 'Content-Type: application/json' -d '{"goles":0}'
```

- Resultado esperado: 200, goles: 0.

**94. PATCH nombre de 60 caracteres**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/6' -H 'Content-Type: application/json' -d '{"nombre":"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"}'
```

- Resultado esperado: 200, nombre de 60 caracteres.

**95. PATCH de posicion**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/6' -H 'Content-Type: application/json' -d '{"posicion":"portero"}'
```

- Resultado esperado: 200, posicion: portero.

**96. PATCH goles = 101**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"goles":101}'
```

- Resultado esperado: 400, errors con 1 elemento.

**97. PATCH goles = -1**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"goles":-1}'
```

- Resultado esperado: 400.

**98. PATCH goles decimal**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"goles":1.5}'
```

- Resultado esperado: 400.

**99. PATCH nombre vacío**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"nombre":""}'
```

- Resultado esperado: 400.

**100. PATCH nombre de 61 caracteres**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"nombre":"BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"}'
```

- Resultado esperado: 400.

**101. PATCH posicion inválida**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"posicion":"x"}'
```

- Resultado esperado: 400.

**102. PATCH titular inválido**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"titular":"si"}'
```

- Resultado esperado: 400.

**103. PATCH con varias incidencias**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/2' -H 'Content-Type: application/json' -d '{"nombre":"","goles":101,"titular":"si","posicion":"x"}'
```

- Resultado esperado: 400, errors con 4 elementos.

**104. Los PATCH rechazados no modificaron el jugador**

```bash
curl -i 'http://localhost:3000/jugadores/2'
```

- Resultado esperado: 200, sigue siendo Sergio Ramos, defensa, goles 15, titular true.
- **SUPUESTO**: La misma atomicidad que en 86.

**105. PATCH sobre id inexistente**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/999' -H 'Content-Type: application/json' -d '{"goles":1}'
```

- Resultado esperado: 404.

**106. PATCH con id no numérico**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/abc' -H 'Content-Type: application/json' -d '{"goles":1}'
```

- Resultado esperado: 404.


### K. Estadísticas tras las modificaciones

**107. Estadísticas recalculadas**

```bash
curl -i 'http://localhost:3000/jugadores/stats'
```

- Resultado esperado: 200; total 7, titulares 1, mediaGoles ≈ 22.86 (160/7), porPosicion portero 2, defensa 1, centrocampista 2, delantero 2.
- **SUPUESTO**: Redondeo y forma de porPosicion, igual que en 78. Que los valores cambien respecto a 78 confirma que se calculan en cada petición.


### L. DELETE

**108. Borrar id 7**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/7'
```

- Resultado esperado: 204, sin cuerpo.

**109. El borrado es efectivo**

```bash
curl -i 'http://localhost:3000/jugadores/7'
```

- Resultado esperado: 404.

**110. Borrar de nuevo el mismo id**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/7'
```

- Resultado esperado: 404.

**111. DELETE con id inexistente**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/999'
```

- Resultado esperado: 404.

**112. DELETE con id no numérico**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/abc'
```

- Resultado esperado: 404.

**113. DELETE con id = 0**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores/0'
```

- Resultado esperado: 404.

**114. La lista refleja el borrado**

```bash
curl -i 'http://localhost:3000/jugadores'
```

- Resultado esperado: 200, 6 elementos, X-Total-Count: 6, ninguno con id 7.

**115. Estadísticas tras borrar**

```bash
curl -i 'http://localhost:3000/jugadores/stats'
```

- Resultado esperado: 200; total 6, titulares 1, mediaGoles ≈ 26.17 (157/6), porPosicion portero 2, defensa 1, centrocampista 1, delantero 2.
- **SUPUESTO**: Redondeo y forma de porPosicion.

**116. Crear tras borrar**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Nuevo","goles":5,"titular":true,"posicion":"portero"}'
```

- Resultado esperado: 201, Location, id entero distinto de los existentes (1 a 6).
- **SUPUESTO**: El id nuevo es el 8 (no se reutiliza el 7); el contrato solo dice "entero generado por el servidor".

**117. Estadísticas tras la nueva creación**

```bash
curl -i 'http://localhost:3000/jugadores/stats'
```

- Resultado esperado: 200; total 7, titulares 2, mediaGoles ≈ 23.14 (162/7), porPosicion.portero: 3.


### M. Casos que dependen de algo que el contrato no especifica

**118. JSON malformado**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":'
```

- Resultado esperado: 400 (probable) y, en cualquier caso, no un 500 con trazas.
- **SUPUESTO**: El contrato no cubre cuerpos que no sean JSON válido.

**119. nombre solo con espacios**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"   ","posicion":"portero"}'
```

- Resultado esperado: 201 o 400.
- **SUPUESTO**: El contrato solo habla de longitud de 1 a 60, no de recortar espacios. Se registra qué ocurre.

**120. posicion con mayúsculas**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"Portero"}'
```

- Resultado esperado: 400 (los valores son "cerrados").
- **SUPUESTO**: No se dice explícitamente que distingan mayúsculas.

**121. goles = null**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"Test","posicion":"portero","goles":null}'
```

- Resultado esperado: 400 o 201 con goles: 0.
- **SUPUESTO**: El contrato no dice cómo trata null.

**122. nombre de 60 caracteres no ASCII (cuenta caracteres o bytes)**

```bash
curl -i -X POST 'http://localhost:3000/jugadores' -H 'Content-Type: application/json' -d '{"nombre":"ññññññññññññññññññññññññññññññññññññññññññññññññññññññññññññ","posicion":"portero"}'
```

- Resultado esperado: 201 si se cuentan caracteres, 400 si se cuentan bytes.
- **SUPUESTO**: El contrato dice "caracteres", por lo que se espera 201.

**123. PATCH con cuerpo vacío**

```bash
curl -i -X PATCH 'http://localhost:3000/jugadores/1' -H 'Content-Type: application/json' -d '{}'
```

- Resultado esperado: 200 con el jugador sin cambios (probable).
- **SUPUESTO**: El contrato no lo define.

**124. PUT inválido sobre id inexistente (orden 404 frente a 400)**

```bash
curl -i -X PUT 'http://localhost:3000/jugadores/999' -H 'Content-Type: application/json' -d '{}'
```

- Resultado esperado: 404 o 400.
- **SUPUESTO**: El contrato no define qué error tiene prioridad.

**125. Parámetro repetido**

```bash
curl -i 'http://localhost:3000/jugadores?limit=1&limit=2'
```

- Resultado esperado: 200 o 400, nunca 500.
- **SUPUESTO**: El contrato no dice qué se hace con parámetros duplicados.

**126. Nombre de parámetro con otra capitalización**

```bash
curl -i 'http://localhost:3000/jugadores?Titular=true'
```

- Resultado esperado: 400 si los nombres de parámetro distinguen mayúsculas.
- **SUPUESTO**: Se trataría como parámetro desconocido.

**127. Valor de titular en mayúsculas**

```bash
curl -i 'http://localhost:3000/jugadores?titular=TRUE'
```

- Resultado esperado: 400 o 200.
- **SUPUESTO**: El contrato solo menciona true o false.

**128. search vacío**

```bash
curl -i 'http://localhost:3000/jugadores?search='
```

- Resultado esperado: 200 sin filtrar o 400.
- **SUPUESTO**: El contrato no define el caso.

**129. Método no definido sobre ruta existente**

```bash
curl -i -X POST 'http://localhost:3000/jugadores/1' -H 'Content-Type: application/json' -d '{}'
```

- Resultado esperado: 404 o 405.
- **SUPUESTO**: El contrato solo habla de "rutas inexistentes" y no menciona 405.

**130. DELETE sobre la colección**

```bash
curl -i -X DELETE 'http://localhost:3000/jugadores'
```

- Resultado esperado: 404 o 405, y la colección no debe vaciarse.
- **SUPUESTO**: Se verifica después con GET /jugadores.

