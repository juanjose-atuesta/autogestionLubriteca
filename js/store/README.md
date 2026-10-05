# El Store — caché en memoria del frontend

Documentación de referencia de `js/store/storage.js` y `js/store/sync.js`: qué guarda el
store, de dónde viene cada dato, quién lo lee para pintar pantalla, y cómo se actualiza
cuando alguien crea, edita o borra algo.

---

## 1. Qué es y por qué existe

El store es un objeto global con **`Map`s en memoria** que guarda una copia de los datos del
backend. No hay framework de estado; son estructuras nativas de JS.

Existe por dos motivos:

1. **Evitar N+1 requests.** Las tablas necesitan cruzar información (`clientes` × `citas`
   para saber si un cliente ya tiene reserva, `usuarios` para el ranking). Con el store eso es
   una lectura de memoria.
2. **Reflejar cambios de otros usuarios al instante.** El backend emite eventos SSE; el store
   es el punto donde esos eventos se materializan.

```js
const store = {
  clientes: new Map(),
  citas: new Map(),
  citasConcluidas: new Map(),
  citasConcluidasCargado: false,
  usuarios: new Map(),
  usuariosCargado: false,
  pedidos: new Map(),
  pedidosCargado: false,
  contactados: new Map(),
  contactadosCargado: false,
  clientesDB: new Map(),
  clientesDBCargado: false,
};
```

`Map` y no `Object` porque las claves pueden ser `"."`, `"[object Object]"` o números grandes,
y `Map` conserva el tipo sin coerción ni colisiones de prototipo.

---

## 2. El flujo, en dos direcciones

### Lectura (pintar pantalla)

```
API  ──fetch inicial──►  Map del store  ──get*()──►  función que renderiza
```

### Escritura (crear / editar / borrar)

```
UI ──► fetch*API() ──► backend guarda ──► emite evento SSE
                                              │
                                              ▼
                          sync.js lo recibe ──► store.<map>.set() / .delete()
                                              │
                                              ▼
                                   refrescarVista*() ──► repinta
```

**Regla que no se debe romper:** ninguna función `fetch*API()` de escritura toca el store.
Se Moran porque el backend ya notificó el cambio por SSE, y volver a escribir el store
localmente duplicaría la fuente de verdad y rompería el caso de "otro usuario lo cambió".

Hay dos funciones que rompen ese patrón a propósito, y están documentadas como tales:
`guardarClienteEnStore()` y `quitarClienteDelStore()`, que solo se invocan desde handlers SSE.

---

## 3. Los atributos del store

Cada `Map` guarda documentos del backend **sin transformar**: los `Map` no normalizan campos,
solo eligen la clave. Los campos que se leen en la UI están listados abajo porque esa es la
"forma" que el store entrega a los renderizadores.

### 3.1 `store.clientes` — clientes **no contactados** (panel de alertas)

| | |
|---|---|
| **Clave** | `String(cliente.id)` — la cédula |
| **Lo llena** | `recargarClientes()` ← `fetchClientesAPI()` |
| **Endpoint** | `GET customers/customersListPanelPrincipal` |
| **Envuelve** | `data.customers` |

El backend ya devuelve solo los no contactados, así que este `Map` alimenta las alertas y las
estadísticas de "total / vencidas / hoy / al día" sin tener que filtrar.

**Campos que lee la UI** (`ui-tablas.js: construirFila`):

`id`, `name`, `telephone`, `plate`, `service`, `entryDate`, `nextContact`, `mileage`,
`wasContacted`, `reservationConcluded`, `notes`, `email`

> `mileage` acepta `"."` como "kilometraje no dado"; ese caso dispara el mensaje de WhatsApp
> alternativo que omite el kilometraje.
>
> `email` llega como `emial` (sin la `a`) en algunos documentos del backend; por eso hay que
> leer ambos.

### 3.2 `store.citas` — reservas activas

| | |
|---|---|
| **Clave** | `String(cita.reservationId)` |
| **Lo llena** | `recargarCitas()` ← `fetchCitasAPI()` |
| **Endpoint** | `GET reservations/reservationsList` |
| **Envuelve** | `data.reservationList` |

**Campos:** `reservationId`, `customerId`, `date`, `hour`, `space`, `plate`, `service`,
`notes`, `wasConcluded`

