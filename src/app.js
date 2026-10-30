const express = require("express");
const logger = require("./middleware/logger");
const jugadoresRouter = require("./routes/jugadores");
const app = express();

app.use(express.json());
app.use(logger);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/jugadores", jugadoresRouter);
// 404 en JSON para rutas no encontradas (antes del error handler)
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler centralizado: siempre el último, con 4 argumentos
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Error interno del servidor" : err.message,
  });
});

module.exports = app;