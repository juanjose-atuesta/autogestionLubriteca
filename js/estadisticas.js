// ═══════════ ESTADÍSTICAS DE PUNTOS ═══════════
let cacheRankingUsuarios = [];
let estadisticasUsuarioIdEditar = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function escaparHtmlStats(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Badge del nav ─────────────────────────────────────────────────────────────

function actualizarBadgeEstadisticas(n) {
  const badge = document.getElementById('nav-badge-estadisticas');
  if (badge) badge.textContent = n;
}

// ── Gráfica de barras horzontal SVG ──────────────────────────────────────────
// Recibe: datos = [{label, valor, color}], maxValor (opcional)
// Devuelve HTML string con una gráfica SVG responsiva

function generarGraficaBarras(datos, titulo, colorBarra) {
  if (!datos.length) return '<div class="stats-grafica-vacia">Sin datos</div>';

  var ANCHO_TOTAL = 600;
  var PADDING_IZQ = 140;
  var PADDING_DER = 70;
  var ANCHO_BARRAS = ANCHO_TOTAL - PADDING_IZQ - PADDING_DER;

  var max = Math.max.apply(null, datos.map(function (d) { return d.valor; }).concat([1]));
  var altoFila = 36;
  var alto = datos.length * altoFila + 24;

  var barras = datos.map(function (d, i) {
    var y = i * altoFila + 10;
    var anchoBar = Math.max((d.valor / max) * ANCHO_BARRAS, d.valor > 0 ? 4 : 0);
    var nombre = escaparHtmlStats(d.label.length > 17 ? d.label.slice(0, 16) + '\u2026' : d.label);
    // Si la barra es larga (>60% del espacio), poner el valor dentro con texto blanco
    var barraLarga = anchoBar > ANCHO_BARRAS * 0.6;
    var xValor = barraLarga
      ? PADDING_IZQ + anchoBar - 6   // dentro de la barra, pegado al borde derecho
      : PADDING_IZQ + anchoBar + 6;  // fuera de la barra, a la derecha
    var anchorValor = barraLarga ? 'end' : 'start';
    var colorValor = barraLarga ? '#ffffff' : 'var(--text-muted, #64748b)';
    return '<g>'
      + '<text x="' + (PADDING_IZQ - 8) + '" y="' + (y + altoFila / 2 + 5) + '" text-anchor="end" class="stats-barra-label">' + nombre + '</text>'
      + '<rect x="' + PADDING_IZQ + '" y="' + (y + 4) + '" width="' + anchoBar + '" height="' + (altoFila - 12) + '" rx="4" fill="' + colorBarra + '" class="stats-barra-rect"/>'
      + '<text x="' + xValor + '" y="' + (y + altoFila / 2 + 5) + '" text-anchor="' + anchorValor + '" fill="' + colorValor + '" class="stats-barra-valor">' + d.valor + ' pts</text>'
      + '</g>';
  }).join('');

  return '<div class="stats-grafica-wrap">'
    + '<div class="stats-grafica-titulo">' + escaparHtmlStats(titulo) + '</div>'
    + '<svg viewBox="0 0 ' + ANCHO_TOTAL + ' ' + alto + '" xmlns="http://www.w3.org/2000/svg" class="stats-grafica-svg" preserveAspectRatio="xMidYMid meet">'
    + barras
    + '</svg>'
    + '</div>';
}

// ── Renderizar sección de estadísticas ────────────────────────────────────────

function renderizarEstadisticas(usuarios) {
  cacheRankingUsuarios = usuarios;

  // ── Tabla de ranking ──
  const tbody = document.getElementById('listaEstadisticas');
  const empty = document.getElementById('emptyEstadisticas');
  const tabla = document.getElementById('tablaEstadisticas');

  if (!tbody) return;

  if (!usuarios.length) {
    if (empty) empty.style.display = 'block';
    if (tabla) tabla.style.display = 'none';
    actualizarBadgeEstadisticas(0);
    renderizarGraficasEstadisticas([]);
    return;
  }

  if (empty) empty.style.display = 'none';
  if (tabla) tabla.style.display = '';
  actualizarBadgeEstadisticas(usuarios.length);

  tbody.innerHTML = '';
  usuarios.forEach((u, i) => {
    const idSafe = escaparHtmlStats(u.id || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="stats-posicion">#${i + 1}</td>
      <td>${escaparHtmlStats(u.name || '-')}</td>
      <td>${escaparHtmlStats(u.id || '-')}</td>
      <td class="stats-pts-col stats-pts-rec">${u.pointsByRecommendation || 0}</td>
      <td class="stats-pts-col stats-pts-frec">${u.pointsByFrecuentBuy || 0}</td>
      <td class="stats-pts-col stats-pts-high">${u.pointsByHighBuy || 0}</td>
      <td class="stats-pts-col stats-pts-total"><strong>${u.totalPoints || 0}</strong></td>
      <td>
        <button class="btn-edit" data-stats-id="${idSafe}"
          onclick="abrirModalEditarPuntos(this)">✎ Puntos</button>
      </td>`;
    tbody.appendChild(tr);
  });

  renderizarGraficasEstadisticas(usuarios);
}

function renderizarGraficasEstadisticas(usuarios) {
  const contenedor = document.getElementById('statsGraficas');
  if (!contenedor) return;

  if (!usuarios.length) {
    contenedor.innerHTML = '<p class="stats-grafica-vacia">Sin datos para graficar.</p>';
    return;
  }

  // Top 10 para que las gráficas sean legibles
  const top = usuarios.slice(0, 10);

  const grafTotal = generarGraficaBarras(
    top.map(u => ({ label: u.name || u.id, valor: u.totalPoints || 0 })),
    '🏆 Puntos Totales', '#2563eb'
  );
  const grafRec = generarGraficaBarras(
    [...top].sort((a, b) => (b.pointsByRecommendation || 0) - (a.pointsByRecommendation || 0))
      .map(u => ({ label: u.name || u.id, valor: u.pointsByRecommendation || 0 })),
    '👥 Por Recomendación', '#059669'
  );
  const grafFrec = generarGraficaBarras(
    [...top].sort((a, b) => (b.pointsByFrecuentBuy || 0) - (a.pointsByFrecuentBuy || 0))
      .map(u => ({ label: u.name || u.id, valor: u.pointsByFrecuentBuy || 0 })),
    '🔁 Por Compra Frecuente', '#d97706'
  );
  const grafHigh = generarGraficaBarras(
    [...top].sort((a, b) => (b.pointsByHighBuy || 0) - (a.pointsByHighBuy || 0))
      .map(u => ({ label: u.name || u.id, valor: u.pointsByHighBuy || 0 })),
    '💎 Por Compra Alta', '#7c3aed'
  );

  contenedor.innerHTML = `
    <div class="stats-graficas-grid">
      ${grafTotal}
      ${grafRec}
      ${grafFrec}
      ${grafHigh}
    </div>`;
}

// ── Buscador / filtro ─────────────────────────────────────────────────────────

function filtrarEstadisticas() {
  const texto = String(document.getElementById('buscadorEstadisticas')?.value || '').trim().toUpperCase();
  if (!texto) {
    renderizarEstadisticas(cacheRankingUsuarios);
    return;
  }
  const filtrados = cacheRankingUsuarios.filter(u =>
    String(u.name || '').toUpperCase().includes(texto) ||
    String(u.id || '').toUpperCase().includes(texto)
  );
  renderizarEstadisticas(filtrados);
}

function limpiarBuscadorEstadisticas() {
  const buscador = document.getElementById('buscadorEstadisticas');
  if (!buscador) return;
  buscador.value = '';
  renderizarEstadisticas(cacheRankingUsuarios);
  buscador.focus();
}

// ── Carga principal ───────────────────────────────────────────────────────────

async function mostrarEstadisticas() {
  const data = await getRankingUsuariosRegistrados();
  const usuarios = Array.isArray(data) ? data : [];
  cacheRankingUsuarios = usuarios;
  renderizarEstadisticas(usuarios);
}

// ── Modal editar puntos ────────────────────────────────────────────────────────

function abrirModalEditarPuntos(boton) {
  const id = String(
    boton?.dataset?.statsId ||
    boton?.closest?.('[data-stats-id]')?.dataset?.statsId || ''
  ).trim();
  if (!id) return;

  const usuario = cacheRankingUsuarios.find(u => String(u.id) === id);
  if (!usuario) return;

  estadisticasUsuarioIdEditar = id;

  document.getElementById('editPuntosNombre').textContent = usuario.name || id;
  document.getElementById('editPuntosRecomendacion').value = usuario.pointsByRecommendation || 0;
  document.getElementById('editPuntosFrecuente').value = usuario.pointsByFrecuentBuy || 0;
  document.getElementById('editPuntosAlta').value = usuario.pointsByHighBuy || 0;

  recalcularTotalPuntosModal();
  document.getElementById('modalEditarPuntos')?.classList.add('active');
}

function recalcularTotalPuntosModal() {
  const rec = Number(document.getElementById('editPuntosRecomendacion')?.value) || 0;
  const frec = Number(document.getElementById('editPuntosFrecuente')?.value) || 0;
  const high = Number(document.getElementById('editPuntosAlta')?.value) || 0;
  const el = document.getElementById('editPuntosTotal');
  if (el) el.textContent = rec + frec + high;
}

function cerrarModalEditarPuntos() {
  document.getElementById('modalEditarPuntos')?.classList.remove('active');
  estadisticasUsuarioIdEditar = null;
}

async function guardarEdicionPuntos() {
  if (!estadisticasUsuarioIdEditar) return;

  const payload = {
    pointsByRecommendation: Number(document.getElementById('editPuntosRecomendacion')?.value) || 0,
    pointsByFrecuentBuy: Number(document.getElementById('editPuntosFrecuente')?.value) || 0,
    pointsByHighBuy: Number(document.getElementById('editPuntosAlta')?.value) || 0
  };

  await editarPuntosUsuario(estadisticasUsuarioIdEditar, payload);
  cerrarModalEditarPuntos();
  mostrarEstadisticas();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  ['editPuntosRecomendacion', 'editPuntosFrecuente', 'editPuntosAlta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recalcularTotalPuntosModal);
  });
});
