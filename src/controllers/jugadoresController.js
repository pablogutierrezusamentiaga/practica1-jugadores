const store = require("../data/store");
const {
  validateJugador,
  validarConsulta,
  POSICIONES,
} = require("../validators/jugadoresValidator");

function leerId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noEncontrado(res) {
  return res.status(404).json({ error: "Jugador no encontrado" });
}

function datosNoValidos(res, errors) {
  return res.status(400).json({ errors });
}

// GET /jugadores?search=&titular=&posicion=&sort=&order=&limit=&offset=
// El filtrado, el orden y la paginación se hacen en el servidor.
function listarJugadores(req, res) {
  const { errors, opciones } = validarConsulta(req.query);
  if (errors.length > 0) return datosNoValidos(res, errors);

  let resultado = store.listar().filter((j) => {
    if (opciones.search && !j.nombre.toLowerCase().includes(opciones.search)) return false;
    if (opciones.titular !== undefined && j.titular !== opciones.titular) return false;
    if (opciones.posicion && j.posicion !== opciones.posicion) return false;
    return true;
  });

  if (opciones.sort) {
    const factor = opciones.order === "desc" ? -1 : 1;
    resultado = [...resultado].sort((a, b) => {
      const comparacion =
        opciones.sort === "nombre"
          ? a.nombre.localeCompare(b.nombre, "es")
          : a.goles - b.goles;
      return comparacion * factor || a.id - b.id;
    });
  }

  // Total antes de paginar, útil para el cliente
  res.set("X-Total-Count", String(resultado.length));

  const fin = opciones.limit ? opciones.offset + opciones.limit : undefined;
  return res.status(200).json(resultado.slice(opciones.offset, fin));
}

// GET /jugadores/stats
function estadisticas(req, res) {
  const lista = store.listar();
  const totalGoles = lista.reduce((suma, j) => suma + j.goles, 0);

  const porPosicion = {};
  for (const posicion of POSICIONES) {
    porPosicion[posicion] = lista.filter((j) => j.posicion === posicion).length;
  }

  return res.status(200).json({
    total: lista.length,
    titulares: lista.filter((j) => j.titular).length,
    mediaGoles: lista.length ? Math.round((totalGoles / lista.length) * 100) / 100 : 0,
    porPosicion,
  });
}

// GET /jugadores/:id
function obtenerJugador(req, res) {
  const id = leerId(req.params.id);
  const jugador = id === null ? null : store.obtener(id);
  if (!jugador) return noEncontrado(res);
  return res.status(200).json(jugador);
}

// POST /jugadores
function crearJugador(req, res) {
  const { errors, datos } = validateJugador(req.body);
  if (errors.length > 0) return datosNoValidos(res, errors);

  const jugador = store.crear(datos);
  return res.status(201).location(`/jugadores/${jugador.id}`).json(jugador);
}

// PUT /jugadores/:id  (sustitución completa)
function reemplazarJugador(req, res) {
  const id = leerId(req.params.id);
  if (id === null || !store.obtener(id)) return noEncontrado(res);

  const { errors, datos } = validateJugador(req.body);
  if (errors.length > 0) return datosNoValidos(res, errors);

  return res.status(200).json(store.reemplazar(id, datos));
}

// PATCH /jugadores/:id  (actualización parcial)
function actualizarJugador(req, res) {
  const id = leerId(req.params.id);
  if (id === null || !store.obtener(id)) return noEncontrado(res);

  const { errors, datos } = validateJugador(req.body, { partial: true });
  if (errors.length > 0) return datosNoValidos(res, errors);

  return res.status(200).json(store.actualizar(id, datos));
}

// DELETE /jugadores/:id
function eliminarJugador(req, res) {
  const id = leerId(req.params.id);
  if (id === null || !store.eliminar(id)) return noEncontrado(res);
  return res.status(204).send();
}

module.exports = {
  listarJugadores,
  estadisticas,
  obtenerJugador,
  crearJugador,
  reemplazarJugador,
  actualizarJugador,
  eliminarJugador,
};