const store = require("../data/store");
const { validarJugador } = require("../validators/jugadoresValidator");

function leerId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noEncontrado(res) {
  return res.status(404).json({ error: "Jugador no encontrado" });
}

function datosNoValidos(res, errors) {
  return res.status(400).json({ error: "Datos no válidos", errors });
}

// GET /jugadores
function listarJugadores(req, res) {
  return res.status(200).json(store.listar());
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
  const { errors, datos } = validarJugador(req.body);
  if (errors.length > 0) return datosNoValidos(res, errors);

  const jugador = store.crear(datos);
  return res.status(201).location(`/jugadores/${jugador.id}`).json(jugador);
}

// PUT /jugadores/:id  (sustitución completa)
function reemplazarJugador(req, res) {
  const id = leerId(req.params.id);
  if (id === null || !store.obtener(id)) return noEncontrado(res);

  const { errors, datos } = validarJugador(req.body);
  if (errors.length > 0) return datosNoValidos(res, errors);

  return res.status(200).json(store.reemplazar(id, datos));
}

// PATCH /jugadores/:id  (actualización parcial)
function actualizarJugador(req, res) {
  const id = leerId(req.params.id);
  if (id === null || !store.obtener(id)) return noEncontrado(res);

  const { errors, datos } = validarJugador(req.body, { parcial: true });
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
  obtenerJugador,
  crearJugador,
  reemplazarJugador,
  actualizarJugador,
  eliminarJugador,
};