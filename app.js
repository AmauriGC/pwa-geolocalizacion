// app.js - Interfaz del reporte. Consume geo-helper.js sin conocer navigator.geolocation.
// Sin async/await: toda la asincronía usa .then(), .catch() y .finally().

// 1. Registrar el Service Worker (ruta relativa para GitHub Pages)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((reg) => console.log('[SW] Registrado. Scope:', reg.scope))
    .catch((err) => console.error('[SW] Error al registrar:', err));
}

// 2. Referencias a los elementos del HTML
const btnInstalar = document.getElementById('btn-instalar');
const campoTitulo = document.getElementById('campo-titulo');
const campoDescripcion = document.getElementById('campo-descripcion');
const btnAdjuntar = document.getElementById('btn-adjuntar-ubicacion');
const mensajeEstado = document.getElementById('mensaje-estado');

const tarjetaPrePermiso = document.getElementById('tarjeta-prepermiso');
const btnConfirmarUbicacion = document.getElementById('btn-confirmar-ubicacion');
const btnRechazarUbicacion = document.getElementById('btn-rechazar-ubicacion');

const tarjetaResultado = document.getElementById('tarjeta-resultado');
const etiquetaPrecision = document.getElementById('etiqueta-precision');
const datoLatitud = document.getElementById('dato-latitud');
const datoLongitud = document.getElementById('dato-longitud');
const datoPrecision = document.getElementById('dato-precision');
const datoHora = document.getElementById('dato-hora');

const tarjetaZonaManual = document.getElementById('tarjeta-zona-manual');
const motivoPlanB = document.getElementById('motivo-plan-b');
const instruccionesReactivar = document.getElementById('instrucciones-reactivar');
const selectorZona = document.getElementById('selector-zona');
const btnConfirmarZona = document.getElementById('btn-confirmar-zona');
const btnReintentarBaja = document.getElementById('btn-reintentar-baja');

const btnLecturaRapida = document.getElementById('btn-lectura-rapida');
const resultadoRapido = document.getElementById('resultado-rapido');

const tarjetaPaquete = document.getElementById('tarjeta-paquete');
const vistaPaquete = document.getElementById('vista-paquete');

// 3. Funciones de pantalla (solo DOM, nada de geolocalización aquí)
function mostrarCargando(texto) {
  mensajeEstado.textContent = texto;
  mensajeEstado.classList.remove('error');
  btnAdjuntar.disabled = true;
}

function mostrarMensajeError(texto) {
  mensajeEstado.textContent = texto;
  mensajeEstado.classList.add('error');
}

function ocultarTarjetas() {
  tarjetaPrePermiso.hidden = true;
  tarjetaZonaManual.hidden = true;
  btnReintentarBaja.hidden = true;
  instruccionesReactivar.hidden = true;
}

function leerFormulario() {
  return {
    titulo: campoTitulo.value.trim() || '(sin título)',
    descripcion: campoDescripcion.value.trim() || '(sin descripción)'
  };
}

function mostrarPaquete(paquete) {
  vistaPaquete.textContent = JSON.stringify(paquete, null, 2);
  tarjetaPaquete.hidden = false;
}

// Indicador de calidad de señal: metros + etiqueta Alta / Aproximada
function renderizarResultadoUbicacion(ubicacion) {
  const calidad = clasificarPrecision(ubicacion.precisionMetros);

  etiquetaPrecision.textContent = calidad.etiqueta;
  etiquetaPrecision.className = 'etiqueta ' + calidad.nivel;

  datoLatitud.textContent = ubicacion.latitud.toFixed(6);
  datoLongitud.textContent = ubicacion.longitud.toFixed(6);
  datoPrecision.textContent = '± ' + ubicacion.precisionMetros + ' m';
  datoHora.textContent = new Date(ubicacion.timestamp).toLocaleTimeString();

  tarjetaResultado.hidden = false;
  mensajeEstado.textContent = 'Ubicación adjuntada con un margen de ± ' + ubicacion.precisionMetros + ' m.';
  mensajeEstado.classList.remove('error');
}

// Plan B: el usuario nunca se queda bloqueado
function habilitarSelectorManualZona(motivo, opciones) {
  const config = opciones || {};
  tarjetaPrePermiso.hidden = true;
  motivoPlanB.textContent = motivo || 'Selecciona la zona donde se encuentra el problema.';
  instruccionesReactivar.hidden = !config.mostrarInstrucciones;
  btnReintentarBaja.hidden = !config.permitirReintento;
  tarjetaZonaManual.hidden = false;
}