Se cruza con `clientes` por `customerId` en `construirFila()` para decidir el botón de
reservar: si tiene cita activa → "Reservado"; si solo tiene concluidas → "Concluido · Reservar";
si no tiene ninguna → "Reservar".

### 3.3 `store.citasConcluidas` — historial de citas (carga perezosa)

| | |
|---|---|
| **Clave** | `String(cita.reservationId)` |
| **Lo llena** | `recargarCitasConcluidas()` ← `fetchReservationsConcludedAPI()` |
| **Endpoint** | `GET reservations/getReservationsConcluded` |
| **Envuelve** | `data.reservationList \|\| data.reservations` |

**Único `Map` que filtra en el cliente:**

```js
citas.forEach(ct => {
  if (normalizarBooleanConcluido(ct.wasConcluded))
    store.citasConcluidas.set(String(ct.reservationId), ct);
});
```

`normalizarBooleanConcluido()` acepta `true`, `'true'`, `1`, `'1'` porque el backend no es
consistente en el tipo del booleano.

Solo se usa en la pestaña Historial. Es **perezoso**: no se carga en el arranque, se carga la
primera vez que se abre la pestaña, y el evento `reservacion-concluida` solo lo actualiza si ya
estaba cargado.

### 3.4 `store.usuarios` — usuarios registrados

| | |
|---|---|
| **Clave** | `claveUsuario(usuario)` — **no** es el `id` crudo (ver §5) |
| **Lo llena** | `recargarUsuarios()` ← `fetchUsuariosRegistradosAPI()` |
| **Endpoint** | `GET users/usersList` |
| **Envuelve** | `data.users` |

**Campos:** `_id`, `id` (cédula), `name`, `telephone`, `email`, `registrationDay`,
`totalPoints`, `pointsByRecommendation`, `pointsByFrecuentBuy`, `pointsByHighBuy`,
`recommendedUsers`

Los tres campos `pointsBy*` son los que edita el modal de estadísticas; `totalPoints` es un
derivado que **recalcula el backend**, nunca el frontend.

### 3.5 `store.pedidos`

| | |
|---|---|
| **Clave** | `String(pedido._id)` — el ObjectId de Mongo |
| **Lo llena** | `recargarPedidos()` ← `fetchPedidosAPI()` |
| **Endpoint** | `GET pedidos/getPedidos` |
| **Envuelve** | `data.pedidos` |

Aquí la clave **sí** es el `_id`, no la cédula: un pedido pertenece a un cliente, no a un
usuario registrado.

**Campos:** `_id`, `id`, `name`, `telephone`, `plate`, `type`, `mileage`, `oil`, `otros`,
`precioTotal`, `orden`, `vehicleMake`

`orden` es el campo que preserva el orden manual de las filas; `precioTotal` se muestra
formateado en la tabla.

### 3.6 `store.contactados` — historial de contactados

| | |
|---|---|
| **Clave** | `String(historial.id)` |
| **Lo llena** | `recargarContactados()` ← `fetchContactadosAPI()` |
| **Endpoint** | `GET historial/historialListCustomersContacted` |
| **Envuelve** | `data.customerList` |

**Campos:** `id`, `name`, `plate`, `service`

El `Map` es la lista de contactados, así que los handlers SSE **sacan** el documento cuando
`wasContacted` pasa a `false` en lugar de guardarlo con `false`.

### 3.7 `store.clientesDB` — todos los clientes (pestaña Base de datos)

| | |
|---|---|
| **Clave** | `String(cliente.id ?? cliente._id)` |
| **Lo llena** | `recargarClientesDB()` ← `fetchClientesDBAPI()` |
| **Endpoint** | `GET customers/customersList` |
| **Envuelve** | `data.customers` |

Contiene **todos** los clientes, incluidos los contactados. Es el complemento de
`store.clientes`, y los dos se mantienen sincronizados juntos:

```js
function guardarClienteEnStore(cliente) {
  const key = String(doc?.id ?? doc?._id ?? '');
  if (!doc || !key) return;
  store.clientesDB.set(key, doc);              // siempre
  if (doc.wasContacted) store.clientes.delete(key);  // sale del panel de alertas
  else store.clientes.set(key, doc);
}
```

**Consecuencia práctica:** `store.clientes` ⊂ `store.clientesDB`. Por eso el panel de alertas
no cuenta clientes ya contactados, sin necesidad de filtrar en cada render.

