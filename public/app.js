const API = "/jugadores";
const POSICIONES = ["portero", "defensa", "centrocampista", "delantero"];
const CAMPOS = ["nombre", "goles", "posicion", "titular"];

const $ = (id) => document.getElementById(id);

const estado = { offset: 0, total: 0 };
let peticionesEnCurso = 0;
let temporizador = null;

// ---------- Utilidades de red ----------

class ErrorApi extends Error {
  constructor(status, errors, mensaje) {
    super(mensaje);
    this.status = status;
    this.errors = errors;
  }
}

function mostrarIndicador(delta) {
  peticionesEnCurso += delta;
  $("indicador").hidden = peticionesEnCurso === 0;
}

// fetch no trata un 404 o un 500 como error: hay que comprobar response.ok
async function peticion(url, opciones = {}) {
  mostrarIndicador(1);
  try {
    const respuesta = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opciones,
    });

    if (!respuesta.ok) {
      let cuerpo = null;
      try {
        cuerpo = await respuesta.json();
      } catch {
        // la respuesta de error no traía JSON
      }
      const errors = cuerpo && Array.isArray(cuerpo.errors) ? cuerpo.errors : [];
      const mensaje = errors.length
        ? errors.map((e) => `${e.field}: ${e.message}`).join(" · ")
        : (cuerpo && cuerpo.error) || `Error ${respuesta.status}`;
      throw new ErrorApi(respuesta.status, errors, mensaje);
    }

    const total = respuesta.headers.get("X-Total-Count");
    const datos = respuesta.status === 204 ? null : await respuesta.json();
    return { datos, total: total === null ? null : Number(total) };
  } finally {
    mostrarIndicador(-1);
  }
}

function mensajeDeError(err) {
  if (err instanceof ErrorApi) return err.message;
  return "No se pudo conectar con el servidor. Comprueba que está arrancado.";
}

// ---------- Listado ----------

function construirConsulta() {
  const params = new URLSearchParams();
  const datos = new FormData($("form-filtros"));
  for (const [clave, valor] of datos.entries()) {
    if (valor === "") continue;
    if (clave === "order" && !datos.get("sort")) continue;
    params.set(clave, valor);
  }
  params.set("offset", String(estado.offset));
  return params;
}

function hayFiltros() {
  const datos = new FormData($("form-filtros"));
  return ["search", "titular", "posicion"].some((c) => datos.get(c) !== "");
}

function mostrarMensaje(texto) {
  const caja = $("mensaje-error");
  caja.textContent = texto || "";
  caja.hidden = !texto;
}

async function cargarJugadores() {
  try {
    const { datos, total } = await peticion(`${API}?${construirConsulta()}`);
    estado.total = total ?? datos.length;
    const limite = Number(new FormData($("form-filtros")).get("limit"));

    // Si borramos el último elemento de una página, volvemos a la anterior
    if (datos.length === 0 && estado.offset > 0 && estado.total > 0) {
      estado.offset = (Math.ceil(estado.total / limite) - 1) * limite;
      return cargarJugadores();
    }

    mostrarMensaje("");
    pintarTabla(datos);
    pintarPaginacion(datos.length, limite);
  } catch (err) {
    estado.total = 0;
    pintarTabla([]);
    $("lista-vacia").hidden = true;
    mostrarMensaje(mensajeDeError(err));
    pintarPaginacion(0, 1);
  }
}

function celda(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function boton(texto, clase, accion) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `boton ${clase}`;
  b.textContent = texto;
  b.addEventListener("click", accion);
  return b;
}

function pintarTabla(jugadores) {
  const tabla = $("tabla");
  tabla.replaceChildren();

  const vacio = jugadores.length === 0;
  $("tabla-contenedor").hidden = vacio;
  const aviso = $("lista-vacia");
  aviso.hidden = !vacio || !$("mensaje-error").hidden;
  aviso.textContent = hayFiltros()
    ? "Ningún jugador coincide con los filtros."
    : "Todavía no hay jugadores. Crea el primero con el formulario.";

  for (const j of jugadores) {
    const fila = document.createElement("tr");
    fila.append(celda(j.nombre), celda(j.posicion), celda(j.goles), celda(j.titular ? "Sí" : "No"));

    const acciones = document.createElement("td");
    acciones.className = "acciones-fila";
    acciones.append(
      boton("Editar", "boton-secundario", () => empezarEdicion(j)),
      boton("Eliminar", "boton-peligro", () => eliminar(j)),
    );
    fila.append(acciones);
    tabla.append(fila);
  }
}

function pintarPaginacion(cantidad, limite) {
  const desde = cantidad === 0 ? 0 : estado.offset + 1;
  const hasta = estado.offset + cantidad;
  $("info-pagina").textContent = `Mostrando ${desde}–${hasta} de ${estado.total}`;
  $("pagina-anterior").disabled = estado.offset === 0;
  $("pagina-siguiente").disabled = estado.offset + limite >= estado.total;
}

// ---------- Estadísticas ----------

function dato(etiqueta, valor) {
  const caja = document.createElement("div");
  caja.className = "dato";
  const e = document.createElement("span");
  e.className = "etiqueta";
  e.textContent = etiqueta;
  const v = document.createElement("strong");
  v.textContent = valor;
  caja.append(e, v);
  return caja;
}

