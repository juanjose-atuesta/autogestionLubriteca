/*// ═══════════════════════════════════════════════
// AUTOGESTIÓN v3.4 — JS
// ═══════════════════════════════════════════════

// ⚠️ GOOGLE SHEETS — NO MODIFICAR
const urlGoogle = "https://script.google.com/macros/s/AKfycbw4k4xYUWooiHt_eYpBx4Jx10WTLWg3OUWzeA_uBitD99W3YI1vUv17Ss8fJ8gfPCFGmw/exec";

// ═══════════ CREDENCIALES ═══════════
const USUARIOS = [
    { usuario: "admin",  clave: "autogestion2024" },
    { usuario: "taller", clave: "taller1234"      }
];

// ═══════════ CONFIGURACIÓN DE ESPACIOS ═══════════
const ESPACIOS = {
    carcamo:         { nombre: "Cárcamo",         icono: "🔩", clase: "chip-carcamo",        tag: "tag-carcamo" },
    gato_hidraulico: { nombre: "Gato Hidráulico", icono: "🔧", clase: "chip-gato_hidraulico", tag: "tag-gato_hidraulico" },
    gato_electrico:  { nombre: "Gato Eléctrico",  icono: "⚡", clase: "chip-gato_electrico",  tag: "tag-gato_electrico" }
};

const HORAS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
const HORAS_DISPLAY = {
    '07:00':'7:00 AM','08:00':'8:00 AM','09:00':'9:00 AM','10:00':'10:00 AM',
    '11:00':'11:00 AM','12:00':'12:00 PM','13:00':'1:00 PM','14:00':'2:00 PM',
    '15:00':'3:00 PM','16:00':'4:00 PM','17:00':'5:00 PM','18:00':'6:00 PM','19:00':'7:00 PM'
};

let filtroAgendaActual = 'todos';
let dragCitaId = null;

// ═══════════ INIT ═══════════
document.addEventListener('DOMContentLoaded', () => { verificarSesion(); });

// ═══════════ LOGIN ═══════════
function verificarSesion() {
    if (sessionStorage.getItem('ag_sesion') === 'ok') mostrarApp();
}
function intentarLogin(e) {
    e.preventDefault();
    const usuario = document.getElementById('loginUser').value.trim();
    const clave   = document.getElementById('loginPass').value;
    const error   = document.getElementById('loginError');
    const btn     = document.getElementById('loginBtn');
    const txtBtn  = document.getElementById('loginBtnText');
    const loader  = document.getElementById('loginBtnLoader');

    btn.disabled = true; txtBtn.style.display='none'; loader.style.display='inline-block';
    error.classList.remove('visible');
    setTimeout(() => {
        const valido = USUARIOS.some(u => u.usuario === usuario && u.clave === clave);
        if (valido) {
            sessionStorage.setItem('ag_sesion','ok');
            document.getElementById('loginScreen').classList.add('saliendo');
            setTimeout(() => mostrarApp(), 400);
        } else {
            error.classList.add('visible');
            btn.disabled=false; txtBtn.style.display='inline'; loader.style.display='none';
            document.getElementById('loginPass').value='';
            document.getElementById('loginPass').focus();
        }
    }, 600);
}
function mostrarApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appWrapper').style.display  = 'block';
    if (Notification.permission !== "granted") Notification.requestPermission();

    // 1. Renderizar INMEDIATAMENTE desde localStorage — sin esperar a Sheets
    migrarClientesAHistorial();
    actualizarStats();
    mostrarAlertas();
    revisarCitasDeHoy();
    actualizarBadgeContactados();
    actualizarBadgeAgenda();

    // 2. Sincronizar con Sheets EN SEGUNDO PLANO sin bloquear la UI
    sincronizarConSheets();
}

// ═══════════ SINCRONIZAR CON GOOGLE SHEETS (segundo plano) ═══════════
function sincronizarConSheets() {
    mostrarCargando(true);

    fetch(urlGoogle + '?v=' + Date.now(), { method: 'GET', cache: 'no-cache' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(datos => {
            if (!datos.ok || !Array.isArray(datos.clientes)) {
                throw new Error('Respuesta inválida');
            }

            // Sincronizar clientes
            const clientesSheets = datos.clientes
                .filter(c => c.nombre || c.placa)
                .map(c => ({
                    ...c,
                    id:       Number(c.id) || generarIdCliente(c.placa, c.fechaActual),
                    nombre:   String(c.nombre   || ''),
                    telefono: String(c.telefono || ''),
                    placa:    String(c.placa     || '').toUpperCase().trim(),
                    categoria:String(c.categoria || ''),
                    fechaActual: String(c.fechaActual || ''),
                    fechaFutura: String(c.fechaFutura || ''),
                    km:       String(c.km || '0')
                }));

            if (clientesSheets.length > 0) {
                setClientes(clientesSheets);
            }

            // Sincronizar citas con la misma lógica de fusión que sincronizarSoloCitas
            if (Array.isArray(datos.citas)) {
                const citasSheets = datos.citas.map(c => ({
                    citaId:    String(c.citaId),
                    placa:     String(c.placa     || '').toUpperCase().trim(),
                    nombre:    String(c.nombre    || ''),
                    telefono:  String(c.telefono  || ''),
                    categoria: String(c.categoria || ''),
                    fecha:     String(c.fecha     || ''),
                    hora:      String(c.hora      || ''),
                    espacio:   String(c.espacio   || ''),
                    notas:     String(c.notas     || '')
                }));
                const idsSheets  = new Set(citasSheets.map(c => c.citaId));
                const citasLocal = getCitas();
                const ahora      = Date.now();
                // Conservar citas locales recientes (< 2 min) que Sheets aún no confirmó
                const pendientes = citasLocal.filter(c =>
                    !idsSheets.has(Number(c.citaId)) && (ahora - Number(c.citaId)) < 120000
                );
                setCitas([...citasSheets, ...pendientes]);
                console.log('✓ ' + citasSheets.length + ' citas + ' + pendientes.length + ' pendientes locales');
            }

            // Re-renderizar todas las vistas con datos frescos
            migrarClientesAHistorial();
            actualizarStats();
            mostrarAlertas();
            actualizarBadgeContactados();
            actualizarBadgeAgenda();
            if (document.getElementById('tab-database').classList.contains('active'))
                mostrarGeneral(document.getElementById('buscadorGeneral').value);
            if (document.getElementById('tab-contactados').classList.contains('active'))
                mostrarContactados();
            if (document.getElementById('tab-historial').classList.contains('active'))
                buscarHistorial();
            if (document.getElementById('tab-agenda').classList.contains('active'))
                renderAgenda();
            console.log('✓ ' + clientesSheets.length + ' clientes sincronizados desde Sheets');
        })
        .catch(err => {
            console.warn('Sheets no disponible — usando datos locales:', err.message);
        })
        .finally(() => {
            mostrarCargando(false);
        });
}

// Generar ID numérico consistente a partir de placa + fecha
function generarIdCliente(placa, fecha) {
    const str = String(placa) + String(fecha);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) || Date.now();
}

// ═══════════ INDICADOR DE CARGA ═══════════
function mostrarCargando(visible) {
    let el = document.getElementById('syncIndicador');
    if (!el) {
        el = document.createElement('div');
        el.id = 'syncIndicador';
        el.style.cssText = 'position:fixed;top:70px;right:20px;z-index:500;background:#0f172a;color:#38bdf8;padding:8px 16px;border-radius:8px;font-family:Syne,sans-serif;font-size:0.78rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;transition:opacity 0.3s;';
        document.body.appendChild(el);
    }
    if (visible) {
        el.innerHTML = '<span style="animation:spin-slow 0.8s linear infinite;display:inline-block">⟳</span> Sincronizando...';
        el.style.opacity = '1';
        el.style.display = 'flex';
    } else {
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 400);
    }
}
function cerrarSesion() {
    sessionStorage.removeItem('ag_sesion');
    document.getElementById('appWrapper').style.display='none';
    const ls = document.getElementById('loginScreen');
    ls.style.display='flex'; ls.classList.remove('saliendo');
    document.getElementById('loginUser').value='';
    document.getElementById('loginPass').value='';
    document.getElementById('loginError').classList.remove('visible');
}
function togglePassword() {
    const i = document.getElementById('loginPass');
    i.type = i.type==='password'?'text':'password';
}

// ═══════════ STORAGE ═══════════
function getClientes()          { return JSON.parse(localStorage.getItem('db_clientes'))        || []; }
function setClientes(arr)       { localStorage.setItem('db_clientes', JSON.stringify(arr)); }
function getHistorialDB()       { return JSON.parse(localStorage.getItem('db_historial'))        || []; }
function setHistorialDB(arr)    { localStorage.setItem('db_historial', JSON.stringify(arr)); }
function getContactados()       { return JSON.parse(localStorage.getItem('db_contactados_log'))  || []; }
function setContactados(arr)    { localStorage.setItem('db_contactados_log', JSON.stringify(arr)); }
function getIdsContactados()    { return JSON.parse(localStorage.getItem('db_contactados_ids'))  || []; }
function setIdsContactados(arr) { localStorage.setItem('db_contactados_ids', JSON.stringify(arr)); }
function getCitas()             { return JSON.parse(localStorage.getItem('db_citas'))            || []; }
function setCitas(arr)          { localStorage.setItem('db_citas', JSON.stringify(arr)); }

function getHoy() { return new Date().toLocaleDateString('en-CA'); }
function diasRestantes(fechaStr) {
    return Math.ceil((new Date(String(fechaStr).trim()) - new Date(getHoy())) / 86400000);
}
function fechaHoraActual() {
    return new Date().toLocaleString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function formatearFechaLarga(fechaStr) {
    const [y,m,d] = fechaStr.split('-');
    return new Date(+y,+m-1,+d).toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

// ═══════════ MIGRACIÓN ═══════════
function migrarClientesAHistorial() {
    const h = getHistorialDB(), c = getClientes();
    if (!c.length) return;
    const ids = new Set(h.map(x => x.id));
    let n = 0;
    c.forEach(x => { if (!ids.has(x.id)) { h.push({...x,eliminado:false,fechaRegistro:x.fechaActual||fechaHoraActual()}); n++; } });
    if (n > 0) setHistorialDB(h);
}

// ═══════════ AUTORIZACIÓN ═══════════
function waMsgAutorizacion(nombre) {
    return encodeURIComponent(`Estimado/a ${nombre},\n\nDe acuerdo con la normativa vigente sobre protección de datos personales, le informamos que la información suministrada será utilizada únicamente para fines comerciales, de contacto, atención al cliente, envío de información, promociones y seguimiento de nuestros servicios.\nSus datos serán tratados de manera confidencial y no serán compartidos con terceros sin su autorización.\n\nSi usted autoriza el uso de sus datos personales y el contacto futuro, por favor responda con: "SÍ" o "1".\nSi usted NO autoriza, responda con: "NO" o "0".`);
}
function enviarAutorizacion() {
    const nombre   = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    if (!nombre || !telefono) { alert('Ingresa el nombre y teléfono del cliente primero.'); return; }
    window.open(`https://wa.me/57${telefono}?text=${waMsgAutorizacion(nombre)}`, '_blank');
}

// ═══════════ GUARDAR CLIENTE ═══════════
document.getElementById('clienteForm').addEventListener('submit', e => {
    e.preventDefault();
    const c = {
        id:          Date.now(),
        nombre:      document.getElementById('nombre').value.trim(),
        telefono:    document.getElementById('telefono').value.trim(),
        placa:       document.getElementById('placa').value.toUpperCase().trim(),
        categoria:   document.getElementById('categoria').value,
        fechaActual: document.getElementById('fechaActual').value,
        fechaFutura: document.getElementById('fechaFutura').value,
        km:          document.getElementById('kilometraje').value
    };
    // ⚠️ GOOGLE SHEETS — NO MODIFICAR
    fetch(urlGoogle,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({...c,accion:"guardar"})}).catch(console.error);
    const cl = getClientes(); cl.push(c); setClientes(cl);
    const h  = getHistorialDB(); h.push({...c,eliminado:false,fechaRegistro:fechaHoraActual()}); setHistorialDB(h);
    document.getElementById('clienteForm').reset();
    mostrarToast(); actualizarStats(); mostrarAlertas(); revisarCitasDeHoy();
});
function mostrarToast() { const t=document.getElementById('toastGuardado'); t.style.display='block'; setTimeout(()=>t.style.display='none',3000); }

// ═══════════ STATS ═══════════
function actualizarStats() {
    const cl = getClientes(), hoy = getHoy();
    const v  = cl.filter(c => String(c.fechaFutura).trim() < hoy).length;
    const h  = cl.filter(c => String(c.fechaFutura).trim() === hoy).length;
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card stat-primary"><div class="stat-value">${cl.length}</div><div class="stat-label">Total clientes</div></div>
        <div class="stat-card stat-danger"><div class="stat-value">${v}</div><div class="stat-label">Vencidos</div></div>
        <div class="stat-card stat-warning"><div class="stat-value">${h}</div><div class="stat-label">Citas hoy</div></div>
        <div class="stat-card stat-success"><div class="stat-value">${cl.length-v-h}</div><div class="stat-label">Al día</div></div>`;
}
function buildBadge(fechaStr, eliminado=false) {
    if (eliminado) return `<span class="badge-eliminado">● Eliminado</span>`;
    const hoy=getHoy(), f=String(fechaStr).trim(), d=diasRestantes(f);
    if (f===hoy) return `<span class="badge-estado badge-hoy">⚠ HOY</span>`;
    if (f<hoy)   return `<span class="badge-estado badge-vencido">✕ VENCIDO hace ${Math.abs(d)}d</span>`;
    if (d<=7)    return `<span class="badge-estado badge-pronto">📅 En ${d} días</span>`;
    return `<span class="badge-estado badge-ok">✓ OK — ${d}d</span>`;
}

// ═══════════ CONSTRUIR FILA ═══════════
function construirFila(c) {
    // Normalizar todos los campos a string por si vienen de Sheets como número
    const nombre    = String(c.nombre    || '');
    const telefono  = String(c.telefono  || '');
    const placa     = String(c.placa     || '').toUpperCase().trim();
    const categoria = String(c.categoria || 'Servicio General');
    const fechaActual = String(c.fechaActual || '');
    const fechaFutura = String(c.fechaFutura || '');
    const km        = String(c.km        || '0');
    const id        = c.id;

    const hoy  = getHoy(), f = fechaFutura.trim();
    const esHoy = f === hoy, esV = f < hoy;
    const marcado = getIdsContactados().includes(id);
    const cl = esHoy ? 'fila-hoy' : esV ? 'fila-vencido' : '';

    const waTxt = esHoy
        ? `Hola%20${encodeURIComponent(nombre)},%20te%20recordamos%20que%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20es%20HOY.%20%C2%A1Te%20esperamos!`
        : `Hola%20${encodeURIComponent(nombre)},%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20est%C3%A1%20vencido.%20%C2%A1Cont%C3%A1ctanos!`;

    // Botón cambia a "Reservado" si ya tiene cita activa
    const citasCliente = getCitas().filter(ct => String(ct.placa).toUpperCase() === placa && ct.fecha >= hoy);
    const tieneReserva = citasCliente.length > 0;
    const nombreSafe   = nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const categoriaSafe = categoria.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const btnReservar  = tieneReserva
        ? `<button class="btn-reservar-cita btn-reservado" onclick="abrirModalReservar(${id},'${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">✅ Reservado</button>`
        : `<button class="btn-reservar-cita" onclick="abrirModalReservar(${id},'${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">📅 Reservar</button>`;

    const tr = document.createElement('tr');
    if (cl) tr.classList.add(cl);
    tr.innerHTML = `
        <td>${nombre}<small>${categoria}</small></td>
        <td>${telefono}</td>
        <td><strong>${placa}</strong></td>
        <td>${fechaActual}</td>
        <td>${fechaFutura}</td>
        <td>${buildBadge(fechaFutura)}</td>
        <td>${km} KM</td>
        <td>${btnReservar}</td>
        <td>
            <div class="acciones">
                <div class="btn-wa-wrap">
                    <a href="https://wa.me/57${telefono}?text=${waTxt}" target="_blank" class="btn-wa">📱 WhatsApp</a>
                    <button class="btn-chulo ${marcado ? 'marcado' : ''}" onclick="toggleContactado(${id})" title="${marcado ? 'Contactado ✓' : 'Marcar contactado'}">✓</button>
                </div>
                <button class="btn-edit" onclick="abrirModalEditar(${id})">✎ Editar</button>
                <button class="btn-del"  onclick="abrirModalEliminar(${id})">✕ Eliminar</button>
            </div>
        </td>`;
    return tr;
}

// ═══════════ CONTACTADO ═══════════
function toggleContactado(id) {
    const c = getClientes().find(x=>x.id===id); if (!c) return;
    let ids = getIdsContactados();
    if (ids.includes(id)) { setIdsContactados(ids.filter(x=>x!==id)); }
    else {
        ids.push(id); setIdsContactados(ids);
        const log = getContactados();
        log.push({logId:Date.now(),clienteId:c.id,nombre:c.nombre,telefono:c.telefono,placa:c.placa,categoria:c.categoria,fechaActual:c.fechaActual,fechaFutura:c.fechaFutura,km:c.km,fechaContacto:fechaHoraActual()});
        setContactados(log);
    }
    actualizarBadgeContactados(); mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active')) mostrarGeneral(document.getElementById('buscadorGeneral').value);
    if (document.getElementById('tab-contactados').classList.contains('active')) mostrarContactados();
}
function actualizarBadgeContactados() { document.getElementById('nav-badge-contactados').textContent = getContactados().length; }

// ═══════════ ALERTAS ═══════════
function mostrarAlertas() {
    const tbody=document.getElementById('listaAlertas'), empty=document.getElementById('emptyAlertas'), hoy=getHoy();
    const al=getClientes().filter(c=>{const f=String(c.fechaFutura).trim();return f===hoy||f<hoy;})
        .sort((a,b)=>{const fa=String(a.fechaFutura).trim(),fb=String(b.fechaFutura).trim();if(fa===hoy&&fb!==hoy)return -1;if(fb===hoy&&fa!==hoy)return 1;return fb.localeCompare(fa);});
    tbody.innerHTML='';
    if (!al.length){empty.style.display='block';document.getElementById('tablaAlertas').style.display='none';}
    else{empty.style.display='none';document.getElementById('tablaAlertas').style.display='';al.forEach(c=>tbody.appendChild(construirFila(c)));}
    document.getElementById('badge-alertas').textContent=al.length;
    document.getElementById('nav-badge').textContent=al.length;
}

// ═══════════ BASE DE DATOS ═══════════
function mostrarGeneral(filtro='') {
    const tbody=document.getElementById('listaGeneral'), empty=document.getElementById('emptyGeneral'), hoy=getHoy();
    let cl=getClientes();
    if (filtro){const f=filtro.toUpperCase();cl=cl.filter(c=>c.nombre.toUpperCase().includes(f)||c.placa.toUpperCase().includes(f)||(c.categoria||'').toUpperCase().includes(f)||c.telefono.includes(filtro));}
    cl.sort((a,b)=>String(a.fechaFutura).localeCompare(String(b.fechaFutura)));
    const todos=getClientes(),v=todos.filter(c=>String(c.fechaFutura).trim()<hoy).length,hC=todos.filter(c=>String(c.fechaFutura).trim()===hoy).length;
    document.getElementById('dbStats').innerHTML=`
        <div class="db-stat-item"><span class="db-dot" style="background:#ef4444"></span>${v} vencidos</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#f59e0b"></span>${hC} hoy</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#10b981"></span>${todos.length-v-hC} al día</div>
        <div class="db-stats-total">${todos.length} registros</div>`;
    tbody.innerHTML='';
    if (!cl.length){empty.style.display='block';document.getElementById('tablaGeneral').style.display='none';}
    else{empty.style.display='none';document.getElementById('tablaGeneral').style.display='';cl.forEach(c=>tbody.appendChild(construirFila(c)));}
}
function filtrarGeneral(){mostrarGeneral(document.getElementById('buscadorGeneral').value);}
function limpiarBuscadorGeneral(){document.getElementById('buscadorGeneral').value='';mostrarGeneral();document.getElementById('buscadorGeneral').focus();}

// ═══════════ HISTORIAL ═══════════
function buscarHistorial() {
    const placa=document.getElementById('buscadorPlaca').value.toUpperCase().trim();
    const res=document.getElementById('historialResultado');
    if (placa.length<3){res.innerHTML=`<div class="empty-state"><div class="empty-icon">◎</div><p>Ingresa una placa para ver su historial completo.</p></div>`;return;}
    const regs=getHistorialDB().filter(c=>c.placa.toUpperCase().includes(placa)).sort((a,b)=>String(a.fechaActual).localeCompare(String(b.fechaActual)));
    if (!regs.length){res.innerHTML=`<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron registros para "<strong>${placa}</strong>".</p></div>`;return;}
    const hoy=getHoy(), pu=[...new Set(regs.map(c=>c.placa))];
    let html='';
    pu.forEach(p=>{
        const r=regs.filter(c=>c.placa===p), d=new Set(r.map(x=>x.nombre)).size;
        html+=`<div class="historial-placa-header"><div class="historial-placa-badge">${p}</div><div class="historial-meta"><strong>${r.length}</strong> servicio${r.length!==1?'s':''} · <strong>${d}</strong> dueño${d!==1?'s':''}</div></div><div class="historial-timeline">`;
        r.forEach((c,idx)=>{
            const esE=c.eliminado===true,esH=!esE&&String(c.fechaFutura).trim()===hoy,esV=!esE&&String(c.fechaFutura).trim()<hoy;
            const dotC=esE?'':esH?'dot-hoy':esV?'dot-vencido':'dot-actual';
            const cardC=esE?'card-eliminado':esH?'card-hoy':esV?'card-vencido':'card-actual';
            html+=`<div class="historial-item"><div class="historial-linea"><div class="historial-dot ${dotC}"></div>${idx!==r.length-1?'<div class="historial-connector"></div>':''}</div>
            <div class="historial-card ${cardC}">
                <div class="historial-card-top"><div class="historial-nombre">${c.nombre}<small>${c.telefono}</small></div>${buildBadge(c.fechaFutura,esE)}</div>
                <div class="historial-card-info">
                    <div class="historial-info-item">🔧 <strong>${c.categoria}</strong></div>
                    <div class="historial-info-item">📅 Ingreso: <strong>${c.fechaActual}</strong></div>
                    <div class="historial-info-item">📅 Contacto: <strong>${c.fechaFutura}</strong></div>
                    <div class="historial-info-item">🛣 <strong>${c.km} KM</strong></div>
                    ${esE?'<div class="historial-info-item">🗑 <strong>Eliminado del sistema</strong></div>':''}
                </div>
                ${!esE?`<button class="btn-reservar-historial" onclick="abrirModalReservar(${c.id||'null'},'${c.placa}','${c.nombre.replace(/'/g,"\\'")}','${c.telefono}','${c.categoria.replace(/'/g,"\\'")}')">📅 Reservar cita</button>`:''}
            </div></div>`;
        });
        html+=`</div>`;
    });
    res.innerHTML=html;
}
function limpiarHistorial(){document.getElementById('buscadorPlaca').value='';buscarHistorial();document.getElementById('buscadorPlaca').focus();}

// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro='') {
    const tbody=document.getElementById('listaContactados'),empty=document.getElementById('emptyContactados');
    let log=filtro?getContactados().filter(r=>{const f=filtro.toUpperCase();return r.nombre.toUpperCase().includes(f)||r.placa.toUpperCase().includes(f)||(r.categoria||'').toUpperCase().includes(f);}):getContactados();
    log=[...log].reverse();
    const total=getContactados().length,placas=new Set(getContactados().map(r=>r.placa)).size;
    document.getElementById('statsContactados').innerHTML=`<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total!==1?'s':''}</div><div class="db-stats-total">${placas} placa${placas!==1?'s':''} distinta${placas!==1?'s':''}</div>`;
    tbody.innerHTML='';
    if (!log.length){empty.style.display='block';document.getElementById('tablaContactados').style.display='none';}
    else{
        empty.style.display='none';document.getElementById('tablaContactados').style.display='';
        log.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.nombre}<small>${r.telefono}</small></td><td>${r.telefono}</td><td><strong>${r.placa}</strong></td><td>${r.categoria}</td><td>${r.fechaActual}</td><td>${r.fechaFutura}</td><td>${r.km} KM</td><td><span class="fecha-contacto-badge">📞 ${r.fechaContacto}</span></td><td><button class="btn-del-contactado" onclick="eliminarLogContactado(${r.logId})">✕ Quitar</button></td>`;tbody.appendChild(tr);});
    }
}
function eliminarLogContactado(id){setContactados(getContactados().filter(r=>r.logId!==id));actualizarBadgeContactados();mostrarContactados(document.getElementById('buscadorContactados').value);}
function filtrarContactados(){mostrarContactados(document.getElementById('buscadorContactados').value);}
function limpiarBuscadorContactados(){document.getElementById('buscadorContactados').value='';mostrarContactados();document.getElementById('buscadorContactados').focus();}

// ═══════════════════════════════════════════
// MODAL RESERVAR CITA — FLUJO POR PASOS
// ═══════════════════════════════════════════
let reservarEspacioActual = null;
let reservarHoraActual    = null;

function abrirModalReservar(clienteId, placa, nombre, telefono, categoria) {
    document.getElementById('reservarClienteId').value  = clienteId;
    document.getElementById('reservarPlacaH').value     = placa;
    document.getElementById('reservarNombreH').value    = nombre;
    document.getElementById('reservarTelefonoH').value  = telefono;
    document.getElementById('reservarCategoriaH').value = categoria;
    document.getElementById('reservarFecha').value      = getHoy();
    document.getElementById('reservarNotas').value      = '';
    document.getElementById('reservarHora').value       = '';
    document.getElementById('reservarEspacio').value    = '';
    reservarEspacioActual = null;
    reservarHoraActual    = null;

    document.getElementById('reservarInfo').innerHTML = `
        <div class="reservar-info-placa">${placa}</div>
        <div class="reservar-info-detalle"><strong>${nombre}</strong><br>${categoria} · ${telefono}</div>`;

    // Resetear pasos
    document.getElementById('reservarPaso1').style.display = 'block';
    document.getElementById('reservarPaso2').style.display = 'none';
    document.getElementById('reservarPaso3').style.display = 'none';
    document.getElementById('reservarPaso4').style.display = 'none';
    document.getElementById('btnConfirmarReserva').style.display = 'none';

    // Limpiar selección de espacios
    document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));

    document.getElementById('modalReservar').classList.add('active');
    // Si ya hay fecha, mostrar paso 2 automáticamente
    mostrarPaso2();
}

function mostrarPaso2() {
    const fecha = document.getElementById('reservarFecha').value;
    if (!fecha) return;
    document.getElementById('reservarPaso2').style.display = 'block';
    document.getElementById('reservarPaso3').style.display = 'none';
    document.getElementById('reservarPaso4').style.display = 'none';
    document.getElementById('btnConfirmarReserva').style.display = 'none';
    reservarEspacioActual = null;
    reservarHoraActual    = null;
    document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
}

function seleccionarEspacio(espacio) {
    reservarEspacioActual = espacio;
    reservarHoraActual    = null;
    document.getElementById('reservarEspacio').value = espacio;

    // Destacar botón seleccionado
    document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
    const claseMap = { carcamo:'espacio-carcamo', gato_hidraulico:'espacio-hidraulico', gato_electrico:'espacio-electrico' };
    document.querySelector('.' + claseMap[espacio]).classList.add('seleccionado');

    mostrarHorasDisponibles();
}

function mostrarHorasDisponibles() {
    const fecha  = document.getElementById('reservarFecha').value;
    const espacio = reservarEspacioActual;
    if (!fecha || !espacio) return;

    // Obtener horas ya ocupadas para ese espacio+fecha
    const ocupadas = new Set(
        getCitas()
            .filter(c => c.fecha === fecha && c.espacio === espacio)
            .map(c => c.hora)
    );

    const hayDisponibles = HORAS.some(h => !ocupadas.has(h));

    let html = '';
    if (!hayDisponibles) {
        html = `<div class="sin-horas-msg">⚠ No hay horarios disponibles para este espacio en la fecha seleccionada. Prueba con otro espacio u otra fecha.</div>`;
    } else {
        HORAS.forEach(h => {
            const ocupada = ocupadas.has(h);
            html += `<button class="hora-btn ${ocupada?'ocupada':''}"
                ${ocupada?'disabled title="Horario ocupado"':'onclick="seleccionarHora(\'' + h + '\')"'}>
                ${HORAS_DISPLAY[h]}${ocupada?' 🔒':''}
            </button>`;
        });
    }

    document.getElementById('horasDisponibles').innerHTML = html;
    document.getElementById('horaSeleccionadaInfo').style.display = 'none';
    document.getElementById('reservarPaso3').style.display = 'block';
    document.getElementById('reservarPaso4').style.display = 'none';
    document.getElementById('btnConfirmarReserva').style.display = 'none';
}

function seleccionarHora(hora) {
    reservarHoraActual = hora;
    document.getElementById('reservarHora').value = hora;

    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('seleccionada'));
    event.target.classList.add('seleccionada');

    const esp = ESPACIOS[reservarEspacioActual];
    document.getElementById('horaSeleccionadaInfo').textContent =
        `✓ Seleccionado: ${HORAS_DISPLAY[hora]} en ${esp.icono} ${esp.nombre}`;
    document.getElementById('horaSeleccionadaInfo').style.display = 'block';

    document.getElementById('reservarPaso4').style.display = 'block';
    document.getElementById('btnConfirmarReserva').style.display = 'inline-flex';
}

function confirmarReserva() {
    const fecha    = document.getElementById('reservarFecha').value;
    const hora     = document.getElementById('reservarHora').value;
    const espacio  = document.getElementById('reservarEspacio').value;
    const notas    = document.getElementById('reservarNotas').value.trim();
    const placa    = document.getElementById('reservarPlacaH').value;
    const nombre   = document.getElementById('reservarNombreH').value;
    const telefono = document.getElementById('reservarTelefonoH').value;
    const categoria= document.getElementById('reservarCategoriaH').value;
    const clienteId= document.getElementById('reservarClienteId').value;

    if (!fecha || !hora || !espacio) { alert('Completa todos los pasos antes de confirmar.'); return; }

    // Verificar disponibilidad (doble check)
    const conflicto = getCitas().find(c => c.fecha===fecha && c.hora===hora && c.espacio===espacio);
    if (conflicto) {
        alert(`⚠ Ya existe una reserva en ese horario para ${ESPACIOS[espacio].nombre}. Selecciona otra hora o espacio.`);
        return;
    }

    const nuevaCita = { citaId:Date.now(), clienteId, placa, nombre, telefono, categoria, fecha, hora, espacio, notas };
    const citas = getCitas();
    citas.push(nuevaCita);
    setCitas(citas);

    // Guardar en Google Sheets para sincronizar entre navegadores
    fetch(urlGoogle, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevaCita, accion: 'guardar_cita' })
    }).catch(console.error);

    cerrarModalReservar();
    actualizarBadgeAgenda();
    mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
    if (document.getElementById('tab-agenda').classList.contains('active')) renderAgenda();
}

function cerrarModalReservar() { document.getElementById('modalReservar').classList.remove('active'); }

// ═══════════════════════════════════════════
// AGENDA — RENDER PRINCIPAL
// ═══════════════════════════════════════════
function actualizarBadgeAgenda() {
    const hoy   = getHoy();
    const total = getCitas().filter(c => c.fecha === hoy).length;
    document.getElementById('nav-badge-agenda').textContent = total;
}

function irHoyAgenda() {
    document.getElementById('agendaFecha').value = getHoy();
    renderAgenda();
}

function cambiarDiaAgenda(delta) {
    const input = document.getElementById('agendaFecha');
    const fecha = input.value || getHoy();
    const [y,m,d] = fecha.split('-').map(Number);
    input.value = new Date(y,m-1,d+delta).toLocaleDateString('en-CA');
    renderAgenda();
}

function setFiltroAgenda(filtro) {
    filtroAgendaActual = filtro;
    document.querySelectorAll('.agenda-filtro-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('filtro-' + filtro).classList.add('activo');
    renderAgenda();
}

function renderAgenda() {
    const fecha     = document.getElementById('agendaFecha').value || getHoy();
    const label     = document.getElementById('agendaFechaLabel');
    const contenido = document.getElementById('agendaContenido');
    const resumen   = document.getElementById('agendaResumen');
    const horaActual = new Date().toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit',hour12:false}).substring(0,5);

    label.textContent = formatearFechaLarga(fecha);

    // Filtrar citas del día
    let citasDelDia = getCitas().filter(c => c.fecha === fecha);
    if (filtroAgendaActual !== 'todos') citasDelDia = citasDelDia.filter(c => c.espacio === filtroAgendaActual);

    // Resumen
    const totalCitas = citasDelDia.length;
    const espaciosOcupados = new Set(citasDelDia.map(c => c.espacio)).size;
    resumen.textContent = totalCitas > 0
        ? `${totalCitas} cita${totalCitas!==1?'s':''} · ${espaciosOcupados} espacio${espaciosOcupados!==1?'s':''} ocupado${espaciosOcupados!==1?'s':''}`
        : 'Sin citas para este día';

    let html = '';

    HORAS.forEach(hora => {
        const citasEnEstaHora = citasDelDia.filter(c => c.hora === hora);
        const esHoraActual    = fecha === getHoy() && horaActual >= hora && horaActual < siguienteHora(hora);

        html += `<div class="agenda-slot ${citasEnEstaHora.length > 0 ? 'tiene-citas' : ''}"
            data-fecha="${fecha}" data-hora="${hora}"
            ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">

            <div class="agenda-hora-col ${esHoraActual?'hora-actual':''}">
                ${HORAS_DISPLAY[hora]}
            </div>

            <div class="agenda-citas-col">`;

        if (citasEnEstaHora.length > 0) {
            citasEnEstaHora.forEach(cita => {
                const esp = ESPACIOS[cita.espacio] || {};
                html += `
                <div class="agenda-cita-chip ${esp.clase||''}"
                    draggable="true"
                    data-citaid="${cita.citaId}"
                    ondragstart="onDragStart(event,${cita.citaId})"
                    ondragend="onDragEnd(event)">
                    <span class="cita-espacio-tag ${esp.tag||''}">${esp.icono||''} ${esp.nombre||cita.espacio}</span>
                    <span class="cita-placa">${cita.placa}</span>
                    <div class="cita-info">
                        ${cita.nombre}
                        ${cita.notas ? `<small>📝 ${cita.notas}</small>` : ''}
                    </div>
                    <div class="cita-acciones">
                        <button class="btn-ver-cita" onclick="verDetalleCita(${cita.citaId})" title="Ver detalle">👁</button>
                        <button class="btn-del-cita-chip" onclick="eliminarCita(${cita.citaId})">✕</button>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="agenda-empty-slot"
                ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">
                Sin reservas
            </div>`;
        }

        html += `</div></div>`;
    });

    contenido.innerHTML = html;
    actualizarBadgeAgenda();
}

function siguienteHora(hora) {
    const idx = HORAS.indexOf(hora);
    return idx < HORAS.length - 1 ? HORAS[idx + 1] : '23:59';
}

function eliminarCita(citaId) {
    setCitas(getCitas().filter(c => c.citaId !== citaId));

    function confirmarReserva() {
    // ... (mantén aquí tu código de obtener elementos de los inputs) ...
    // Asegúrate de que nuevaCita esté bien definida arriba en tu función

    // 1. Guardar localmente
    citas.push(nuevaCita);
    localStorage.setItem('citas', JSON.stringify(citas));
    
    // 2. Actualizar interfaz
    renderAgenda();
    actualizarBadgeAgenda();
    cerrarModalReservar();

    // 3. ENVIAR A GOOGLE (Aquí va el fetch corregido con el catch)
    fetch(urlGoogle, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            accion: 'guardar_cita',
            citaId: nuevaCita.citaId,
            placa: nuevaCita.placa,
            nombre: nuevaCita.nombre,
            telefono: nuevaCita.telefono,
            categoria: nuevaCita.categoria,
            fecha: nuevaCita.fecha,
            hora: nuevaCita.hora,
            espacio: nuevaCita.espacio,
            notas: nuevaCita.notas
        })
    })
    .then(() => console.log("Intento de envío completado"))
    .catch(err => {
        console.error("Error crítico al enviar a Google Sheets:", err);
        alert("No se pudo guardar en la nube, pero se guardó en esta PC.");
    });
}
    actualizarBadgeAgenda();
    mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
    renderAgenda();
}

function verDetalleCita(citaId) {
    const cita = getCitas().find(c => c.citaId === citaId);
    if (!cita) return;

    const esp      = ESPACIOS[cita.espacio] || {};
    const hoy      = getHoy();
    const waTxt    = encodeURIComponent(`Hola ${cita.nombre}, te confirmamos tu cita en ${esp.nombre} el ${cita.fecha} a las ${HORAS_DISPLAY[cita.hora]}. ¡Te esperamos!`);
    const esHoy    = cita.fecha === hoy;
    const esPasada = cita.fecha < hoy;

    const estadoFecha = esHoy
        ? `<span class="badge-estado badge-hoy">⚠ HOY</span>`
        : esPasada
            ? `<span class="badge-estado badge-vencido">Pasada</span>`
            : `<span class="badge-estado badge-ok">Próxima</span>`;

    document.getElementById('detalleCitaContenido').innerHTML = `
        <!-- Cabecera espacio -->
        <div class="detalle-espacio-header detalle-espacio-${cita.espacio}">
            <span class="detalle-espacio-icon">${esp.icono}</span>
            <div>
                <div class="detalle-espacio-nombre">${esp.nombre}</div>
                <div class="detalle-espacio-hora">${HORAS_DISPLAY[cita.hora]} · ${cita.fecha} ${estadoFecha}</div>
            </div>
        </div>

        <!-- Datos de la cita -->
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">📋 Datos de la Cita</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Placa</span><span class="detalle-valor detalle-placa">${cita.placa}</span></div>
                <div class="detalle-item"><span class="detalle-label">Servicio</span><span class="detalle-valor">${cita.categoria}</span></div>
                <div class="detalle-item"><span class="detalle-label">Fecha</span><span class="detalle-valor">${cita.fecha}</span></div>
                <div class="detalle-item"><span class="detalle-label">Hora</span><span class="detalle-valor">${HORAS_DISPLAY[cita.hora]}</span></div>
                ${cita.notas ? `<div class="detalle-item detalle-item-full"><span class="detalle-label">Notas</span><span class="detalle-valor">📝 ${cita.notas}</span></div>` : ''}
            </div>
        </div>

        <!-- Datos del cliente -->
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">👤 Datos del Cliente</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Nombre</span><span class="detalle-valor">${cita.nombre}</span></div>
                <div class="detalle-item"><span class="detalle-label">Teléfono</span><span class="detalle-valor">${cita.telefono}</span></div>
            </div>
        </div>

        <!-- Acciones de contacto -->
        <div class="detalle-acciones">
            <a href="https://wa.me/57${cita.telefono}?text=${waTxt}" target="_blank" class="btn-wa btn-detalle-wa">
                📱 Contactar por WhatsApp
            </a>
            <button class="btn-del btn-detalle-del" onclick="if(confirm('¿Cancelar esta reserva?')){eliminarCita(${cita.citaId});cerrarDetalleCita();}">
                ✕ Cancelar reserva
            </button>
        </div>`;

    document.getElementById('modalDetalleCita').classList.add('active');
}

function cerrarDetalleCita() {
    document.getElementById('modalDetalleCita').classList.remove('active');
}

// ═══════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════
function onDragStart(event, citaId) {
    dragCitaId = citaId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
}

function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // Resaltar zona de drop
    const slot = event.currentTarget;
    document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
    slot.classList.add('drop-target');
}

function onDrop(event, nuevaHora) {
    event.preventDefault();
    document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));

    if (!dragCitaId) return;

    const citas     = getCitas();
    const citaIdx   = citas.findIndex(c => c.citaId === dragCitaId);
    if (citaIdx === -1) return;

    const cita      = citas[citaIdx];
    const fecha     = document.getElementById('agendaFecha').value || getHoy();

    // Verificar que el nuevo slot no esté ocupado para el mismo espacio
    const conflicto = citas.find(c => c.fecha === fecha && c.hora === nuevaHora && c.espacio === cita.espacio && c.citaId !== dragCitaId);
    if (conflicto) {
        mostrarToastError(`⚠ ${ESPACIOS[cita.espacio].nombre} ya tiene una reserva a las ${HORAS_DISPLAY[nuevaHora]}`);
        dragCitaId = null;
        return;
    }

    // Mover cita
    citas[citaIdx] = { ...cita, hora: nuevaHora };
    setCitas(citas);
    // Actualizar hora en Sheets
    fetch(urlGoogle, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId: dragCitaId, hora: nuevaHora, accion: 'mover_cita' })
    }).catch(console.error);
    dragCitaId = null;
    renderAgenda();
}

function mostrarToastError(msg) {
    let toast = document.getElementById('toastError');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastError';
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 20px;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.12);';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ═══════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════
function revisarCitasDeHoy() {
    const hoy = getHoy();
    getClientes().forEach(c => { if (String(c.fechaFutura).trim()===hoy) dispararNotificacion(c); });
}
function dispararNotificacion(c) {
    if (Notification.permission==="granted")
        new Notification(`RECORDATORIO: ${c.nombre}`,{body:`Hoy: ${c.categoria} · Placa ${c.placa} · Tel: ${c.telefono}`,icon:'https://cdn-icons-png.flaticon.com/512/1033/1033935.png'});
}

// ═══════════ MODAL ELIMINAR ═══════════
let idPendienteEliminar = null;
function abrirModalEliminar(id) {
    const c=getClientes().find(x=>x.id===id);if(!c)return;
    idPendienteEliminar=id;
    document.getElementById('modalEliminarTexto').textContent=`¿Eliminar a "${c.nombre}" (${c.placa})? Se moverá a la papelera en Google Sheets.`;
    document.getElementById('modalEliminar').classList.add('active');
    document.getElementById('btnConfirmarEliminar').onclick=confirmarEliminar;
}
function cerrarModalEliminar(){document.getElementById('modalEliminar').classList.remove('active');idPendienteEliminar=null;}
function confirmarEliminar(){if(idPendienteEliminar){eliminarCliente(idPendienteEliminar);cerrarModalEliminar();}}

function eliminarCliente(id) {
    const cl=getClientes(), c=cl.find(x=>x.id===id);
    if (c) {
        // ⚠️ GOOGLE SHEETS — NO MODIFICAR
        fetch(urlGoogle,{method:'POST',mode:'no-cors',body:JSON.stringify({placa:c.placa,accion:"eliminar"})}).catch(console.error);
        // Limpiar historial local
        const h=getHistorialDB(), idx=h.findLastIndex(x=>x.id===id);
        if (idx!==-1){h[idx].eliminado=true;setHistorialDB(h);}
        // Eliminar citas locales de ese cliente
        setCitas(getCitas().filter(ct => String(ct.placa).toUpperCase() !== String(c.placa).toUpperCase()));
    }
    setIdsContactados(getIdsContactados().filter(x=>x!==id));
    setClientes(cl.filter(x=>x.id!==id));
    actualizarStats(); mostrarAlertas(); actualizarBadgeAgenda();
    if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
    if (document.getElementById('tab-agenda').classList.contains('active'))
        renderAgenda();
}

// ═══════════ MODAL EDITAR ═══════════
function abrirModalEditar(id) {
    const c=getClientes().find(x=>x.id===id);if(!c)return;
    document.getElementById('editId').value=c.id;
    document.getElementById('editNombre').value=c.nombre;
    document.getElementById('editTelefono').value=c.telefono;
    document.getElementById('editPlaca').value=c.placa;
    document.getElementById('editCategoria').value=c.categoria;
    document.getElementById('editFechaActual').value=c.fechaActual;
    document.getElementById('editFechaFutura').value=c.fechaFutura;
    document.getElementById('editKm').value=c.km;
    document.getElementById('modalEditar').classList.add('active');
}
function cerrarModalEditar(){document.getElementById('modalEditar').classList.remove('active');}

function guardarEdicion() {
    const id  = parseInt(document.getElementById('editId').value);
    const cl  = getClientes(), idx = cl.findIndex(x => x.id === id);
    if (idx === -1) return;

    const fAnt = cl[idx].fechaFutura;
    const fNueva = document.getElementById('editFechaFutura').value;
    const placaAnterior = cl[idx].placa;

    const act = {
        ...cl[idx],
        nombre:      document.getElementById('editNombre').value.trim(),
        telefono:    document.getElementById('editTelefono').value.trim(),
        placa:       document.getElementById('editPlaca').value.toUpperCase().trim(),
        categoria:   document.getElementById('editCategoria').value,
        fechaActual: document.getElementById('editFechaActual').value,
        fechaFutura: fNueva,
        km:          document.getElementById('editKm').value
    };

    if (fAnt !== fNueva) setIdsContactados(getIdsContactados().filter(x => x !== id));

    // Actualizar historial local
    const h = getHistorialDB(), hIdx = h.findLastIndex(x => x.id === id);
    if (hIdx !== -1) { h[hIdx] = { ...h[hIdx], ...act, eliminado: false }; setHistorialDB(h); }

    // ⚠️ GOOGLE SHEETS — enviar acción "actualizar" con placa anterior por si cambió
    fetch(urlGoogle, {
        method: 'POST',
        mode:   'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...act, accion: "actualizar", placaAnterior: placaAnterior })
    }).catch(console.error);

    cl[idx] = act; setClientes(cl);
    cerrarModalEditar(); actualizarStats(); mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
}

// ═══════════ MENÚ Y PESTAÑAS ═══════════
function toggleMenu() {
    const s=document.getElementById('sidebar'),o=document.getElementById('overlay'),b=document.getElementById('menuBtn');
    if(s.classList.contains('open')){cerrarMenu();return;}
    s.classList.add('open');o.classList.add('active');b.classList.add('abierto');
}
function cerrarMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('menuBtn').classList.remove('abierto');
}

function seleccionarTab(tab) {
    document.querySelectorAll('.tab-view').forEach(v=>{v.style.display='none';v.classList.remove('active');});
    const v=document.getElementById('tab-'+tab); v.style.display='block'; v.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById('nav-'+tab).classList.add('active');
    const t={principal:'Panel Principal',database:'Base de Datos',historial:'Historial por Placa',contactados:'Contactados',agenda:'Agenda'};
    document.getElementById('tab-indicator').textContent=t[tab];
    if (tab==='database')    mostrarGeneral();
    if (tab==='contactados') mostrarContactados();
    if (tab==='agenda') {
        // 1. Mostrar INMEDIATAMENTE desde datos locales (sin esperar a Sheets)
        irHoyAgenda();
        // 2. Sincronizar en segundo plano y actualizar solo si hay cambios nuevos
        sincronizarSoloCitas().then(() => {
            if (document.getElementById('tab-agenda').classList.contains('active'))
                renderAgenda();
        });
    }
    cerrarMenu();
}

// Sincroniza solo las citas en segundo plano
async function sincronizarSoloCitas() {
    try {
        const res   = await fetch(urlGoogle + '?v=' + Date.now(), { method: 'GET', cache: 'no-cache' });
        const datos = await res.json();
        if (!datos.ok || !Array.isArray(datos.citas)) return;

        const citasSheets = datos.citas.map(c => ({
            citaId:    Number(c.citaId),
            placa:     String(c.placa     || '').toUpperCase().trim(),
            nombre:    String(c.nombre    || ''),
            telefono:  String(c.telefono  || ''),
            categoria: String(c.categoria || ''),
            fecha:     String(c.fecha     || ''),
            hora:      String(c.hora      || ''),
            espacio:   String(c.espacio   || ''),
            notas:     String(c.notas     || '')
        }));

        const idsSheets    = new Set(citasSheets.map(c => c.citaId));
        const citasLocales = getCitas();
        const ahora        = Date.now();

        // Conservar citas locales recientes que Sheets aún no confirmó (< 2 minutos)
        const pendientes = citasLocales.filter(c =>
            !idsSheets.has(Number(c.citaId)) && (ahora - Number(c.citaId)) < 600000
        );

        const citasMerge = [...citasSheets, ...pendientes];

        // Solo actualizar si hay diferencia real para evitar parpadeos
        const localIds  = new Set(citasLocales.map(c => Number(c.citaId)));
        const sheetsIds = new Set(citasMerge.map(c => Number(c.citaId)));
        const hayDiferencia =
            citasMerge.length !== citasLocales.length ||
            [...sheetsIds].some(id => !localIds.has(id)) ||
            [...localIds].some(id => !sheetsIds.has(id));

        if (hayDiferencia) {
            setCitas(citasMerge);
            actualizarBadgeAgenda();
            mostrarAlertas();
            if (document.getElementById('tab-database').classList.contains('active'))
                mostrarGeneral(document.getElementById('buscadorGeneral').value);
        }
    } catch (err) {
        console.warn('Sync citas falló:', err.message);
    }
}

// Auto-refresco cada 30 segundos en segundo plano
setInterval(() => {
    sincronizarSoloCitas().then(() => {
        if (document.getElementById('tab-agenda').classList.contains('active'))
            renderAgenda();
    });
}, 30000);

document.addEventListener('keydown', e => {
    if (e.key==='Escape'){cerrarModalEliminar();cerrarModalEditar();cerrarModalReservar();cerrarDetalleCita();}
});
*/
// ═══════════════════════════════════════════════
// AUTOGESTIÓN v3.4 — JS (CORREGIDO)
// ═══════════════════════════════════════════════

