// ═══════════════════════════════════════════════
// AUTOGESTIÓN — Servidor local
// Ejecuta: node servidor.js
// Accede desde cualquier PC: http://192.168.0.50
// ═══════════════════════════════════════════════

const http = require('http');
const fs   = require('fs');
const path = require('path');

const IP   = '192.168.1.9'; // ← tu IP
const PORT = 5500;          // ← tu puerto

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.ico':  'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Si piden la raíz, servir index.html
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = TIPOS[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Archivo no encontrado');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, IP, () => {
    console.log('');
    console.log('  ⚙  AutoGestión corriendo en:');
    console.log(`     → http://${IP}:${PORT}  (desde cualquier PC de la red)`);
    console.log(`     → http://localhost:${PORT}  (desde esta PC)`);
    console.log('');
    console.log('  Presiona Ctrl+C para detener el servidor.');
    console.log('');
});