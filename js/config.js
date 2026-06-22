
const API_BACKEND_URL = "http://192.168.80.11:3000/api/";
const FORMULARIO_AUTORIZACION_DATOS_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfmTcLUYap9F79nBopRGssdYx6pMTDFILFJKedTbbfK6HqPFA/viewform?usp=sharing&ouid=115359686355008826821";
localStorage.clear();

// ═══════════ CREDENCIALES ═══════════
const USUARIOS = [
  { usuario: "admin", clave: "autogestion2024" },
  { usuario: "taller", clave: "taller1234" },
  { usuario: "juan", clave: "1234" }
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
