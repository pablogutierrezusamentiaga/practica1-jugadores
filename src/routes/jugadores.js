const express = require("express");
const {
  listarJugadores,
  estadisticas,
  obtenerJugador,
  crearJugador,
  reemplazarJugador,
  actualizarJugador,
  eliminarJugador,
} = require("../controllers/jugadoresController");

const router = express.Router();

router.get("/", listarJugadores);
router.get("/stats", estadisticas); // antes de /:id, o "stats" se leería como un id
router.post("/", crearJugador);
router.get("/:id", obtenerJugador);
router.put("/:id", reemplazarJugador);
router.patch("/:id", actualizarJugador);
router.delete("/:id", eliminarJugador);

module.exports = router;