
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

setInterval(() => {
  sincronizarSoloCitas().then(() => {
    if (document.getElementById('tab-agenda').classList.contains('active'))
      renderAgenda();
  });
}, 30000);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { cerrarModalEliminar(); cerrarModalEditar(); cerrarModalReservar(); cerrarDetalleCita(); }
});