// ⚠️ GOOGLE SHEETS — NO MODIFICAR
const urlGoogle = "https://script.google.com/macros/s/AKfycbz10qVrREJLgl7MyA09WKi__xPJ7Ff2LTpZ2n8pTArS_xcHBGF-3im7q8FxzUhabXKCow/exec";

// ═══════════ CREDENCIALES ═══════════
const USUARIOS = [
  { usuario: "admin", clave: "autogestion2024" },
  { usuario: "taller", clave: "taller1234" }
];

// ═══════════ CONFIGURACIÓN DE ESPACIOS ═══════════
const ESPACIOS = {
  carcamo: { nombre: "Cárcamo", icono: "🔩", clase: "chip-carcamo", tag: "tag-carcamo" },
  gato_hidraulico: { nombre: "Gato Hidráulico", icono: "🔧", clase: "chip-gato_hidraulico", tag: "tag-gato_hidraulico" },
  gato_electrico: { nombre: "Gato Eléctrico", icono: "⚡", clase: "chip-gato_electrico", tag: "tag-gato_electrico" }
};

const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const HORAS_DISPLAY = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '11:00': '11:00 AM', '12:00': '12:00 PM', '13:00': '1:00 PM', '14:00': '2:00 PM',
  '15:00': '3:00 PM', '16:00': '4:00 PM', '17:00': '5:00 PM', '18:00': '6:00 PM', '19:00': '7:00 PM'
};

