# Copilot Instructions for `autogestionLubriteca`

## Build, test, and lint

This repository currently has **no configured build, test, or lint toolchain** (no `package.json`, test runner config, or lint config in repo root).

- **Build:** Not configured
- **Test suite:** Not configured
- **Single test execution:** Not configured
- **Lint:** Not configured

## High-level architecture

This is a browser-only SPA served from `index.html`, with plain JavaScript files loaded via `<script defer>` in a strict order. There is no module bundler; functions are global and shared across files.

1. **Bootstrapping and app shell**
   - `index.html` defines all tabs/modals and inline `onclick`/`onsubmit` handlers.
   - `js/main.js` starts initialization (`DOMContentLoaded`), session check, and shared modal/global state.
   - `js/auth.js` handles login, role storage (`sessionStorage.ag_role`), and first app render.
   - `js/navigation.js` controls tab switching and tab-triggered renders.

2. **Backend access and data sources**
   - Backend base URL is hardcoded in `js/config.js` as `API_BACKEND_URL`.
   - `js/storage.js` provides base fetchers for customers, history, contacted records, and reservations.
   - Domain API wrappers:
     - `js/usuarios-api.js` for users/recommendations/points
     - `js/pedidosAPI.js` for orders
     - `js/estadisticas-api.js` for ranking/points edits

3. **Feature modules (UI + domain behavior)**
   - Customers/alerts/table rendering: `js/ui-tablas.js`, `js/clientes.js`, `js/contactados.js`, `js/historial.js`
   - Reservations/agenda: `js/agenda.js`, `js/listaCitas.js`, `js/notifications.js`
   - Users/recommendations/points: `js/usuarios.js`, `js/estadisticas.js`, `js/logins.js`
   - Orders: `js/pedidos.js`, `js/pedidosRegistrados.js`

4. **Realtime refresh**
   - `js/sync.js` opens an `EventSource` (`/eventos`) and refreshes affected tabs/badges when backend events arrive.
   - Mutation flows usually end by re-rendering active views plus badge counters (instead of local state stores).

## Key repository conventions

1. **Keep functions global and HTML-callable**
   - UI actions are mostly triggered from inline HTML handlers (`onclick="..."`, `onsubmit="..."` in `index.html`), so renamed/moved functions must remain globally accessible.
   - Script load order in `index.html` is part of runtime coupling; avoid introducing dependencies that require a different order unless you also update script tags.

2. **Use backend field names and normalization patterns consistently**
   - Common payload fields: `name`, `telephone`, `plate`, `service`, `entryDate`, `nextContact`, `mileage`, etc.
   - IDs are frequently normalized with `String(...)` before comparisons.
   - Plates and many search inputs are normalized to uppercase/trimmed before filtering or sending.

3. **Date logic is string-based (`YYYY-MM-DD`)**
   - `getHoy()` (`js/utils.js`) returns `en-CA` date strings.
   - Many comparisons rely on lexical date ordering (`f < hoy`, `f === hoy`) instead of `Date` objects.
   - Keep date formats consistent when adding/altering flows, especially in agenda/history.

4. **Role gating is UI-driven**
   - Admin-only actions are hidden/disabled based on `sessionStorage.getItem('ag_role') === 'admin'` (see `auth.js`, `agenda.js`, `usuarios.js`, `listaCitas.js`).
   - If you add privileged actions, follow the same frontend gating pattern for consistency.

5. **Prefer existing refresh pattern after writes**
   - After POST/PATCH/DELETE calls, modules typically trigger targeted redraws (badges + active tab content) instead of trying to mutate cached arrays in place.
   - Reuse existing refresh functions like `actualizarBadge*`, `mostrar*`, `render*` to keep behavior aligned with SSE-driven updates.