---

## 4. Banderas de carga y carga perezosa

Cinco atributos booleanos controlan si un `Map` ya fue descargado:

| Bandera | Evita |
|---|---|
| `usuariosCargado` | `GET users/usersList` en cada render |
| `pedidosCargado` | `GET pedidos/getPedidos` en cada render |
| `contactadosCargado` | `GET historial/…Contacted` en cada render |
| `clientesDBCargado` | `GET customers/customersList` en cada render |
| `citasConcluidasCargado` | `GET reservations/getReservationsConcluded` antes de abrir Historial |

El patrón siempre es el mismo — **cargar** (lazy) vs **recargar** (forzado):

```js
async function cargarX() {
  if (store.xCargado) return;   // ya está, no gasto un request
  await recargarX();
}
async function recargarX() { /* fetch + clear + set + marca la bandera */ }
```

Usar `recargar*` a mano invalida la bandera de forma implícita porque siempre vuelve a
preguntarle al backend.

---

## 5. Claves internas: por qué `claveUsuario()`

Este es el punto más delicado del store.

`users.id` **no es una clave única en la base de datos**: es la cédula, y puede venir como `"."`
cuando el cliente no quiere dar ese dato. Si se usara `String(usuario.id)` como clave, dos
usuarios distintos con cédula `"."` se pisarían en el `Map` y uno desaparecería de la pantalla.

```js
const CEDULA_SIN_DATO_USUARIO = ".";

function claveUsuario(usuario = {}) {
  const cedula = String(usuario?.id ?? '').trim();
  if (cedula && cedula !== CEDULA_SIN_DATO_USUARIO) return cedula;
  return String(usuario?._id ?? '').trim();   // cédula "." → ObjectId de Mongo
}
```

Reglas que se derivan de esto:

- La cédula real es la clave; el `_id` solo se usa cuando la cédula es `"."`.
- **Nunca** indexar `store.usuarios` con `usuario.id` directamente. Usar siempre
  `claveUsuario(usuario)` al escribir y `obtenerUsuarioPorClave(clave)` al leer.
- Si una edición **cambia la cédula**, la clave vieja queda huérfana. Por eso el handler
  `usuario-editado` recarga el `Map` completo en vez de hacer `set()`:

```js
if (store.usuarios.has(key) || _id === key) store.usuarios.set(key, usuario);
else await recargarUsuarios();   // la cédula cambió: hay que rehacer el Map
```

---

## 6. Lectura: getters y quién renderiza con ellos

Todos los getters devuelven `Promise.resolve(Array.from(map.values()))`, así que el consumidor
siempre es `await`/`then` aunque no haya I/O. Un `get*` **nunca** escribe en el store.

| Getter | Devuelve | Consumidores → qué pintan |
|---|---|---|
| `getClientes()` | clientes no contactados | `main.js` → `mostrarToast` y refresco general<br>`notifications.js` → avisos del navegador<br>`ui-tablas.js` → `actualizarStats()`, `mostrarAlertas()`, `mostrarGeneral()`, `construirFila()`<br>`clientes.js` → búsqueda y modales de cliente<br>`contactados.js` → `toggleContactado()` lee el estado actual |
| `getCitas()` | reservas activas | `ui-tablas.js` → cruce con clientes en `construirFila()`<br>`agenda.js` → `renderAgenda()`, `actualizarBadgeAgenda()`<br>`listaCitas.js` → `renderListaCitasProgramadas()`, `actualizarBadgeCitasProgramadas()`<br>`clientes.js` → badge y estado de reserva |
| `getReservationsConcluded()` | historial de citas | `historial.js` → `buscarHistorial()` |
| `getUsuariosRegistrados()` | usuarios | `usuarios.js` → `mostrarUsuarios()`, `actualizarBadgeUsuarios()`, `renderModalUsuariosRecomendados()`<br>`pedidos.js` → `renderModalUsuariosPedido()` |
| `getPedidosRegistrados()` | pedidos | `pedidosRegistrados.js` → `mostrarPedidos()`, `actualizarBadgePedidos()` |
| `getContactados()` | historial de contactados | `contactados.js` → `mostrarContactados()`, `actualizarBadgeContactados()` |
| `getClientesDB()` | todos los clientes | `ui-tablas.js` → tabla de la pestaña Base de datos |