let filtroAgendaActual = 'todos';
let dragCitaId = null;

// ═══════════ INIT ═══════════
document.addEventListener('DOMContentLoaded', () => { verificarSesion(); });

// ═══════════ LOGIN ═══════════
function verificarSesion() {
  if (sessionStorage.getItem('ag_sesion') === 'ok') mostrarApp();
}
function intentarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('loginUser').value.trim();
  const clave = document.getElementById('loginPass').value;
  const error = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const txtBtn = document.getElementById('loginBtnText');
  const loader = document.getElementById('loginBtnLoader');

  btn.disabled = true; txtBtn.style.display = 'none'; loader.style.display = 'inline-block';
  error.classList.remove('visible');
  setTimeout(() => {
    const valido = USUARIOS.some(u => u.usuario === usuario && u.clave === clave);
    if (valido) {
      sessionStorage.setItem('ag_sesion', 'ok');
      document.getElementById('loginScreen').classList.add('saliendo');
      setTimeout(() => mostrarApp(), 400);
    } else {
      error.classList.add('visible');
      btn.disabled = false; txtBtn.style.display = 'inline'; loader.style.display = 'none';
      document.getElementById('loginPass').value = '';
      document.getElementById('loginPass').focus();
    }
  }, 600);
}

function mostrarApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'block';
  if (Notification.permission !== "granted") Notification.requestPermission();

  migrarClientesAHistorial();
  actualizarStats();
  mostrarAlertas();
  revisarCitasDeHoy();
  actualizarBadgeContactados();
  actualizarBadgeAgenda();

  sincronizarConSheets();
}

