const POSICIONES = ["portero", "defensa", "centrocampista", "delantero"];

// parcial = false -> POST y PUT (objeto completo, con valores por defecto)
// parcial = true  -> PATCH (solo se validan los campos enviados)
// Los campos desconocidos y el id enviado por el cliente se ignoran.
function validarJugador(body, { parcial = false } = {}) {
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
  } else if (!parcial) {
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
  } else if (!parcial) {
    datos.goles = 0;
  }

  // titular: booleano (por defecto false)
  if (tiene("titular")) {
    if (typeof entrada.titular !== "boolean") {
      errors.push({ field: "titular", message: "El campo titular debe ser true o false" });
    } else {
      datos.titular = entrada.titular;
    }
  } else if (!parcial) {
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
  } else if (!parcial) {
    errors.push({ field: "posicion", message: "La posición es obligatoria" });
  }

  // PATCH sin ningún campo válido
  if (parcial && errors.length === 0 && Object.keys(datos).length === 0) {
    errors.push({ field: "body", message: "Debes enviar al menos un campo para actualizar" });
  }

  return { errors, datos };
}

module.exports = { validarJugador, POSICIONES };