### Funciones que mandan datos del store a la pantalla

| Función | Dibuja |
|---|---|
| `actualizarStats()` | 4 tarjetas: total / vencidas / hoy / al día |
| `mostrarAlertas()` | tabla de alertas (pendientes + vencidas) |
| `mostrarGeneral(filtro)` | tabla de la pestaña Base de datos |
| `buscarHistorial()` | tarjetas de historial de citas |
| `renderAgenda()` | cuadrícula de espacios × horas |
| `renderListaCitasProgramadas(filtro)` | tabla de citas programadas |
| `mostrarUsuarios(filtro)` | tabla de usuarios |
| `mostrarContactados(filtro)` | tabla de contactados |
| `mostrarPedidos(filtro)` | tabla de pedidos |
| `mostrarEstadisticas()` | ranking, gráficas y métricas de puntos |
| `renderModalUsuariosRecomendados()` / `renderModalUsuariosPedido()` / `renderModalSeleccionarUsuarioContactar()` | modales con datos del store |

Las que filtran por búsqueda (`mostrarGeneral`, `mostrarUsuarios`, `mostrarPedidos`,
`mostrarContactados`) reciben el texto del buscador y **no** dependen del store para filtrar:
leen todo el `Map` y filtran en memoria, por eso la recarga es barata.

### Refresco tras un evento SSE

Los handlers SSE no repintan directamente: llaman a un `refrescarVista*` que decide qué
vistas tocar, y solo si la pestaña correspondiente está visible.

| Refrescador | Qué repinta |
|---|---|
| `refrescarVistaClientes()` | `actualizarStats` + `mostrarAlertas` + `refrescarVistaGeneral` |
| `refrescarVistaCitas()` | badges, agenda, lista de citas, alertas, y Base de datos / Historial si están visibles |
| `refrescarVistaUsuarios()` | `mostrarUsuarios` + modal de búsqueda si está abierto |
| `refrescarVistaContactados()` | badge + `mostrarContactados` |
| `refrescarVistaGeneral()` | `mostrarGeneral` solo si la pestaña está activa |
| `refrescarPedidosSiVisible()` | `mostrarPedidos` solo si está en modo "hoy" o hay filtro |
| `refrescarModalRecomendados()` | modal de seleccionar usuario, recargando desde el store |
| `mostrarEstadisticasDebounced()` | `mostrarEstadisticas` con 500 ms de debounce |

---

## 7. Escritura: cómo se edita y borra la información

### 7.1 Funciones de escritura del store

Viven en `storage.js`, lanzan el `fetch` y **devuelven la respuesta o `null`**. No tocan el store.

| Función | Método | Endpoint | Consumida desde |
|---|---|---|---|
| `fetchSaveReservationAPI(payload)` | POST | `reservations/saveReservation` | `agenda.js:197` |
| `fetchEditReservationAPI(id, payload)` | PATCH | `reservations/editReservation/:id` | `listaCitas.js:110`, `agenda.js:487` (arrastrar y soltar) |
| `fetchDeleteReservationAPI(id)` | DELETE | `reservations/deleteReservation/:id` | `agenda.js:356` |
| `fetchReservationConcludedAPI(id)` | PATCH | `reservations/reservationConcluded/:id` | `agenda.js:85` |
| `fetchToogleReservationConcludedAPI(customerId)` | PATCH | `customers/toogleReservationConcluded/:customerId` | `agenda.js:88` |
| `fetchSavePedidoAPI(payload)` | POST | `pedidos/addPedido` | `pedidos.js:217` |
| `fetchEditPedidoAPI(_id, payload)` | PATCH | `pedidos/editPedido/:_id` | `pedidosRegistrados.js:246`, `pedidos.js:215` |
| `fetchDeletePedidoAPI(_id)` | DELETE | `pedidos/deletePedido/:_id` | `pedidosRegistrados.js:578` |
| `fetchToggleWasContactedClienteAPI(clienteId)` | PATCH | `customers/toogleWasContacted/:id` | `contactados.js:20` |
| `fetchToggleHistorialContactadoAPI(historialId)` | PATCH | `historial/toggleWasContacted/:id` | `contactados.js:28,98` |

