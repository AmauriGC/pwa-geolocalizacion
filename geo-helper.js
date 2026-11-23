// geo-helper.js - Módulo reutilizable de geolocalización en Vanilla JS.
// Regla: este archivo NO toca el DOM. Solo habla con el navegador y devuelve Promesas.
// Así cualquier función de app.js (o de otro proyecto) puede pedir coordenadas sin duplicar código.

// Umbral en metros: por debajo se considera lectura de GPS; por encima, Wi-Fi o IP.
const UMBRAL_PRECISION_ALTA = 30;

// 1. Traduce los códigos numéricos nativos (1, 2, 3) a mensajes claros.
function traducirErrorGeolocalizacion(error) {
  switch (error.code) {
    case 1: // error.PERMISSION_DENIED
      return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
    case 2: // error.POSITION_UNAVAILABLE
      return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
    case 3: // error.TIMEOUT
      return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
    default:
      return 'Ocurrió un error inesperado al consultar la ubicación.';
  }
}

// 2. Envuelve getCurrentPosition() en una Promesa y normaliza la salida.
//    Quien la use recibe SIEMPRE { latitud, longitud, precisionMetros, timestamp }.
function obtenerUbicacionActual(opcionesPersonalizadas) {
  const opciones = Object.assign(
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000 // Acepta una lectura reciente de hasta 30 segundos
    },
    opcionesPersonalizadas
  );

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const errorSoporte = new Error('Este navegador no soporta la API de Geolocalización.');
      errorSoporte.codigo = 0;
      reject(errorSoporte);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionMetros: Math.round(posicion.coords.accuracy),
          timestamp: posicion.timestamp
        });
      },
      (error) => {
        const errorTraducido = new Error(traducirErrorGeolocalizacion(error));
        // Conservamos el código original (1, 2 o 3) para que app.js
        // pueda reaccionar distinto, por ejemplo reintentar si fue TIMEOUT.
        errorTraducido.codigo = error.code;
        reject(errorTraducido);
      },
      opciones
    );
  });
}

// 3. Consulta si el permiso ya fue otorgado, bloqueado o aún no se ha pedido.
//    Nunca falla: si la Permissions API no existe, asumimos 'prompt'.
function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator)) {
    return Promise.resolve('prompt');
  }

  return navigator.permissions.query({ name: 'geolocation' })
    .then((resultado) => resultado.state) // 'granted', 'denied' o 'prompt'
    .catch(() => 'prompt');
}

// 4. Diagnóstico de precisión: interpreta coords.accuracy (radio de error en metros).
function clasificarPrecision(precisionMetros) {
  if (precisionMetros < UMBRAL_PRECISION_ALTA) {
    return { nivel: 'alta', etiqueta: 'Precisión GPS Alta' };
  }
  return { nivel: 'aproximada', etiqueta: 'Ubicación Aproximada (Wi-Fi / IP)' };
}
