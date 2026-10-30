const express = require("express");
const {
  listarJugadores,
  obtenerJugador,
  crearJugador,
  reemplazarJugador,
  actualizarJugador,
  eliminarJugador,
} = require("../controllers/jugadoresController");

const router = express.Router();

router.get("/", listarJugadores);
router.post("/", crearJugador);
router.get("/:id", obtenerJugador);
router.put("/:id", reemplazarJugador);
router.patch("/:id", actualizarJugador);
router.delete("/:id", eliminarJugador);

module.exports = router;