Las escrituras de usuarios y sus sub-recursos (alta, edición, borrado, puntos, recomendaciones)
viven en `js/features/usuarios/usuarios-api.js`, no en el store, porque llevan la resolución
de duplicados y la normalización de cédula.

Todas siguen el mismo molde de URL, que es donde vive la lógica de identidad:

```js
function urlUsuarioPorCedula(ruta, cedula, telefono) {
  const url = API_BACKEND_URL + "users/" + ruta + "/" + encodeURIComponent(cedula);
  return telefono ? url + "?telephone=" + encodeURIComponent(telefono) : url;
}
```

| Ruta | Uso |
|---|---|
| `users/addUser` | alta |
| `users/editUser/:cedula` | edición |
| `users/deleteUser/:cedula` | borrado |
| `users/editPoints/:cedula` | edición de puntos |
| `users/recommendedUsers/:cedula` | lista de recomendados |
| `users/availableToRecommend/:cedula` | candidatos del modal de recomendación |
| `users/setRecommended/:cedula` | marca `recommended: true` |
| `users/addRecommendedUser/:cedula` | agrega el vínculo de recomendación |
| `users/addRecommendedMe/:cedula` | vínculo recíproco |
| `users/addFrecuentBuy/:cedula` | puntos por compra frecuente |
| `users/addHighBuy/:cedula` | puntos por compra de alta |

La cédula va en la ruta y el teléfono en el query. Cuando la cédula es `"."` el backend
necesita el teléfono para desambiguar, y por eso ambos se mandan siempre.

Ninguna de estas funciones escribe en el store: devuelven la respuesta del backend y esperan
al evento SSE, igual que el resto de escrituras.

### 7.2 Lo que hace el store con cada evento

`sync.js` registra 23 eventos SSE. Todos llegan como
`{ <entidad>: <documento> }` o `{ id, <entidad> }`:

| Evento SSE | Efecto en el store |
|---|---|
| `conectado` | `recargarTodo()` — carga los 6 `Map` de golpe |
| `cliente-creado` / `cliente-editado` | `guardarClienteEnStore(cliente)` → escribe en `clientes` **y** `clientesDB` |
| `cliente-eliminado` | `quitarClienteDelStore(id)` → borra de ambos `Map` |
| `reserva-agregada` / `reserva-editada` | `citas.set(reservationId, reserva)` |
| `reserva-eliminada` | `citas.delete(reservationId)` |
| `reservacion-concluida` | `citas.delete(key)` **y** `citasConcluidas.set(key, reserva)` — solo si ya estaba cargado |
| `historial-guardado` | `contactados.set(...)` solo si `wasContacted` es truthy |
| `historial-contactado` / `historial-editado` | `set` si `wasContacted`, `delete` si se desmarca |
| `usuario-agregado` | `usuarios.set(claveUsuario(usuario), usuario)` |
| `usuario-editado` | `set` si la clave existe, si no `recargarUsuarios()` (cambió la cédula) |
| `usuario-eliminado` | `usuarios.delete(key)`, resuelta con `claveUsuario()` si viene el doc |
| `meRecomendo-agregado`, `usuarioRecomendado-agregado`, `meRecomendaron-editado` | `usuarios.set(claveUsuario(usuario), usuario)` |
| `agregarPuntos-compraAlta`, `agregarPuntos-compraRecurrente`, `puntosEditados` | `usuarios.set(...)` + refresco debounced de estadísticas |
| `pedido-agregado` / `pedido-editado` | `pedidos.set(pedido._id ?? id, pedido)` |
| `pedido-eliminado` | `pedidos.delete(...)` |

Si el SSE se cae, `source.onerror` cierra el source y reintenta `iniciarSSE()` a los 3 s; al
reconectar dispara `conectado`, que hace `recargarTodo()` y reconstruye todo desde cero.

### 7.3 Ejemplo completo: marcar un cliente como contactado

`toggleContactado(id)` (`contactados.js:14`) escribe en **dos** entidades distintas, porque
"contactado" se refleja tanto en el cliente como en su historial:

```js
await fetchToggleWasContactedClienteAPI(clienteId);   // customers/toogleWasContacted
mostrarAlertas();                                     // repinta de inmediato
if (tab 'database' activa)  mostrarGeneral(...);
if (tab 'contactados' activa) mostrarContactados(...);
await fetchToggleHistorialContactadoAPI(clienteId);   // historial/toggleWasContacted
```

