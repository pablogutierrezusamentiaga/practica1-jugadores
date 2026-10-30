let jugadores = [];
let siguienteId = 1;

function listar() {
  return jugadores;
}

function obtener(id) {
  return jugadores.find((j) => j.id === id) || null;
}

function crear(datos) {
  const jugador = { id: siguienteId++, ...datos };
  jugadores.push(jugador);
  return jugador;
}

function reemplazar(id, datos) {
  const indice = jugadores.findIndex((j) => j.id === id);
  if (indice === -1) return null;
  jugadores[indice] = { id, ...datos };
  return jugadores[indice];
}

function actualizar(id, cambios) {
  const indice = jugadores.findIndex((j) => j.id === id);
  if (indice === -1) return null;
  jugadores[indice] = { ...jugadores[indice], ...cambios, id };
  return jugadores[indice];
}

function eliminar(id) {
  const indice = jugadores.findIndex((j) => j.id === id);
  if (indice === -1) return false;
  jugadores.splice(indice, 1);
  return true;
}

module.exports = { listar, obtener, crear, reemplazar, actualizar, eliminar };