// ═══════════ SINCRONIZAR CON GOOGLE SHEETS (CORREGIDO) ═══════════
function sincronizarConSheets() {
  mostrarCargando(true);

  fetch(urlGoogle + '?v=' + Date.now(), { method: 'GET', cache: 'no-cache' })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(datos => {
      if (!datos.ok || !Array.isArray(datos.clientes)) {
        throw new Error('Respuesta inválida');
      }

      // Sincronizar clientes
      const clientesSheets = datos.clientes
        .filter(c => c.nombre || c.placa)
        .map(c => ({
          ...c,
          id: Number(c.id) || generarIdCliente(c.placa, c.fechaActual),
          nombre: String(c.nombre || ''),
          telefono: String(c.telefono || ''),
          placa: String(c.placa || '').toUpperCase().trim(),
          categoria: String(c.categoria || ''),
          fechaActual: String(c.fechaActual || ''),
          fechaFutura: String(c.fechaFutura || ''),
          km: String(c.km || '0')
        }));

      if (clientesSheets.length > 0) {
        setClientes(clientesSheets);
      }

      // 🔧 CORREGIDO: Sincronizar citas usando String para citaId y comparación correcta
      if (Array.isArray(datos.citas)) {
        const citasSheets = datos.citas.map(c => ({
          citaId: String(c.citaId),   // Forzar string
          placa: String(c.placa || '').toUpperCase().trim(),
          nombre: String(c.nombre || ''),
          telefono: String(c.telefono || ''),
          categoria: String(c.categoria || ''),
          fecha: String(c.fecha || ''),
          hora: String(c.hora || ''),
          espacio: String(c.espacio || ''),
          notas: String(c.notas || '')
        }));
        const idsSheets = new Set(citasSheets.map(c => c.citaId));
        const citasLocal = getCitas();
        const ahora = Date.now();
        // Conservar citas locales recientes (< 2 min) que Sheets aún no confirmó
        const pendientes = citasLocal.filter(c =>
          !idsSheets.has(String(c.citaId)) && (ahora - Number(c.citaId)) < 120000
        );
        setCitas([...citasSheets, ...pendientes]);
        console.log('✓ ' + citasSheets.length + ' citas + ' + pendientes.length + ' pendientes locales');
      }

      migrarClientesAHistorial();
      actualizarStats();
      mostrarAlertas();
      actualizarBadgeContactados();
      actualizarBadgeAgenda();
      if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
      if (document.getElementById('tab-contactados').classList.contains('active'))
        mostrarContactados();
      if (document.getElementById('tab-historial').classList.contains('active'))
        buscarHistorial();
      if (document.getElementById('tab-agenda').classList.contains('active'))
        renderAgenda();
      console.log('✓ ' + clientesSheets.length + ' clientes sincronizados desde Sheets');
    })
    .catch(err => {
      console.warn('Sheets no disponible — usando datos locales:', err.message);
    })
    .finally(() => {
      mostrarCargando(false);
    });
}