// 4. USO 1 del módulo: adjuntar coordenadas de ALTA precisión al reporte
function enviarReporteConUbicacion(opcionesGeo) {
  ocultarTarjetas();
  mostrarCargando('Obteniendo coordenadas...');

  return obtenerUbicacionActual(opcionesGeo || { enableHighAccuracy: true, timeout: 8000 })
    .then((ubicacion) => {
      const paqueteCompleto = Object.assign({}, leerFormulario(), {
        origenUbicacion: 'dispositivo',
        coordenadas: ubicacion
      });
      console.log('Paquete listo para enviar o encolar en IndexedDB:', paqueteCompleto);
      renderizarResultadoUbicacion(ubicacion);
      mostrarPaquete(paqueteCompleto);
    })
    .catch((error) => {
      console.warn('[Geo] Fallback activado:', error.message);
      mostrarMensajeError(error.message);
      habilitarSelectorManualZona(error.message, {
        mostrarInstrucciones: error.codigo === 1, // PERMISSION_DENIED
        permitirReintento: error.codigo === 3     // TIMEOUT: típico en laptops sin GPS
      });
    })
    .finally(() => {
      btnAdjuntar.disabled = false;
    });
}

// 5. USO 2 del módulo: lectura rápida de BAJA precisión (otras opciones, mismo helper)
function lecturaRapidaBajaPrecision() {
  resultadoRapido.textContent = 'Leyendo...';
  resultadoRapido.classList.remove('error');

  return obtenerUbicacionActual({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
    .then((ubicacion) => {
      const calidad = clasificarPrecision(ubicacion.precisionMetros);
      resultadoRapido.textContent = 'Baja precisión: ± ' + ubicacion.precisionMetros + ' m → ' + calidad.etiqueta;
    })
    .catch((error) => {
      resultadoRapido.textContent = error.message;
      resultadoRapido.classList.add('error');
    });
}

// 6. Flujo de Pre-Permiso del botón principal
btnAdjuntar.addEventListener('click', () => {
  ocultarTarjetas();

  consultarEstadoPermisoGeo().then((estado) => {
    console.log('[Geo] Estado del permiso:', estado);

    if (estado === 'granted') {
      // Ya lo había aceptado antes: no hace falta explicar otra vez
      enviarReporteConUbicacion();
    } else if (estado === 'denied') {
      // Bloqueado: JS ya no puede volver a mostrar el diálogo nativo
      mostrarMensajeError('El permiso de ubicación está bloqueado en este navegador.');
      habilitarSelectorManualZona('El permiso de ubicación está bloqueado. Elige tu zona o reactívalo:', {
        mostrarInstrucciones: true
      });
    } else {
      // 'prompt': nunca se ha preguntado. Primero explicamos.
      tarjetaPrePermiso.hidden = false;
      mensajeEstado.textContent = 'Lee el aviso antes de compartir tu ubicación.';
      mensajeEstado.classList.remove('error');
    }
  });
});

// La lectura real se dispara DIRECTAMENTE dentro de este clic (requisito de Safari/iOS)
btnConfirmarUbicacion.addEventListener('click', () => {
  tarjetaPrePermiso.hidden = true;
  enviarReporteConUbicacion();
});

btnRechazarUbicacion.addEventListener('click', () => {
  habilitarSelectorManualZona('Sin problema. Elige la zona donde se encuentra el problema.');
});

// Tras un TIMEOUT: reintento sin forzar el GPS (Wi-Fi / IP responde más rápido)
btnReintentarBaja.addEventListener('click', () => {
  enviarReporteConUbicacion({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
});

btnConfirmarZona.addEventListener('click', () => {
  if (!selectorZona.value) {
    motivoPlanB.textContent = 'Primero elige una zona de la lista.';
    return;
  }
  const paqueteManual = Object.assign({}, leerFormulario(), {
    origenUbicacion: 'manual',
    zona: selectorZona.value
  });
  console.log('Paquete con zona manual:', paqueteManual);

  tarjetaResultado.hidden = true;
  tarjetaZonaManual.hidden = true;
  mensajeEstado.textContent = 'Zona manual adjuntada: ' + selectorZona.value;
  mensajeEstado.classList.remove('error');
  mostrarPaquete(paqueteManual);
});

btnLecturaRapida.addEventListener('click', () => {
  lecturaRapidaBajaPrecision();
});

// 7. Instalación personalizada (Chrome / Android), igual que en el tema 6.1
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;
  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') btnInstalar.hidden = true;
    })
    .finally(() => {
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
});
