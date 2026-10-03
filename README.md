# 🚗⚙️ AutoGestión Lubriteca

Sistema web para gestión de clientes, alertas, historial, contactados y agenda de citas.

---

## 🧩 Estructura actual del proyecto

```text
autogestionLubriteca/
├── index.html
├── css/
│   ├── base.css
│   ├── shared.css
│   └── features/
│       ├── historial.css
│       ├── citas.css
│       ├── pedidos.css
│       ├── estadisticas.css
│       ├── usuarios.css
│       └── clientes.css
└── js/
    ├── core/          config.js  main.js  navigation.js  auth.js  logins.js
    ├── store/         storage.js  sync.js
    ├── shared/        utils.js  ui-tablas.js  notifications.js
    └── features/
        ├── clientes/     clientes.js  contactados.js
        ├── citas/        agenda.js  listaCitas.js
        ├── usuarios/     usuarios.js  usuarios-api.js
        ├── historial/    historial.js
        ├── pedidos/      pedidos.js  pedidosRegistrados.js
        └── estadisticas/ estadisticas.js  estadisticas-api.js
```

## 📦 ¿Qué hace cada archivo?

| Archivo | Rol general | Funciones principales |
|---|---|---|
| `js/core/config.js` | Configuración global y constantes. | `API_BACKEND_URL`, `USUARIOS`, `ESPACIOS`, `HORAS`, `HORAS_DISPLAY` |
| `js/store/storage.js` | Acceso a `localStorage` para persistencia local. | `get/setClientes`, `get/setHistorialDB`, `get/setContactados`, `get/setIdsContactados`, `get/setCitas` |
| `js/shared/utils.js` | Utilidades de fechas e IDs. | `getHoy`, `diasRestantes`, `fechaHoraActual`, `formatearFechaLarga`, `generarIdCliente` |
| `js/shared/ui-tablas.js` | Render UI de estadísticas y tablas (alertas/base de datos). | `actualizarStats`, `buildBadge`, `construirFila`, `mostrarAlertas`, `mostrarGeneral`, `filtrarGeneral`, `limpiarBuscadorGeneral` |
| `js/features/clientes/contactados.js` | Lógica de marcación y listado de contactados. | `toggleContactado`, `actualizarBadgeContactados`, `mostrarContactados`, `eliminarLogContactado`, `filtrarContactados`, `limpiarBuscadorContactados` |
| `js/features/historial/historial.js` | Búsqueda y render del historial por placa. | `buscarHistorial`, `limpiarHistorial` |
| `js/shared/notifications.js` | Notificaciones del navegador para citas del día. | `revisarCitasDeHoy`, `dispararNotificacion` |
| `js/features/citas/agenda.js` | Flujo completo de reservas, agenda, detalle y drag & drop. | `abrirModalReservar`, `mostrarPaso2`, `seleccionarEspacio`, `mostrarHorasDisponibles`, `seleccionarHora`, `confirmarReserva`, `cerrarModalReservar`, `actualizarBadgeAgenda`, `irHoyAgenda`, `cambiarDiaAgenda`, `setFiltroAgenda`, `renderAgenda`, `siguienteHora`, `eliminarCita`, `verDetalleCita`, `cerrarDetalleCita`, `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`, `mostrarToastError` |
| `js/features/clientes/clientes.js` | Alta/edición/eliminación de clientes + migración a historial. | `migrarClientesAHistorial`, submit de `clienteForm`, `eliminarCliente`, `abrirModalEditar`, `guardarEdicion` |
| `js/store/sync.js` | Sincronización en tiempo real por SSE, estado de carga y store en memoria. | `mostrarCargando`, `iniciarSSE`, `refrescarVistaClientes`, `refrescarModalRecomendados` |
| `js/core/auth.js` | Inicio/cierre de sesión y arranque de la app. | `verificarSesion`, `intentarLogin`, `mostrarApp`, `cerrarSesion`, `togglePassword` |
| `js/core/navigation.js` | Menú lateral, tabs y eventos globales de UI. | `toggleMenu`, `cerrarMenu`, `seleccionarTab`, `setInterval` de sync, listener `Escape` |
| `js/core/main.js` | Archivo legacy/puente con piezas aún no extraídas. | `waMsgAutorizacion`, `enviarAutorizacion`, `mostrarToast`, `abrirModalEliminar`, `cerrarModalEliminar`, `confirmarEliminar`, `cerrarModalEditar`, init (`DOMContentLoaded`), estados globales (`reservarEspacioActual`, `reservarHoraActual`, `idPendienteEliminar`) |

---

## 🔄 Flujo general de la app (resumen)

1. **Auth:** valida sesión o login (`auth.js`).
2. **Carga inicial:** migra historial, renderiza stats/alertas, revisa notificaciones.
3. **Sync:** conecta el SSE (`sync.js`), carga los Map de `storage.js` y los mantiene al día con cada evento.
4. **Operación diaria:** clientes, contactados, historial y agenda.
5. **Navegación:** tabs y refrescos periódicos (`navigation.js`).

---

## 🧠 Dependencias prácticas entre módulos

- `config.js` + `storage.js` + `utils.js` son la base.
- `ui-tablas.js`, `contactados.js`, `historial.js`, `agenda.js`, `clientes.js`, `sync.js` consumen esa base.
- `auth.js` depende de varios módulos de negocio/UI para mostrar la app completa.
- `navigation.js` coordina vistas y re-sync periódico.
- `main.js` mantiene funciones globales que el HTML todavía invoca directamente.
