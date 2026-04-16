# 🚗⚙️ AutoGestión Lubriteca

Sistema web para gestión de clientes, alertas, historial, contactados y agenda de citas.

---

## 🧩 Estructura actual del proyecto

```text
autogestionLubriteca/
├── index.html
├── styles.css
└── js/
    ├── config.js
    ├── storage.js
    ├── utils.js
    ├── ui-tablas.js
    ├── contactados.js
    ├── historial.js
    ├── notifications.js
    ├── agenda.js
    ├── clientes.js
    ├── sync.js
    ├── auth.js
    ├── navigation.js
    ├── main.js
    └── servidor.js
```

## 📦 ¿Qué hace cada archivo?

| Archivo | Rol general | Funciones principales |
|---|---|---|
| `js/config.js` | Configuración global y constantes. | `urlGoogle`, `USUARIOS`, `ESPACIOS`, `HORAS`, `HORAS_DISPLAY` |
| `js/storage.js` | Acceso a `localStorage` para persistencia local. | `get/setClientes`, `get/setHistorialDB`, `get/setContactados`, `get/setIdsContactados`, `get/setCitas` |
| `js/utils.js` | Utilidades de fechas e IDs. | `getHoy`, `diasRestantes`, `fechaHoraActual`, `formatearFechaLarga`, `generarIdCliente` |
| `js/ui-tablas.js` | Render UI de estadísticas y tablas (alertas/base de datos). | `actualizarStats`, `buildBadge`, `construirFila`, `mostrarAlertas`, `mostrarGeneral`, `filtrarGeneral`, `limpiarBuscadorGeneral` |
| `js/contactados.js` | Lógica de marcación y listado de contactados. | `toggleContactado`, `actualizarBadgeContactados`, `mostrarContactados`, `eliminarLogContactado`, `filtrarContactados`, `limpiarBuscadorContactados` |
| `js/historial.js` | Búsqueda y render del historial por placa. | `buscarHistorial`, `limpiarHistorial` |
| `js/notifications.js` | Notificaciones del navegador para citas del día. | `revisarCitasDeHoy`, `dispararNotificacion` |
| `js/agenda.js` | Flujo completo de reservas, agenda, detalle y drag & drop. | `abrirModalReservar`, `mostrarPaso2`, `seleccionarEspacio`, `mostrarHorasDisponibles`, `seleccionarHora`, `confirmarReserva`, `cerrarModalReservar`, `actualizarBadgeAgenda`, `irHoyAgenda`, `cambiarDiaAgenda`, `setFiltroAgenda`, `renderAgenda`, `siguienteHora`, `eliminarCita`, `verDetalleCita`, `cerrarDetalleCita`, `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`, `mostrarToastError` |
| `js/clientes.js` | Alta/edición/eliminación de clientes + migración a historial. | `migrarClientesAHistorial`, submit de `clienteForm`, `eliminarCliente`, `abrirModalEditar`, `guardarEdicion` |
| `js/sync.js` | Sincronización con Google Sheets y estado de carga. | `mostrarCargando`, `sincronizarConSheets`, `sincronizarSoloCitas` |
| `js/auth.js` | Inicio/cierre de sesión y arranque de la app. | `verificarSesion`, `intentarLogin`, `mostrarApp`, `cerrarSesion`, `togglePassword` |
| `js/navigation.js` | Menú lateral, tabs y eventos globales de UI. | `toggleMenu`, `cerrarMenu`, `seleccionarTab`, `setInterval` de sync, listener `Escape` |
| `js/main.js` | Archivo legacy/puente con piezas aún no extraídas. | `waMsgAutorizacion`, `enviarAutorizacion`, `mostrarToast`, `abrirModalEliminar`, `cerrarModalEliminar`, `confirmarEliminar`, `cerrarModalEditar`, init (`DOMContentLoaded`), estados globales (`reservarEspacioActual`, `reservarHoraActual`, `idPendienteEliminar`) |
| `js/servidor.js` | Servidor estático local en Node.js para servir la app en red local. | Crea servidor HTTP y publica `index.html`/assets (`IP`, `PORT`, `TIPOS`) |

---

## 🔄 Flujo general de la app (resumen)

1. **Auth:** valida sesión o login (`auth.js`).
2. **Carga inicial:** migra historial, renderiza stats/alertas, revisa notificaciones.
3. **Sync:** trae datos remotos de Sheets (`sync.js`) y fusiona con local.
4. **Operación diaria:** clientes, contactados, historial y agenda.
5. **Navegación:** tabs y refrescos periódicos (`navigation.js`).

---

## 🧠 Dependencias prácticas entre módulos

- `config.js` + `storage.js` + `utils.js` son la base.
- `ui-tablas.js`, `contactados.js`, `historial.js`, `agenda.js`, `clientes.js`, `sync.js` consumen esa base.
- `auth.js` depende de varios módulos de negocio/UI para mostrar la app completa.
- `navigation.js` coordina vistas y re-sync periódico.
- `main.js` mantiene funciones globales que el HTML todavía invoca directamente.
