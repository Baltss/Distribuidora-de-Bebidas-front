// src/utils/impresoraTicket.js
// Impresión de tickets ESC/POS en la impresora térmica de 80 mm.
//
// El backend genera los bytes ESC/POS; acá sólo se entregan a la
// impresora por uno de estos métodos (configurado una vez por navegador):
// - 'agente': agente local de Windows (public/impresora/agente-impresion.ps1)
//   que manda los bytes en modo RAW a cualquier impresora instalada en
//   Windows (USB, red o Bluetooth). Recomendado en Windows.
// - 'usb':    WebUSB (Chrome/Edge). Sin instalar nada, pero en Windows
//   sólo funciona si la impresora no está tomada por su driver.
// - 'serial': Web Serial (Chrome/Edge). Para impresoras por puerto COM o
//   Bluetooth emparejado como puerto serie.

const KEY = 'impresora-ticket:v1';

export const AGENTE_URL = 'http://127.0.0.1:9123';

const DEFAULTS = {
  metodo: null, // 'agente' | 'usb' | 'serial'
  impresora: '', // nombre de la impresora en Windows (agente)
  usb: null, // { vendorId, productId, nombre }
  serial: null, // { usbVendorId, usbProductId }
  baudRate: 9600,
  columnas: 48,
  sinAcentos: false
};

export function leerConfigImpresora() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function guardarConfigImpresora(config) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, ...config }));
  } catch {
    // sin storage: la configuración dura lo que dure la pestaña
  }
}

export const impresoraConfigurada = (config = leerConfigImpresora()) =>
  (config.metodo === 'agente') ||
  (config.metodo === 'usb' && !!config.usb) ||
  (config.metodo === 'serial' && !!config.serial);

export const soportaUSB = () => typeof navigator !== 'undefined' && 'usb' in navigator;
export const soportaSerial = () => typeof navigator !== 'undefined' && 'serial' in navigator;

const errorAmigable = (mensaje) => Object.assign(new Error(mensaje), { amigable: true });

// ---------- Agente local (Windows) ----------

export async function estadoAgente({ timeoutMs = 2500 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${AGENTE_URL}/estado`, { signal: ctrl.signal });
    const data = await r.json();
    return data?.ok ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function aBase64(bytes) {
  let bin = '';
  const paso = 0x8000;
  for (let i = 0; i < bytes.length; i += paso) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
  }
  return btoa(bin);
}

async function imprimirConAgente(bytes, impresora) {
  let r;
  try {
    r = await fetch(`${AGENTE_URL}/imprimir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impresora: impresora || null, datos: aBase64(bytes) })
    });
  } catch {
    throw errorAmigable(
      'No se encontró el agente de impresión en esta PC. Verificá que esté instalado y funcionando (Configurar impresora).'
    );
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw errorAmigable(data.error || 'La impresora no aceptó el ticket.');
}

// ---------- WebUSB ----------

export async function elegirImpresoraUSB() {
  if (!soportaUSB()) throw errorAmigable('Este navegador no permite USB directo. Usá Chrome o Edge.');
  const d = await navigator.usb.requestDevice({ filters: [] });
  return { vendorId: d.vendorId, productId: d.productId, nombre: d.productName || 'Impresora USB' };
}

function endpointSalida(device) {
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
      if (ep) return { interfaz: iface.interfaceNumber, endpoint: ep.endpointNumber };
    }
  }
  return null;
}

async function imprimirConUSB(bytes, usb) {
  if (!soportaUSB()) throw errorAmigable('Este navegador no permite USB directo. Usá Chrome o Edge.');
  const devices = await navigator.usb.getDevices();
  const device = devices.find((d) => d.vendorId === usb?.vendorId && d.productId === usb?.productId);
  if (!device) throw errorAmigable('No se encuentra la impresora USB elegida. Conectala y volvé a elegirla en Configurar impresora.');
  try {
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    const salida = endpointSalida(device);
    if (!salida) throw errorAmigable('La impresora USB no tiene una salida de datos compatible.');
    await device.claimInterface(salida.interfaz);
    for (let i = 0; i < bytes.length; i += 4096) {
      await device.transferOut(salida.endpoint, bytes.subarray(i, i + 4096));
    }
    await device.releaseInterface(salida.interfaz);
  } catch (err) {
    if (err.amigable) throw err;
    throw errorAmigable(
      'No se pudo usar la impresora por USB directo (en Windows suele estar tomada por su driver). Usá el agente de impresión.'
    );
  } finally {
    try {
      await device.close();
    } catch {
      // ya cerrada
    }
  }
}

// ---------- Web Serial ----------

export async function elegirPuertoSerie() {
  if (!soportaSerial()) throw errorAmigable('Este navegador no permite puertos serie. Usá Chrome o Edge.');
  const port = await navigator.serial.requestPort();
  const info = port.getInfo();
  return { usbVendorId: info.usbVendorId ?? null, usbProductId: info.usbProductId ?? null };
}