async function cargarEstadisticas() {
  try {
    const { datos: s } = await peticion(`${API}/stats`);
    const caja = $("stats");
    caja.replaceChildren(
      dato("Jugadores", s.total),
      dato("Titulares", s.titulares),
      dato("Media de goles", s.mediaGoles),
      ...Object.entries(s.porPosicion).map(([posicion, n]) => dato(posicion, n)),
    );
  } catch (err) {
    $("stats").textContent = mensajeDeError(err);
  }
}

function refrescar() {
  return Promise.all([cargarJugadores(), cargarEstadisticas()]);
}

// ---------- Formulario ----------

function limpiarErrores() {
  for (const campo of CAMPOS) {
    $(`error-${campo}`).textContent = "";
    $(campo).removeAttribute("aria-invalid");
  }
  $("error-formulario").hidden = true;
  $("error-formulario").textContent = "";
}

function mostrarErrores(errores) {
  const generales = [];
  for (const { field, message } of errores) {
    if (CAMPOS.includes(field)) {
      $(`error-${field}`).textContent = message;
      $(field).setAttribute("aria-invalid", "true");
    } else {
      generales.push(message);
    }
  }
  if (generales.length) mostrarErrorFormulario(generales.join(" · "));
}

function mostrarErrorFormulario(texto) {
  $("error-formulario").textContent = texto;
  $("error-formulario").hidden = false;
}

function leerFormulario() {
  const goles = $("goles").value.trim();
  return {
    nombre: $("nombre").value.trim(),
    goles: goles === "" ? undefined : Number(goles),
    titular: $("titular").checked,
    posicion: $("posicion").value || undefined,
  };
}

// Validación inicial en el cliente (el servidor vuelve a validar siempre)
function validarCliente(d) {
  const errores = [];
  if (!d.nombre) {
    errores.push({ field: "nombre", message: "El nombre es obligatorio" });
  } else if (d.nombre.length > 60) {
    errores.push({ field: "nombre", message: "El nombre no puede superar 60 caracteres" });
  }
  if (d.goles !== undefined && (!Number.isInteger(d.goles) || d.goles < 0 || d.goles > 100)) {
    errores.push({ field: "goles", message: "Los goles deben ser un entero entre 0 y 100" });
  }
  if (!d.posicion || !POSICIONES.includes(d.posicion)) {
    errores.push({ field: "posicion", message: "Elige una posición" });
  }
  return errores;
}

function empezarEdicion(j) {
  limpiarErrores();
  $("jugador-id").value = j.id;
  $("nombre").value = j.nombre;
  $("goles").value = j.goles;
  $("posicion").value = j.posicion;
  $("titular").checked = j.titular;
  $("titulo-formulario").textContent = `Editar jugador #${j.id}`;
  $("boton-cancelar").hidden = false;
  $("formulario").scrollIntoView({ behavior: "smooth" });
  $("nombre").focus();
}

function cancelarEdicion() {
  limpiarErrores();
  $("form-jugador").reset();
  $("jugador-id").value = "";
  $("titulo-formulario").textContent = "Nuevo jugador";
  $("boton-cancelar").hidden = true;
}

async function guardar(evento) {
  evento.preventDefault();
  limpiarErrores();

  const datos = leerFormulario();
  const errores = validarCliente(datos);
  if (errores.length) {
    mostrarErrores(errores);
    return;
  }

  const id = $("jugador-id").value;
  // La edición envía el formulario completo, por eso usa PUT (sustitución completa)
  const metodo = id ? "PUT" : "POST";
  const url = id ? `${API}/${id}` : API;

  $("boton-guardar").disabled = true;
  try {
    await peticion(url, { method: metodo, body: JSON.stringify(datos) });
    cancelarEdicion();
    await refrescar();
  } catch (err) {
    if (err instanceof ErrorApi && err.status === 400) {
      mostrarErrores(err.errors);
    } else {
      mostrarErrorFormulario(mensajeDeError(err));
    }
  } finally {
    $("boton-guardar").disabled = false;
  }
}

async function eliminar(j) {
  if (!confirm(`¿Eliminar a ${j.nombre}?`)) return;
  try {
    await peticion(`${API}/${j.id}`, { method: "DELETE" });
    if ($("jugador-id").value === String(j.id)) cancelarEdicion();
    await refrescar();
  } catch (err) {
    mostrarMensaje(mensajeDeError(err));
  }
}

// ---------- Eventos ----------

$("form-jugador").addEventListener("submit", guardar);
$("boton-cancelar").addEventListener("click", cancelarEdicion);

// Cualquier cambio de filtro vuelve a pedir la lista al servidor.
// El filtrado se hace en el servidor, no en el navegador.
$("form-filtros").addEventListener("submit", (e) => e.preventDefault());
$("form-filtros").addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    estado.offset = 0;
    cargarJugadores();
  }, 250);
});

$("pagina-anterior").addEventListener("click", () => {
  const limite = Number(new FormData($("form-filtros")).get("limit"));
  estado.offset = Math.max(0, estado.offset - limite);
  cargarJugadores();
});

$("pagina-siguiente").addEventListener("click", () => {
  const limite = Number(new FormData($("form-filtros")).get("limit"));
  estado.offset += limite;
  cargarJugadores();
});

refrescar();