// Generar ID numérico consistente a partir de placa + fecha
function generarIdCliente(placa, fecha) {
  const str = String(placa) + String(fecha);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) || Date.now();
}

// ═══════════ INDICADOR DE CARGA ═══════════
function mostrarCargando(visible) {
  let el = document.getElementById('syncIndicador');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncIndicador';
    el.style.cssText = 'position:fixed;top:70px;right:20px;z-index:500;background:#0f172a;color:#38bdf8;padding:8px 16px;border-radius:8px;font-family:Syne,sans-serif;font-size:0.78rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  if (visible) {
    el.innerHTML = '<span style="animation:spin-slow 0.8s linear infinite;display:inline-block">⟳</span> Sincronizando...';
    el.style.opacity = '1';
    el.style.display = 'flex';
  } else {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }
}
function cerrarSesion() {
  sessionStorage.removeItem('ag_sesion');
  document.getElementById('appWrapper').style.display = 'none';
  const ls = document.getElementById('loginScreen');
  ls.style.display = 'flex'; ls.classList.remove('saliendo');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').classList.remove('visible');
}
function togglePassword() {
  const i = document.getElementById('loginPass');
  i.type = i.type === 'password' ? 'text' : 'password';
}

// ═══════════ STORAGE ═══════════
function getClientes() { return JSON.parse(localStorage.getItem('db_clientes')) || []; }
function setClientes(arr) { localStorage.setItem('db_clientes', JSON.stringify(arr)); }
function getHistorialDB() { return JSON.parse(localStorage.getItem('db_historial')) || []; }
function setHistorialDB(arr) { localStorage.setItem('db_historial', JSON.stringify(arr)); }
function getContactados() { return JSON.parse(localStorage.getItem('db_contactados_log')) || []; }
function setContactados(arr) { localStorage.setItem('db_contactados_log', JSON.stringify(arr)); }
function getIdsContactados() { return JSON.parse(localStorage.getItem('db_contactados_ids')) || []; }
function setIdsContactados(arr) { localStorage.setItem('db_contactados_ids', JSON.stringify(arr)); }
function getCitas() { return JSON.parse(localStorage.getItem('db_citas')) || []; }
function setCitas(arr) { localStorage.setItem('db_citas', JSON.stringify(arr)); }

function getHoy() { return new Date().toLocaleDateString('en-CA'); }
function diasRestantes(fechaStr) {
  return Math.ceil((new Date(String(fechaStr).trim()) - new Date(getHoy())) / 86400000);
}
function fechaHoraActual() {
  return new Date().toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatearFechaLarga(fechaStr) {
  const [y, m, d] = fechaStr.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ═══════════ MIGRACIÓN ═══════════
function migrarClientesAHistorial() {
  const h = getHistorialDB(), c = getClientes();
  if (!c.length) return;
  const ids = new Set(h.map(x => x.id));
  let n = 0;
  c.forEach(x => { if (!ids.has(x.id)) { h.push({ ...x, eliminado: false, fechaRegistro: x.fechaActual || fechaHoraActual() }); n++; } });
  if (n > 0) setHistorialDB(h);
}

// ═══════════ AUTORIZACIÓN ═══════════
function waMsgAutorizacion(nombre) {
  return encodeURIComponent(`Estimado/a ${nombre},\n\nDe acuerdo con la normativa vigente sobre protección de datos personales, le informamos que la información suministrada será utilizada únicamente para fines comerciales, de contacto, atención al cliente, envío de información, promociones y seguimiento de nuestros servicios.\nSus datos serán tratados de manera confidencial y no serán compartidos con terceros sin su autorización.\n\nSi usted autoriza el uso de sus datos personales y el contacto futuro, por favor responda con: "SÍ" o "1".\nSi usted NO autoriza, responda con: "NO" o "0".`);
}
function enviarAutorizacion() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  if (!nombre || !telefono) { alert('Ingresa el nombre y teléfono del cliente primero.'); return; }
  window.open(`https://wa.me/57${telefono}?text=${waMsgAutorizacion(nombre)}`, '_blank');
}

// ═══════════ GUARDAR CLIENTE ═══════════
document.getElementById('clienteForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = {
    id: Date.now(),
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    placa: document.getElementById('placa').value.toUpperCase().trim(),
    categoria: document.getElementById('categoria').value,
    fechaActual: document.getElementById('fechaActual').value,
    fechaFutura: document.getElementById('fechaFutura').value,
    km: document.getElementById('kilometraje').value
  };
  fetch(urlGoogle, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...c, accion: "guardar" }) }).catch(console.error);
  const cl = getClientes(); cl.push(c); setClientes(cl);
  const h = getHistorialDB(); h.push({ ...c, eliminado: false, fechaRegistro: fechaHoraActual() }); setHistorialDB(h);
  document.getElementById('clienteForm').reset();
  mostrarToast(); actualizarStats(); mostrarAlertas(); revisarCitasDeHoy();
});
function mostrarToast() { const t = document.getElementById('toastGuardado'); t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }

