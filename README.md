# PWA Reporte con Ubicación: geolocalización consciente y modular (`geo-helper.js`)

Aplicación web progresiva que adjunta la **ubicación del dispositivo** a un reporte técnico. La lectura está encapsulada en un módulo reutilizable basado en Promesas (`geo-helper.js`), se pide con un **Pre-Permiso** explicativo y siempre ofrece un **Plan B manual** si el permiso se deniega o la lectura falla.

**Demo:** https://amaurigc.github.io/pwa-geolocalizacion/

## Cómo funciona

1. **Módulo aparte:** `geo-helper.js` envuelve `navigator.geolocation.getCurrentPosition()` en `new Promise()` y siempre devuelve `{ latitud, longitud, precisionMetros, timestamp }`. No toca el DOM.
2. **Estado del permiso:** al pulsar **Adjuntar mi ubicación**, `consultarEstadoPermisoGeo()` usa la Permissions API:
   - `granted` → lee la ubicación directamente.
   - `prompt` → muestra la **tarjeta de Pre-Permiso**; la lectura real se dispara al pulsar **Permitir y obtener ubicación**, dentro del clic (requisito de iPhone).
   - `denied` → muestra el **selector manual de zona** y cómo reactivar el permiso.
3. **Errores traducidos:** los códigos `1` (denegado), `2` (no disponible) y `3` (TIMEOUT) se convierten en mensajes claros. Con TIMEOUT se ofrece **reintentar con baja precisión**.
4. **Indicador de precisión:** `coords.accuracy` en metros. Si es **< 30 m**: *Precisión GPS Alta*; si no: *Ubicación Aproximada (Wi-Fi / IP)*.
5. **Reutilización:** el mismo helper se usa en `enviarReporteConUbicacion()` (alta precisión) y en `lecturaRapidaBajaPrecision()` (baja precisión, para comparar).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `geo-helper.js` | Promesas de geolocalización, estado del permiso, traducción de errores y clasificación de precisión |
| `app.js` | Registro del SW, flujo de Pre-Permiso, Plan B, indicador de precisión e instalación |
| `index.html` | Reporte, tarjeta de Pre-Permiso, resultado, selector de zona; carga `geo-helper.js` **antes** que `app.js` |
| `styles.css` | Estilos; etiqueta verde (alta) y naranja (aproximada) |
| `sw.js` | Precaché del App Shell (incluye `./geo-helper.js`) con *Cache First* |
| `manifest.json`, `icons/` | Instalabilidad |

## Reglas técnicas

- JavaScript Vanilla, sin librerías.
- Sin `async/await`: solo `new Promise()`, `.then()`, `.catch()` y `.finally()`.
- Rutas relativas (`./`) y HTTPS en GitHub Pages.

## Probarlo

1. **Laptop:** Adjuntar → tarjeta → Permitir → suele salir *Ubicación Aproximada* con decenas o cientos de metros.
2. **Teléfono:** lo mismo → con GPS activo sale *Precisión GPS Alta* (mejor al aire libre).
3. **Denegar:** bloquea el permiso y vuelve a pulsar: aparece directo el selector manual.
4. **DevTools:** Application → Cache Storage → `static-geo-v2` contiene `geo-helper.js`. En *Sensors* se puede simular una ubicación.