async function imprimirConSerial(bytes, serial, baudRate) {
  if (!soportaSerial()) throw errorAmigable('Este navegador no permite puertos serie. Usá Chrome o Edge.');
  const ports = await navigator.serial.getPorts();
  const port =
    ports.find((p) => {
      const i = p.getInfo();
      return (i.usbVendorId ?? null) === serial?.usbVendorId && (i.usbProductId ?? null) === serial?.usbProductId;
    }) || (ports.length === 1 ? ports[0] : null);
  if (!port) throw errorAmigable('No se encuentra el puerto de la impresora. Volvé a elegirlo en Configurar impresora.');
  try {
    await port.open({ baudRate: Number(baudRate) || 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
  } catch (err) {
    throw errorAmigable(`No se pudo imprimir por el puerto serie: ${err.message}`);
  } finally {
    try {
      await port.close();
    } catch {
      // ya cerrado
    }
  }
}

// ---------- API común ----------

/** Manda bytes ESC/POS a la impresora configurada. */
export async function imprimirBytes(bytes, config = leerConfigImpresora()) {
  const datos = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (config.metodo === 'agente') return imprimirConAgente(datos, config.impresora);
  if (config.metodo === 'usb') return imprimirConUSB(datos, config.usb);
  if (config.metodo === 'serial') return imprimirConSerial(datos, config.serial, config.baudRate);
  throw errorAmigable('Todavía no configuraste la impresora de tickets.');
}

// Página de prueba (ESC/POS mínimo, CP850 para los acentos).
const CP850 = { á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, '¡': 0xad, '¿': 0xa8 };

export function ticketDePrueba({ columnas = 48, sinAcentos = false } = {}) {
  const out = [0x1b, 0x40];
  if (!sinAcentos) out.push(0x1b, 0x74, 2);
  const linea = (s) => {
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      if (c < 0x80) out.push(c);
      else if (!sinAcentos && CP850[ch]) out.push(CP850[ch]);
      else out.push(ch.normalize('NFD').charCodeAt(0) < 0x80 ? ch.normalize('NFD').charCodeAt(0) : 0x3f);
    }
    out.push(0x0a);
  };
  out.push(0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0x11);
  linea('PRUEBA');
  out.push(0x1d, 0x21, 0x00, 0x1b, 0x45, 0);
  linea('Impresora de tickets configurada');
  linea('Acentos: áéíóú ñÑ ¿¡');
  out.push(0x1b, 0x61, 0);
  linea('-'.repeat(columnas));
  linea(`${'Ancho de'.padEnd(columnas - 11)}${String(columnas).padStart(3)} columnas`.slice(0, columnas));
  linea('1234567890'.repeat(Math.ceil(columnas / 10)).slice(0, columnas));
  out.push(0x1b, 0x64, 4, 0x1d, 0x56, 0x42, 0x00);
  return new Uint8Array(out);
}

// ---------- Instalador del agente (un solo archivo .cmd) ----------

/**
 * Arma el instalador .cmd con el agente embebido y el origen de este
 * sistema ya permitido, y lo descarga. Un único archivo: al ejecutarlo
 * copia el agente a %LOCALAPPDATA%, lo deja arrancando con Windows y lo
 * inicia.
 */
export async function descargarInstaladorAgente() {
  const r = await fetch('/impresora/agente-impresion.ps1', { cache: 'no-store' });
  if (!r.ok) throw errorAmigable('No se pudo descargar el agente de impresión.');
  const ps1 = (await r.text()).replace('__ORIGENES__', window.location.origin);

  const cmd = [
    '@echo off',
    'setlocal',
    'title Instalando agente de impresion de tickets',
    'set "DEST=%LOCALAPPDATA%\\SoldiImpresion"',
    'if not exist "%DEST%" mkdir "%DEST%"',
    // El marcador se arma por partes para que esta misma línea no lo contenga.
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$t = Get-Content -LiteralPath \'%~f0\' -Raw; $m = \'#__AGE\' + \'NTE__\'; $i = $t.IndexOf($m); Set-Content -LiteralPath \'%DEST%\\agente-impresion.ps1\' -Value $t.Substring($i + $m.Length).TrimStart() -Encoding UTF8"',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath(\'Startup\') + \'\\Agente de impresion de tickets.lnk\'); $s.TargetPath = \'powershell.exe\'; $s.Arguments = \'-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"%DEST%\\agente-impresion.ps1\\"\'; $s.WindowStyle = 7; $s.Save()"',
    'start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%DEST%\\agente-impresion.ps1"',
    'echo.',
    'echo   Listo: el agente de impresion quedo instalado y funcionando.',
    'echo   Se inicia solo cada vez que se prende la PC.',
    'echo   Ya podes cerrar esta ventana y volver al sistema.',
    'echo.',
    'pause',
    'exit /b',
    '#__AGENTE__'
  ].join('\r\n');

  const contenido = `${cmd}\r\n${ps1.replace(/\r?\n/g, '\r\n')}`;
  const blob = new Blob([contenido], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'instalar-agente-impresion.cmd';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