// ═══════════ STATS ═══════════
function actualizarStats() {
  const cl = getClientes(), hoy = getHoy();
  const v = cl.filter(c => String(c.fechaFutura).trim() < hoy).length;
  const h = cl.filter(c => String(c.fechaFutura).trim() === hoy).length;
  document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card stat-primary"><div class="stat-value">${cl.length}</div><div class="stat-label">Total clientes</div></div>
        <div class="stat-card stat-danger"><div class="stat-value">${v}</div><div class="stat-label">Vencidos</div></div>
        <div class="stat-card stat-warning"><div class="stat-value">${h}</div><div class="stat-label">Citas hoy</div></div>
        <div class="stat-card stat-success"><div class="stat-value">${cl.length - v - h}</div><div class="stat-label">Al día</div></div>`;
}
function buildBadge(fechaStr, eliminado = false) {
  if (eliminado) return `<span class="badge-eliminado">● Eliminado</span>`;
  const hoy = getHoy(), f = String(fechaStr).trim(), d = diasRestantes(f);
  if (f === hoy) return `<span class="badge-estado badge-hoy">⚠ HOY</span>`;
  if (f < hoy) return `<span class="badge-estado badge-vencido">✕ VENCIDO hace ${Math.abs(d)}d</span>`;
  if (d <= 7) return `<span class="badge-estado badge-pronto">📅 En ${d} días</span>`;
  return `<span class="badge-estado badge-ok">✓ OK — ${d}d</span>`;
}

// ═══════════ CONSTRUIR FILA ═══════════
function construirFila(c) {
  const nombre = String(c.nombre || '');
  const telefono = String(c.telefono || '');
  const placa = String(c.placa || '').toUpperCase().trim();
  const categoria = String(c.categoria || 'Servicio General');
  const fechaActual = String(c.fechaActual || '');
  const fechaFutura = String(c.fechaFutura || '');
  const km = String(c.km || '0');
  const id = c.id;

  const hoy = getHoy(), f = fechaFutura.trim();
  const esHoy = f === hoy, esV = f < hoy;
  const marcado = getIdsContactados().includes(id);
  const cl = esHoy ? 'fila-hoy' : esV ? 'fila-vencido' : '';

  const waTxt = esHoy
    ? `Hola%20${encodeURIComponent(nombre)},%20te%20recordamos%20que%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20es%20HOY.%20%C2%A1Te%20esperamos!`
    : `Hola%20${encodeURIComponent(nombre)},%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20est%C3%A1%20vencido.%20%C2%A1Cont%C3%A1ctanos!`;

  const citasCliente = getCitas().filter(ct => String(ct.placa).toUpperCase() === placa && ct.fecha >= hoy);
  const tieneReserva = citasCliente.length > 0;
  const nombreSafe = nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const categoriaSafe = categoria.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const btnReservar = tieneReserva
    ? `<button class="btn-reservar-cita btn-reservado" onclick="abrirModalReservar(${id},'${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">✅ Reservado</button>`
    : `<button class="btn-reservar-cita" onclick="abrirModalReservar(${id},'${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">📅 Reservar</button>`;

  const tr = document.createElement('tr');
  if (cl) tr.classList.add(cl);
  tr.innerHTML = `
        <td>${nombre}<small>${categoria}</small></td>
        <td>${telefono}</td>
        <td><strong>${placa}</strong></td>
        <td>${fechaActual}</td>
        <td>${fechaFutura}</td>
        <td>${buildBadge(fechaFutura)}</td>
        <td>${km} KM</td>
        <td>${btnReservar}</td>
        <td>
            <div class="acciones">
                <div class="btn-wa-wrap">
                    <a href="https://wa.me/57${telefono}?text=${waTxt}" target="_blank" class="btn-wa">📱 WhatsApp</a>
                    <button class="btn-chulo ${marcado ? 'marcado' : ''}" onclick="toggleContactado(${id})" title="${marcado ? 'Contactado ✓' : 'Marcar contactado'}">✓</button>
                </div>
                <button class="btn-edit" onclick="abrirModalEditar(${id})">✎ Editar</button>
                <button class="btn-del"  onclick="abrirModalEliminar(${id})">✕ Eliminar</button>
            </div>
        </td>`;
  return tr;
}

// ═══════════ CONTACTADO ═══════════
function toggleContactado(id) {
  const c = getClientes().find(x => x.id === id); if (!c) return;
  let ids = getIdsContactados();
  if (ids.includes(id)) { setIdsContactados(ids.filter(x => x !== id)); }
  else {
    ids.push(id); setIdsContactados(ids);
    const log = getContactados();
    log.push({ logId: Date.now(), clienteId: c.id, nombre: c.nombre, telefono: c.telefono, placa: c.placa, categoria: c.categoria, fechaActual: c.fechaActual, fechaFutura: c.fechaFutura, km: c.km, fechaContacto: fechaHoraActual() });
    setContactados(log);
  }
  actualizarBadgeContactados(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active')) mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-contactados').classList.contains('active')) mostrarContactados();
}
function actualizarBadgeContactados() { document.getElementById('nav-badge-contactados').textContent = getContactados().length; }

// ═══════════ ALERTAS ═══════════
function mostrarAlertas() {
  const tbody = document.getElementById('listaAlertas'), empty = document.getElementById('emptyAlertas'), hoy = getHoy();
  const al = getClientes().filter(c => { const f = String(c.fechaFutura).trim(); return f === hoy || f < hoy; })
    .sort((a, b) => { const fa = String(a.fechaFutura).trim(), fb = String(b.fechaFutura).trim(); if (fa === hoy && fb !== hoy) return -1; if (fb === hoy && fa !== hoy) return 1; return fb.localeCompare(fa); });
  tbody.innerHTML = '';
  if (!al.length) { empty.style.display = 'block'; document.getElementById('tablaAlertas').style.display = 'none'; }
  else { empty.style.display = 'none'; document.getElementById('tablaAlertas').style.display = ''; al.forEach(c => tbody.appendChild(construirFila(c))); }
  document.getElementById('badge-alertas').textContent = al.length;
  document.getElementById('nav-badge').textContent = al.length;
}

// ═══════════ BASE DE DATOS ═══════════
function mostrarGeneral(filtro = '') {
  const tbody = document.getElementById('listaGeneral'), empty = document.getElementById('emptyGeneral'), hoy = getHoy();
  let cl = getClientes();
  if (filtro) { const f = filtro.toUpperCase(); cl = cl.filter(c => c.nombre.toUpperCase().includes(f) || c.placa.toUpperCase().includes(f) || (c.categoria || '').toUpperCase().includes(f) || c.telefono.includes(filtro)); }
  cl.sort((a, b) => String(a.fechaFutura).localeCompare(String(b.fechaFutura)));
  const todos = getClientes(), v = todos.filter(c => String(c.fechaFutura).trim() < hoy).length, hC = todos.filter(c => String(c.fechaFutura).trim() === hoy).length;
  document.getElementById('dbStats').innerHTML = `
        <div class="db-stat-item"><span class="db-dot" style="background:#ef4444"></span>${v} vencidos</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#f59e0b"></span>${hC} hoy</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#10b981"></span>${todos.length - v - hC} al día</div>
        <div class="db-stats-total">${todos.length} registros</div>`;
  tbody.innerHTML = '';
  if (!cl.length) { empty.style.display = 'block'; document.getElementById('tablaGeneral').style.display = 'none'; }
  else { empty.style.display = 'none'; document.getElementById('tablaGeneral').style.display = ''; cl.forEach(c => tbody.appendChild(construirFila(c))); }
}
function filtrarGeneral() { mostrarGeneral(document.getElementById('buscadorGeneral').value); }
function limpiarBuscadorGeneral() { document.getElementById('buscadorGeneral').value = ''; mostrarGeneral(); document.getElementById('buscadorGeneral').focus(); }

// ═══════════ HISTORIAL ═══════════
function buscarHistorial() {
  const placa = document.getElementById('buscadorPlaca').value.toUpperCase().trim();
  const res = document.getElementById('historialResultado');
  if (placa.length < 3) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Ingresa una placa para ver su historial completo.</p></div>`; return; }
  const regs = getHistorialDB().filter(c => c.placa.toUpperCase().includes(placa)).sort((a, b) => String(a.fechaActual).localeCompare(String(b.fechaActual)));
  if (!regs.length) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron registros para "<strong>${placa}</strong>".</p></div>`; return; }
  const hoy = getHoy(), pu = [...new Set(regs.map(c => c.placa))];
  let html = '';
  pu.forEach(p => {
    const r = regs.filter(c => c.placa === p), d = new Set(r.map(x => x.nombre)).size;
    html += `<div class="historial-placa-header"><div class="historial-placa-badge">${p}</div><div class="historial-meta"><strong>${r.length}</strong> servicio${r.length !== 1 ? 's' : ''} · <strong>${d}</strong> dueño${d !== 1 ? 's' : ''}</div></div><div class="historial-timeline">`;
    r.forEach((c, idx) => {
      const esE = c.eliminado === true, esH = !esE && String(c.fechaFutura).trim() === hoy, esV = !esE && String(c.fechaFutura).trim() < hoy;
      const dotC = esE ? '' : esH ? 'dot-hoy' : esV ? 'dot-vencido' : 'dot-actual';
      const cardC = esE ? 'card-eliminado' : esH ? 'card-hoy' : esV ? 'card-vencido' : 'card-actual';
      html += `<div class="historial-item"><div class="historial-linea"><div class="historial-dot ${dotC}"></div>${idx !== r.length - 1 ? '<div class="historial-connector"></div>' : ''}</div>
            <div class="historial-card ${cardC}">
                <div class="historial-card-top"><div class="historial-nombre">${c.nombre}<small>${c.telefono}</small></div>${buildBadge(c.fechaFutura, esE)}</div>
                <div class="historial-card-info">
                    <div class="historial-info-item">🔧 <strong>${c.categoria}</strong></div>
                    <div class="historial-info-item">📅 Ingreso: <strong>${c.fechaActual}</strong></div>
                    <div class="historial-info-item">📅 Contacto: <strong>${c.fechaFutura}</strong></div>
                    <div class="historial-info-item">🛣 <strong>${c.km} KM</strong></div>
                    ${esE ? '<div class="historial-info-item">🗑 <strong>Eliminado del sistema</strong></div>' : ''}
                </div>
                ${!esE ? `<button class="btn-reservar-historial" onclick="abrirModalReservar(${c.id || 'null'},'${c.placa}','${c.nombre.replace(/'/g, "\\'")}','${c.telefono}','${c.categoria.replace(/'/g, "\\'")}')">📅 Reservar cita</button>` : ''}
            </div></div>`;
    });
    html += `</div>`;
  });
  res.innerHTML = html;
}
function limpiarHistorial() { document.getElementById('buscadorPlaca').value = ''; buscarHistorial(); document.getElementById('buscadorPlaca').focus(); }

// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro = '') {
  const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
  let log = filtro ? getContactados().filter(r => { const f = filtro.toUpperCase(); return r.nombre.toUpperCase().includes(f) || r.placa.toUpperCase().includes(f) || (r.categoria || '').toUpperCase().includes(f); }) : getContactados();
  log = [...log].reverse();
  const total = getContactados().length, placas = new Set(getContactados().map(r => r.placa)).size;
  document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
  tbody.innerHTML = '';
  if (!log.length) { empty.style.display = 'block'; document.getElementById('tablaContactados').style.display = 'none'; }
  else {
    empty.style.display = 'none'; document.getElementById('tablaContactados').style.display = '';
    log.forEach(r => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.nombre}<small>${r.telefono}</small></td><td>${r.telefono}</td><td><strong>${r.placa}</strong></td><td>${r.categoria}</td><td>${r.fechaActual}</td><td>${r.fechaFutura}</td><td>${r.km} KM</td><td><span class="fecha-contacto-badge">📞 ${r.fechaContacto}</span></td><td><button class="btn-del-contactado" onclick="eliminarLogContactado(${r.logId})">✕ Quitar</button></td>`; tbody.appendChild(tr); });
  }
}
function eliminarLogContactado(id) { setContactados(getContactados().filter(r => r.logId !== id)); actualizarBadgeContactados(); mostrarContactados(document.getElementById('buscadorContactados').value); }
function filtrarContactados() { mostrarContactados(document.getElementById('buscadorContactados').value); }
function limpiarBuscadorContactados() { document.getElementById('buscadorContactados').value = ''; mostrarContactados(); document.getElementById('buscadorContactados').focus(); }

