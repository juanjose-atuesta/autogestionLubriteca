// ═══════════════════════════════════════════════════════════════
// TEMA — modo claro / oscuro
// Único archivo del sistema de temas.
//   · guarda la preferencia en localStorage
//   · si no hay preferencia guardada, sigue al sistema (prefers-color-scheme)
//   · aplica el tema al <html> antes de pintar para evitar parpadeos
// ═══════════════════════════════════════════════════════════════

const THEME_KEY = 'ag_theme';
const TEMA_OSCURO = 'dark';
const TEMA_CLARO = 'light';

function temaGuardado() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function guardarTema(tema) {
  try { localStorage.setItem(THEME_KEY, tema); } catch (e) {}
}

function temaDelSistema() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return TEMA_OSCURO;
  return TEMA_CLARO;
}

function temaActual() {
  return document.documentElement.getAttribute('data-theme') === TEMA_OSCURO ? TEMA_OSCURO : TEMA_CLARO;
}

function aplicarTema(tema) {
  if (tema === TEMA_OSCURO) document.documentElement.setAttribute('data-theme', TEMA_OSCURO);
  else document.documentElement.removeAttribute('data-theme');
  actualizarBotonTema();
}

function actualizarBotonTema() {
  const boton = document.getElementById('btnTema');
  if (!boton) return;
  const oscuro = temaActual() === TEMA_OSCURO;
  boton.textContent = oscuro ? '☀️' : '🌙';
  boton.title = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  boton.setAttribute('aria-label', boton.title);
  boton.setAttribute('aria-pressed', String(oscuro));
}

function alternarTema() {
  const nuevo = temaActual() === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
  aplicarTema(nuevo);
  guardarTema(nuevo);
}

function iniciarTema() {
  const guardado = temaGuardado();
  const tema = (guardado === TEMA_OSCURO || guardado === TEMA_CLARO) ? guardado : temaDelSistema();
  document.documentElement.setAttribute('data-theme', tema);
  if (tema === TEMA_CLARO) document.documentElement.removeAttribute('data-theme');
}

iniciarTema();
document.addEventListener('DOMContentLoaded', actualizarBotonTema);