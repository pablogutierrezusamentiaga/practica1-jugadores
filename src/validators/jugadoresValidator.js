const POSICIONES = ["portero", "defensa", "centrocampista", "delantero"];

// partial = false -> POST y PUT (objeto completo, con valores por defecto)
// partial = true  -> PATCH (solo se validan los campos enviados)
// Los campos desconocidos y el id enviado por el cliente se ignoran.
function validateJugador(body, { partial = false } = {}) {
  const errors = [];
  const datos = {};
  const entrada =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const tiene = (campo) => entrada[campo] !== undefined;

  // nombre: texto obligatorio, 1 a 60 caracteres
  if (tiene("nombre")) {
    const nombre = entrada.nombre;
    if (typeof nombre !== "string" || nombre.trim() === "") {
      errors.push({ field: "nombre", message: "El nombre debe ser un texto no vacío" });
    } else if (nombre.trim().length > 60) {
      errors.push({ field: "nombre", message: "El nombre no puede superar 60 caracteres" });
    } else {
      datos.nombre = nombre.trim();
    }
  } else if (!partial) {
    errors.push({ field: "nombre", message: "El nombre es obligatorio" });
  }

  // goles: entero de 0 a 100 (por defecto 0)
  if (tiene("goles")) {
    const goles = entrada.goles;
    if (!Number.isInteger(goles) || goles < 0 || goles > 100) {
      errors.push({ field: "goles", message: "Los goles deben ser un entero entre 0 y 100" });
    } else {
      datos.goles = goles;
    }
  } else if (!partial) {
    datos.goles = 0;
  }

  // titular: booleano (por defecto false)
  if (tiene("titular")) {
    if (typeof entrada.titular !== "boolean") {
      errors.push({ field: "titular", message: "El campo titular debe ser true o false" });
    } else {
      datos.titular = entrada.titular;
    }
  } else if (!partial) {
    datos.titular = false;
  }

  // posicion: valor de una lista cerrada, obligatoria
  if (tiene("posicion")) {
    if (!POSICIONES.includes(entrada.posicion)) {
      errors.push({
        field: "posicion",
        message: `La posición debe ser una de: ${POSICIONES.join(", ")}`,
      });
    } else {
      datos.posicion = entrada.posicion;
    }
  } else if (!partial) {
    errors.push({ field: "posicion", message: "La posición es obligatoria" });
  }

  // PATCH sin ningún campo válido
  if (partial && errors.length === 0 && Object.keys(datos).length === 0) {
    errors.push({ field: "body", message: "Debes enviar al menos un campo para actualizar" });
  }

  return { errors, datos };
}

// Valida los parámetros de consulta de GET /jugadores.
// Política única: un parámetro desconocido o mal formado responde 400.
function validarConsulta(query) {
  const errors = [];
  const opciones = { search: "", order: "asc", offset: 0 };

  const permitidos = ["search", "titular", "posicion", "sort", "order", "limit", "offset"];
  for (const clave of Object.keys(query)) {
    if (!permitidos.includes(clave)) {
      errors.push({ field: clave, message: "Parámetro de consulta desconocido" });
    }
  }

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      errors.push({ field: "search", message: "search debe ser un texto" });
    } else {
      opciones.search = query.search.trim().toLowerCase();
    }
  }

  if (query.titular !== undefined) {
    if (query.titular !== "true" && query.titular !== "false") {
      errors.push({ field: "titular", message: "titular debe ser true o false" });
    } else {
      opciones.titular = query.titular === "true";
    }
  }

  if (query.posicion !== undefined) {
    if (!POSICIONES.includes(query.posicion)) {
      errors.push({
        field: "posicion",
        message: `posicion debe ser una de: ${POSICIONES.join(", ")}`,
      });
    } else {
      opciones.posicion = query.posicion;
    }
  }

  if (query.sort !== undefined) {
    if (query.sort !== "nombre" && query.sort !== "goles") {
      errors.push({ field: "sort", message: "sort debe ser nombre o goles" });
    } else {
      opciones.sort = query.sort;
    }
  }

  if (query.order !== undefined) {
    if (query.order !== "asc" && query.order !== "desc") {
      errors.push({ field: "order", message: "order debe ser asc o desc" });
    } else {
      opciones.order = query.order;
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!/^\d+$/.test(String(query.limit)) || limit < 1 || limit > 100) {
      errors.push({ field: "limit", message: "limit debe ser un entero entre 1 y 100" });
    } else {
      opciones.limit = limit;
    }
  }

  if (query.offset !== undefined) {
    if (!/^\d+$/.test(String(query.offset))) {
      errors.push({ field: "offset", message: "offset debe ser un entero mayor o igual que 0" });
    } else {
      opciones.offset = Number(query.offset);
    }
  }

  return { errors, opciones };
}

module.exports = { validateJugador, validarConsulta, POSICIONES };