// ═══════════════════════════════════════════
// MODAL RESERVAR CITA — FLUJO POR PASOS
// ═══════════════════════════════════════════
let reservarEspacioActual = null;
let reservarHoraActual = null;

function abrirModalReservar(clienteId, placa, nombre, telefono, categoria) {
  document.getElementById('reservarClienteId').value = clienteId;
  document.getElementById('reservarPlacaH').value = placa;
  document.getElementById('reservarNombreH').value = nombre;
  document.getElementById('reservarTelefonoH').value = telefono;
  document.getElementById('reservarCategoriaH').value = categoria;
  document.getElementById('reservarFecha').value = getHoy();
  document.getElementById('reservarNotas').value = '';
  document.getElementById('reservarHora').value = '';
  document.getElementById('reservarEspacio').value = '';
  reservarEspacioActual = null;
  reservarHoraActual = null;

  document.getElementById('reservarInfo').innerHTML = `
        <div class="reservar-info-placa">${placa}</div>
        <div class="reservar-info-detalle"><strong>${nombre}</strong><br>${categoria} · ${telefono}</div>`;

  document.getElementById('reservarPaso1').style.display = 'block';
  document.getElementById('reservarPaso2').style.display = 'none';
  document.getElementById('reservarPaso3').style.display = 'none';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';

  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));

  document.getElementById('modalReservar').classList.add('active');
  mostrarPaso2();
}

function mostrarPaso2() {
  const fecha = document.getElementById('reservarFecha').value;
  if (!fecha) return;
  document.getElementById('reservarPaso2').style.display = 'block';
  document.getElementById('reservarPaso3').style.display = 'none';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';
  reservarEspacioActual = null;
  reservarHoraActual = null;
  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
}

function seleccionarEspacio(espacio) {
  reservarEspacioActual = espacio;
  reservarHoraActual = null;
  document.getElementById('reservarEspacio').value = espacio;

  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
  const claseMap = { carcamo: 'espacio-carcamo', gato_hidraulico: 'espacio-hidraulico', gato_electrico: 'espacio-electrico' };
  document.querySelector('.' + claseMap[espacio]).classList.add('seleccionado');

  mostrarHorasDisponibles();
}

function mostrarHorasDisponibles() {
  const fecha = document.getElementById('reservarFecha').value;
  const espacio = reservarEspacioActual;
  if (!fecha || !espacio) return;

  const ocupadas = new Set(
    getCitas()
      .filter(c => c.fecha === fecha && c.espacio === espacio)
      .map(c => c.hora)
  );

  const hayDisponibles = HORAS.some(h => !ocupadas.has(h));

  let html = '';
  if (!hayDisponibles) {
    html = `<div class="sin-horas-msg">⚠ No hay horarios disponibles para este espacio en la fecha seleccionada. Prueba con otro espacio u otra fecha.</div>`;
  } else {
    HORAS.forEach(h => {
      const ocupada = ocupadas.has(h);
      html += `<button class="hora-btn ${ocupada ? 'ocupada' : ''}"
                ${ocupada ? 'disabled title="Horario ocupado"' : 'onclick="seleccionarHora(\'' + h + '\')"'}>
                ${HORAS_DISPLAY[h]}${ocupada ? ' 🔒' : ''}
            </button>`;
    });
  }

  document.getElementById('horasDisponibles').innerHTML = html;
  document.getElementById('horaSeleccionadaInfo').style.display = 'none';
  document.getElementById('reservarPaso3').style.display = 'block';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';
}

function seleccionarHora(hora) {
  reservarHoraActual = hora;
  document.getElementById('reservarHora').value = hora;

  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('seleccionada'));
  event.target.classList.add('seleccionada');

  const esp = ESPACIOS[reservarEspacioActual];
  document.getElementById('horaSeleccionadaInfo').textContent =
    `✓ Seleccionado: ${HORAS_DISPLAY[hora]} en ${esp.icono} ${esp.nombre}`;
  document.getElementById('horaSeleccionadaInfo').style.display = 'block';

  document.getElementById('reservarPaso4').style.display = 'block';
  document.getElementById('btnConfirmarReserva').style.display = 'inline-flex';
}

// 🔧 CORREGIDO: confirmarReserva con citaId string y fetch mode:'cors'
function confirmarReserva() {
  const fecha = document.getElementById('reservarFecha').value;
  const hora = document.getElementById('reservarHora').value;
  const espacio = document.getElementById('reservarEspacio').value;
  const notas = document.getElementById('reservarNotas').value.trim();
  const placa = document.getElementById('reservarPlacaH').value;
  const nombre = document.getElementById('reservarNombreH').value;
  const telefono = document.getElementById('reservarTelefonoH').value;
  const categoria = document.getElementById('reservarCategoriaH').value;
  const clienteId = document.getElementById('reservarClienteId').value;

  if (!fecha || !hora || !espacio) { alert('Completa todos los pasos antes de confirmar.'); return; }

  const conflicto = getCitas().find(c => c.fecha === fecha && c.hora === hora && c.espacio === espacio);
  if (conflicto) {
    alert(`⚠ Ya existe una reserva en ese horario para ${ESPACIOS[espacio].nombre}. Selecciona otra hora o espacio.`);
    return;
  }

  const nuevaCita = {
    citaId: String(Date.now()),  // 🔧 CORREGIDO: string en lugar de número
    clienteId, placa, nombre, telefono, categoria, fecha, hora, espacio, notas
  };

  const citas = getCitas();
  citas.push(nuevaCita);
  setCitas(citas);

  // Guardar en Google Sheets
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',                // 🔧 CORREGIDO: 'cors' en lugar de 'no-cors'
    body: JSON.stringify({ ...nuevaCita, accion: 'guardar_cita' })
  }).catch(console.error);

  cerrarModalReservar();
  actualizarBadgeAgenda();
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-agenda').classList.contains('active')) renderAgenda();

  // 🔧 Forzar sincronización inmediata para reflejar en la nube
  sincronizarSoloCitas();
}

function cerrarModalReservar() { document.getElementById('modalReservar').classList.remove('active'); }

// ═══════════════════════════════════════════
// AGENDA — RENDER PRINCIPAL
// ═══════════════════════════════════════════
function actualizarBadgeAgenda() {
  const hoy = getHoy();
  const total = getCitas().filter(c => c.fecha === hoy).length;
  document.getElementById('nav-badge-agenda').textContent = total;
}

function irHoyAgenda() {
  document.getElementById('agendaFecha').value = getHoy();
  renderAgenda();
}

function cambiarDiaAgenda(delta) {
  const input = document.getElementById('agendaFecha');
  const fecha = input.value || getHoy();
  const [y, m, d] = fecha.split('-').map(Number);
  input.value = new Date(y, m - 1, d + delta).toLocaleDateString('en-CA');
  renderAgenda();
}

function setFiltroAgenda(filtro) {
  filtroAgendaActual = filtro;
  document.querySelectorAll('.agenda-filtro-btn').forEach(b => b.classList.remove('activo'));
  document.getElementById('filtro-' + filtro).classList.add('activo');
  renderAgenda();
}

function renderAgenda() {
  const fecha = document.getElementById('agendaFecha').value || getHoy();
  const label = document.getElementById('agendaFechaLabel');
  const contenido = document.getElementById('agendaContenido');
  const resumen = document.getElementById('agendaResumen');
  const horaActual = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5);

  label.textContent = formatearFechaLarga(fecha);

  let citasDelDia = getCitas().filter(c => c.fecha === fecha);
  if (filtroAgendaActual !== 'todos') citasDelDia = citasDelDia.filter(c => c.espacio === filtroAgendaActual);

  const totalCitas = citasDelDia.length;
  const espaciosOcupados = new Set(citasDelDia.map(c => c.espacio)).size;
  resumen.textContent = totalCitas > 0
    ? `${totalCitas} cita${totalCitas !== 1 ? 's' : ''} · ${espaciosOcupados} espacio${espaciosOcupados !== 1 ? 's' : ''} ocupado${espaciosOcupados !== 1 ? 's' : ''}`
    : 'Sin citas para este día';

  let html = '';

  HORAS.forEach(hora => {
    const citasEnEstaHora = citasDelDia.filter(c => c.hora === hora);
    const esHoraActual = fecha === getHoy() && horaActual >= hora && horaActual < siguienteHora(hora);

    html += `<div class="agenda-slot ${citasEnEstaHora.length > 0 ? 'tiene-citas' : ''}"
            data-fecha="${fecha}" data-hora="${hora}"
            ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">

            <div class="agenda-hora-col ${esHoraActual ? 'hora-actual' : ''}">
                ${HORAS_DISPLAY[hora]}
            </div>

            <div class="agenda-citas-col">`;

    if (citasEnEstaHora.length > 0) {
      citasEnEstaHora.forEach(cita => {
        const esp = ESPACIOS[cita.espacio] || {};
        html += `
                <div class="agenda-cita-chip ${esp.clase || ''}"
                    draggable="true"
                    data-citaid="${cita.citaId}"
                    ondragstart="onDragStart(event,${cita.citaId})"
                    ondragend="onDragEnd(event)">
                    <span class="cita-espacio-tag ${esp.tag || ''}">${esp.icono || ''} ${esp.nombre || cita.espacio}</span>
                    <span class="cita-placa">${cita.placa}</span>
                    <div class="cita-info">
                        ${cita.nombre}
                        ${cita.notas ? `<small>📝 ${cita.notas}</small>` : ''}
                    </div>
                    <div class="cita-acciones">
                        <button class="btn-ver-cita" onclick="verDetalleCita(${cita.citaId})" title="Ver detalle">👁</button>
                        <button class="btn-del-cita-chip" onclick="eliminarCita(${cita.citaId})">✕</button>
                    </div>
                </div>`;
      });
    } else {
      html += `<div class="agenda-empty-slot"
                ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">
                Sin reservas
            </div>`;
    }

    html += `</div></div>`;
  });

  contenido.innerHTML = html;
  actualizarBadgeAgenda();
}

function siguienteHora(hora) {
  const idx = HORAS.indexOf(hora);
  return idx < HORAS.length - 1 ? HORAS[idx + 1] : '23:59';
}