Los dos `fetch` disparan sus eventos (`cliente-editado` y `historial-contactado`), que son los
que mueven el store. Los `mostrar*` intermedios son optimista: refrescan con el estado que aún
no ha llegado del backend.

---

## 8. Ciclo de vida

```
DOMContentLoaded
  └─► iniciarSSE()                    (sync.js)
        └─► EventSource(API + 'eventos')
              └─► evento 'conectado'
                    └─► recargarTodo()   ← aquí se llenan los Map por primera vez
                          └─► refrescarVistaClientes()

login ─► mostrarApp()                (auth.js)
        └─► actualizarStats / mostrarAlertas / badges…
             (leen el store; si SSE aún no ha cargado, se ven vacíos y se rellenan solos)
```

Los scripts son clásicos con `defer`, así que el orden de `<script>` en `index.html` es el
orden de ejecución. `theme.js` es la excepción: va **sin** `defer` en el `<head>` para pintar
el tema antes del primer frame.

---

## 9. Invariantes y trampas

Cosas que hay que respetar al tocar este código:

1. **Ninguna escritura optimista.** Si agregas código que haga `store.x.set(...)` justo después
   de un `fetch*API()`, vas a duplicar la fuente de verdad. El store solo cambia por SSE o por
   un `recargar*` explícito.
2. **Nunca claves de `usuarios` sin `claveUsuario()`.** Ver §5.
3. **`recargar*` hace `clear()` antes de rellenar.** Si un `fetch` devuelve `[]` por un error de
   red, el `Map` queda **vacío** y la pantalla se muestra en blanco. Es el comportamiento actual
   de los `fetch*API()`, que devuelven `[]` en el `catch`.
4. **Los `Map` de clientes van en pareja.** Si escribes en `clientes`, escribe en `clientesDB`
   (usa `guardarClienteEnStore` / `quitarClienteDelStore`).
5. **Las banderas `*Cargado` no se limpian al cerrar sesión.** `cerrarSesion()` solo borra
   `sessionStorage`; los `Map` sobreviven, así que un re-login repinta con datos cacheados hasta
   que `conectado` refresque.
6. **`getHistorialDB()` es la excepción a la regla**: hace `fetch` directo a
   `historial/historialDBList` cada vez que se llama, no usa el store y devuelve `undefined`
   si hay error. Está en `storage.js:382` y solo la usa `clientes.js:7`. Si alguna vez se
   reutiliza, conviene migrarla a un `Map` como el resto.

### Detalle suelto conocido

`actualizarStats()` (`ui-tablas.js:29`) hace `hoy = getHoy()` **sin `let`/`const`/`var`**.
Como `hoy` no está declarado en ningún archivo, se crea una global implícita. Funciona, pero
conviene arreglarlo a `const hoy = getHoy()` si se pasa por ahí.

---

## 10. Cómo extenderlo

**Añadir un campo a una entidad:** no hay que tocar el store. El `Map` guarda el documento
completo del backend sin transformarlo, así que el campo ya está disponible; solo hay que leerlo
en el renderizador.

**Añadir un `Map` nuevo:** cuatro pasos.

```js
// 1. Declararlo en el objeto store, con su bandera
nuevo: new Map(),
nuevoCargado: false,

// 2. La función fetch que lo llena
async function fetchNuevoAPI() { /* ... */ }

// 3. recargar* (clear + set + bandera) y cargar* (lazy)
async function recargarNuevo() {
  const datos = await fetchNuevoAPI();
  store.nuevo.clear();
  datos.forEach(d => store.nuevo.set(String(d.clave), d));
  store.nuevoCargado = true;
}
async function cargarNuevo() { if (store.nuevoCargado) return; await recargarNuevo(); }

// 4. El getter
function getNuevos() { return Promise.resolve(Array.from(store.nuevo.values())); }
```

Y sumarlo a `recargarTodo()` si debe venir en la carga inicial, más el evento SSE
correspondiente en `sync.js` y su `refrescarVista*`.

**Cambiar una clave:** revisa primero todos los `store.<map>.set(...)` y `.delete(...)` de
`sync.js` más los `recargar*` de `storage.js`. Si la clave depende de un campo mutable, el
patrón de §5 (recargar el `Map` completo cuando no coincide) es el que evita claves huérfanas.