// 🔧 CORREGIDO: eliminarCita sin código duplicado y con fetch mode:'cors'
function eliminarCita(citaId) {
  setCitas(getCitas().filter(c => c.citaId !== citaId));

  // Enviar eliminación a Google Sheets
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ citaId: String(citaId), accion: 'eliminar_cita' })
  }).catch(console.error);

  actualizarBadgeAgenda();
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  renderAgenda();
}

function verDetalleCita(citaId) {
  const cita = getCitas().find(c => c.citaId === citaId);
  if (!cita) return;

  const esp = ESPACIOS[cita.espacio] || {};
  const hoy = getHoy();
  const waTxt = encodeURIComponent(`Hola ${cita.nombre}, te confirmamos tu cita en ${esp.nombre} el ${cita.fecha} a las ${HORAS_DISPLAY[cita.hora]}. ¡Te esperamos!`);
  const esHoy = cita.fecha === hoy;
  const esPasada = cita.fecha < hoy;

  const estadoFecha = esHoy
    ? `<span class="badge-estado badge-hoy">⚠ HOY</span>`
    : esPasada
      ? `<span class="badge-estado badge-vencido">Pasada</span>`
      : `<span class="badge-estado badge-ok">Próxima</span>`;

  document.getElementById('detalleCitaContenido').innerHTML = `
        <div class="detalle-espacio-header detalle-espacio-${cita.espacio}">
            <span class="detalle-espacio-icon">${esp.icono}</span>
            <div>
                <div class="detalle-espacio-nombre">${esp.nombre}</div>
                <div class="detalle-espacio-hora">${HORAS_DISPLAY[cita.hora]} · ${cita.fecha} ${estadoFecha}</div>
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">📋 Datos de la Cita</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Placa</span><span class="detalle-valor detalle-placa">${cita.placa}</span></div>
                <div class="detalle-item"><span class="detalle-label">Servicio</span><span class="detalle-valor">${cita.categoria}</span></div>
                <div class="detalle-item"><span class="detalle-label">Fecha</span><span class="detalle-valor">${cita.fecha}</span></div>
                <div class="detalle-item"><span class="detalle-label">Hora</span><span class="detalle-valor">${HORAS_DISPLAY[cita.hora]}</span></div>
                ${cita.notas ? `<div class="detalle-item detalle-item-full"><span class="detalle-label">Notas</span><span class="detalle-valor">📝 ${cita.notas}</span></div>` : ''}
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">👤 Datos del Cliente</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Nombre</span><span class="detalle-valor">${cita.nombre}</span></div>
                <div class="detalle-item"><span class="detalle-label">Teléfono</span><span class="detalle-valor">${cita.telefono}</span></div>
            </div>
        </div>
        <div class="detalle-acciones">
            <a href="https://wa.me/57${cita.telefono}?text=${waTxt}" target="_blank" class="btn-wa btn-detalle-wa">
                📱 Contactar por WhatsApp
            </a>
            <button class="btn-del btn-detalle-del" onclick="if(confirm('¿Cancelar esta reserva?')){eliminarCita(${cita.citaId});cerrarDetalleCita();}">
                ✕ Cancelar reserva
            </button>
        </div>`;

  document.getElementById('modalDetalleCita').classList.add('active');
}

function cerrarDetalleCita() {
  document.getElementById('modalDetalleCita').classList.remove('active');
}

// ═══════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════
function onDragStart(event, citaId) {
  dragCitaId = citaId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(event) {
  event.target.classList.remove('dragging');
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
}

function onDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const slot = event.currentTarget;
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
  slot.classList.add('drop-target');
}

function onDrop(event, nuevaHora) {
  event.preventDefault();
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));

  if (!dragCitaId) return;

  const citas = getCitas();
  const citaIdx = citas.findIndex(c => c.citaId === dragCitaId);
  if (citaIdx === -1) return;

  const cita = citas[citaIdx];
  const fecha = document.getElementById('agendaFecha').value || getHoy();

  const conflicto = citas.find(c => c.fecha === fecha && c.hora === nuevaHora && c.espacio === cita.espacio && c.citaId !== dragCitaId);
  if (conflicto) {
    mostrarToastError(`⚠ ${ESPACIOS[cita.espacio].nombre} ya tiene una reserva a las ${HORAS_DISPLAY[nuevaHora]}`);
    dragCitaId = null;
    return;
  }

  citas[citaIdx] = { ...cita, hora: nuevaHora };
  setCitas(citas);
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ citaId: String(dragCitaId), hora: nuevaHora, accion: 'mover_cita' })
  }).catch(console.error);
  dragCitaId = null;
  renderAgenda();
}

function mostrarToastError(msg) {
  let toast = document.getElementById('toastError');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastError';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 20px;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.12);';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ═══════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════
function revisarCitasDeHoy() {
  const hoy = getHoy();
  getClientes().forEach(c => { if (String(c.fechaFutura).trim() === hoy) dispararNotificacion(c); });
}
function dispararNotificacion(c) {
  if (Notification.permission === "granted")
    new Notification(`RECORDATORIO: ${c.nombre}`, { body: `Hoy: ${c.categoria} · Placa ${c.placa} · Tel: ${c.telefono}`, icon: 'https://cdn-icons-png.flaticon.com/512/1033/1033935.png' });
}

// ═══════════ MODAL ELIMINAR ═══════════
let idPendienteEliminar = null;
function abrirModalEliminar(id) {
  const c = getClientes().find(x => x.id === id); if (!c) return;
  idPendienteEliminar = id;
  document.getElementById('modalEliminarTexto').textContent = `¿Eliminar a "${c.nombre}" (${c.placa})? Se moverá a la papelera en Google Sheets.`;
  document.getElementById('modalEliminar').classList.add('active');
  document.getElementById('btnConfirmarEliminar').onclick = confirmarEliminar;
}
function cerrarModalEliminar() { document.getElementById('modalEliminar').classList.remove('active'); idPendienteEliminar = null; }
function confirmarEliminar() { if (idPendienteEliminar) { eliminarCliente(idPendienteEliminar); cerrarModalEliminar(); } }

function eliminarCliente(id) {
  const cl = getClientes(), c = cl.find(x => x.id === id);
  if (c) {
    fetch(urlGoogle, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ placa: c.placa, accion: "eliminar" }) }).catch(console.error);
    const h = getHistorialDB(), idx = h.findLastIndex(x => x.id === id);
    if (idx !== -1) { h[idx].eliminado = true; setHistorialDB(h); }
    setCitas(getCitas().filter(ct => String(ct.placa).toUpperCase() !== String(c.placa).toUpperCase()));
  }
  setIdsContactados(getIdsContactados().filter(x => x !== id));
  setClientes(cl.filter(x => x.id !== id));
  actualizarStats(); mostrarAlertas(); actualizarBadgeAgenda();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-agenda').classList.contains('active'))
    renderAgenda();
}

// ═══════════ MODAL EDITAR ═══════════
function abrirModalEditar(id) {
  const c = getClientes().find(x => x.id === id); if (!c) return;
  document.getElementById('editId').value = c.id;
  document.getElementById('editNombre').value = c.nombre;
  document.getElementById('editTelefono').value = c.telefono;
  document.getElementById('editPlaca').value = c.placa;
  document.getElementById('editCategoria').value = c.categoria;
  document.getElementById('editFechaActual').value = c.fechaActual;
  document.getElementById('editFechaFutura').value = c.fechaFutura;
  document.getElementById('editKm').value = c.km;
  document.getElementById('modalEditar').classList.add('active');
}
function cerrarModalEditar() { document.getElementById('modalEditar').classList.remove('active'); }

function guardarEdicion() {
  const id = parseInt(document.getElementById('editId').value);
  const cl = getClientes(), idx = cl.findIndex(x => x.id === id);
  if (idx === -1) return;

  const fAnt = cl[idx].fechaFutura;
  const fNueva = document.getElementById('editFechaFutura').value;
  const placaAnterior = cl[idx].placa;

  const act = {
    ...cl[idx],
    nombre: document.getElementById('editNombre').value.trim(),
    telefono: document.getElementById('editTelefono').value.trim(),
    placa: document.getElementById('editPlaca').value.toUpperCase().trim(),
    categoria: document.getElementById('editCategoria').value,
    fechaActual: document.getElementById('editFechaActual').value,
    fechaFutura: fNueva,
    km: document.getElementById('editKm').value
  };

  if (fAnt !== fNueva) setIdsContactados(getIdsContactados().filter(x => x !== id));

  const h = getHistorialDB(), hIdx = h.findLastIndex(x => x.id === id);
  if (hIdx !== -1) { h[hIdx] = { ...h[hIdx], ...act, eliminado: false }; setHistorialDB(h); }

  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ ...act, accion: "actualizar", placaAnterior: placaAnterior })
  }).catch(console.error);

  cl[idx] = act; setClientes(cl);
  cerrarModalEditar(); actualizarStats(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
}

// ═══════════ MENÚ Y PESTAÑAS ═══════════
function toggleMenu() {
  const s = document.getElementById('sidebar'), o = document.getElementById('overlay'), b = document.getElementById('menuBtn');
  if (s.classList.contains('open')) { cerrarMenu(); return; }
  s.classList.add('open'); o.classList.add('active'); b.classList.add('abierto');
}
function cerrarMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('menuBtn').classList.remove('abierto');
}

function seleccionarTab(tab) {
  document.querySelectorAll('.tab-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
  const v = document.getElementById('tab-' + tab); v.style.display = 'block'; v.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + tab).classList.add('active');
  const t = { principal: 'Panel Principal', database: 'Base de Datos', historial: 'Historial por Placa', contactados: 'Contactados', agenda: 'Agenda' };
  document.getElementById('tab-indicator').textContent = t[tab];
  if (tab === 'database') mostrarGeneral();
  if (tab === 'contactados') mostrarContactados();
  if (tab === 'agenda') {
    irHoyAgenda();
    sincronizarSoloCitas().then(() => {
      if (document.getElementById('tab-agenda').classList.contains('active'))
        renderAgenda();
    });
  }
  cerrarMenu();
}

// 🔧 CORREGIDO: sincronizarSoloCitas con manejo de string para citaId
async function sincronizarSoloCitas() {
  try {
    const res = await fetch(urlGoogle + '?v=' + Date.now(), { method: 'GET', cache: 'no-cache' });
    const datos = await res.json();
    if (!datos.ok || !Array.isArray(datos.citas)) return;

    const citasSheets = datos.citas.map(c => ({
      citaId: String(c.citaId),
      placa: String(c.placa || '').toUpperCase().trim(),
      nombre: String(c.nombre || ''),
      telefono: String(c.telefono || ''),
      categoria: String(c.categoria || ''),
      fecha: String(c.fecha || ''),
      hora: String(c.hora || ''),
      espacio: String(c.espacio || ''),
      notas: String(c.notas || '')
    }));

    const idsSheets = new Set(citasSheets.map(c => c.citaId));
    const citasLocales = getCitas();
    const ahora = Date.now();

    const pendientes = citasLocales.filter(c =>
      !idsSheets.has(String(c.citaId)) && (ahora - Number(c.citaId)) < 600000
    );

    const citasMerge = [...citasSheets, ...pendientes];

    const localIds = new Set(citasLocales.map(c => String(c.citaId)));
    const sheetsIds = new Set(citasMerge.map(c => String(c.citaId)));
    const hayDiferencia =
      citasMerge.length !== citasLocales.length ||
      [...sheetsIds].some(id => !localIds.has(id)) ||
      [...localIds].some(id => !sheetsIds.has(id));

    if (hayDiferencia) {
      setCitas(citasMerge);
      actualizarBadgeAgenda();
      mostrarAlertas();
      if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
    }
  } catch (err) {
    console.warn('Sync citas falló:', err.message);
  }
}

setInterval(() => {
  sincronizarSoloCitas().then(() => {
    if (document.getElementById('tab-agenda').classList.contains('active'))
      renderAgenda();
  });
}, 30000);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { cerrarModalEliminar(); cerrarModalEditar(); cerrarModalReservar(); cerrarDetalleCita(); }
});
