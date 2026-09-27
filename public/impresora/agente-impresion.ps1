# Agente de impresion de tickets (Soldi)
#
# Recibe desde el sistema (navegador) los bytes ESC/POS de un ticket y los
# manda tal cual (modo RAW) a una impresora instalada en Windows. Funciona
# con cualquier impresora termica instalada: USB, red o Bluetooth.
#
# - Escucha SOLO en 127.0.0.1 (no es accesible desde otra computadora).
# - Solo acepta pedidos de los origenes permitidos (el sistema que lo
#   descargo).
# - Requiere Windows PowerShell 5.1 (incluido en Windows 10/11).
#
# Endpoints:
#   GET  /estado    -> { ok, version, impresoras: [...], predeterminada }
#   POST /imprimir  body JSON { impresora, datos (base64) } -> { ok }

param(
  [int]$Puerto = 9123,
  # Diagnostico: en vez de imprimir, guarda cada trabajo en este archivo.
  [string]$ArchivoPrueba = ''
)

$ErrorActionPreference = 'Stop'
$Version = '1.0'

# El instalador reemplaza esta linea con el origen del sistema.
$OrigenesPermitidos = @('__ORIGENES__', 'http://localhost:5173', 'http://127.0.0.1:5173')

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class SoldiRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFO
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool OpenPrinter(string printerName, out IntPtr hPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern int StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool WritePrinter(IntPtr hPrinter, byte[] bytes, int count, out int written);

    public static void Imprimir(string impresora, byte[] datos)
    {
        IntPtr h;
        if (!OpenPrinter(impresora, out h, IntPtr.Zero))
            throw new Exception("No se pudo abrir la impresora '" + impresora + "' (error " + Marshal.GetLastWin32Error() + ").");
        try
        {
            DOCINFO di = new DOCINFO();
            di.pDocName = "Ticket";
            di.pDataType = "RAW";
            if (StartDocPrinter(h, 1, di) == 0)
                throw new Exception("La impresora rechazo el trabajo (error " + Marshal.GetLastWin32Error() + ").");
            try
            {
                StartPagePrinter(h);
                int escritos;
                if (!WritePrinter(h, datos, datos.Length, out escritos) || escritos != datos.Length)
                    throw new Exception("No se pudieron enviar los datos a la impresora (error " + Marshal.GetLastWin32Error() + ").");
                EndPagePrinter(h);
            }
            finally { EndDocPrinter(h); }
        }
        finally { ClosePrinter(h); }
    }
}
'@

function Get-Impresoras {
  if ($ArchivoPrueba) { return @{ nombres = @('Archivo de prueba'); predeterminada = 'Archivo de prueba' } }
  try {
    $lista = @(Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default)
    $pred = ($lista | Where-Object { $_.Default } | Select-Object -First 1).Name
    return @{ nombres = @($lista | ForEach-Object { $_.Name }); predeterminada = $pred }
  } catch {
    return @{ nombres = @(); predeterminada = $null }
  }
}

function Send-Respuesta($stream, [int]$codigo, $objeto, [string]$origen, [bool]$preflight) {
  $textos = @{ 200 = 'OK'; 204 = 'No Content'; 400 = 'Bad Request'; 403 = 'Forbidden'; 404 = 'Not Found'; 500 = 'Internal Server Error' }
  $cuerpo = [byte[]]@()
  if ($null -ne $objeto) { $cuerpo = [System.Text.Encoding]::UTF8.GetBytes(($objeto | ConvertTo-Json -Compress -Depth 5)) }
  $h = "HTTP/1.1 $codigo $($textos[$codigo])`r`n"
  $h += "Content-Type: application/json; charset=utf-8`r`n"
  $h += "Content-Length: $($cuerpo.Length)`r`n"
  $h += "Connection: close`r`nVary: Origin`r`n"
  if ($origen) {
    $h += "Access-Control-Allow-Origin: $origen`r`n"
    $h += "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n"
    $h += "Access-Control-Allow-Headers: Content-Type`r`n"
    if ($preflight) { $h += "Access-Control-Allow-Private-Network: true`r`nAccess-Control-Max-Age: 600`r`n" }
  }
  $h += "`r`n"
  $cab = [System.Text.Encoding]::ASCII.GetBytes($h)
  $stream.Write($cab, 0, $cab.Length)
  if ($cuerpo.Length) { $stream.Write($cuerpo, 0, $cuerpo.Length) }
  $stream.Flush()
}

function Read-Pedido($stream) {
  # Lee cabeceras (hasta \r\n\r\n) y cuerpo segun Content-Length.
  $buffer = New-Object System.IO.MemoryStream
  $tmp = New-Object byte[] 8192
  $finCab = -1
  while ($finCab -lt 0) {
    $n = $stream.Read($tmp, 0, $tmp.Length)
    if ($n -le 0) { return $null }
    $buffer.Write($tmp, 0, $n)
    $todo = $buffer.ToArray()
    for ($i = 3; $i -lt $todo.Length; $i++) {
      if ($todo[$i - 3] -eq 13 -and $todo[$i - 2] -eq 10 -and $todo[$i - 1] -eq 13 -and $todo[$i] -eq 10) { $finCab = $i + 1; break }
    }
    if ($buffer.Length -gt 65536 -and $finCab -lt 0) { return $null }
  }
  $todo = $buffer.ToArray()
  $cabeceras = [System.Text.Encoding]::ASCII.GetString($todo, 0, $finCab).Split("`n")
  $primera = $cabeceras[0].Trim().Split(' ')
  $pedido = @{ metodo = $primera[0]; ruta = $primera[1]; headers = @{} }
  foreach ($linea in $cabeceras[1..($cabeceras.Length - 1)]) {
    $p = $linea.IndexOf(':')
    if ($p -gt 0) { $pedido.headers[$linea.Substring(0, $p).Trim().ToLower()] = $linea.Substring($p + 1).Trim() }
  }
  $largo = 0
  if ($pedido.headers.ContainsKey('content-length')) { $largo = [int]$pedido.headers['content-length'] }
  if ($largo -gt 20971520) { throw 'Pedido demasiado grande.' }
  $cuerpo = New-Object System.IO.MemoryStream
  $cuerpo.Write($todo, $finCab, $todo.Length - $finCab)
  while ($cuerpo.Length -lt $largo) {
    $n = $stream.Read($tmp, 0, $tmp.Length)
    if ($n -le 0) { break }
    $cuerpo.Write($tmp, 0, $n)
  }
  $pedido.cuerpo = [System.Text.Encoding]::UTF8.GetString($cuerpo.ToArray(), 0, [Math]::Min($largo, [int]$cuerpo.Length))
  return $pedido
}

function Invoke-Pedido($cliente) {
  $cliente.ReceiveTimeout = 15000
  $stream = $cliente.GetStream()
  $pedido = Read-Pedido $stream
  if ($null -eq $pedido) { return }

  $origen = $pedido.headers['origin']
  $origenOk = (-not $origen) -or ($OrigenesPermitidos -contains $origen)
  $origenResp = $null
  if ($origen -and $origenOk) { $origenResp = $origen }
  if (-not $origenOk) {
    Send-Respuesta $stream 403 @{ ok = $false; error = "Origen no permitido: $origen" } $null $false
    return
  }

  $ruta = ($pedido.ruta -split '\?')[0]
  if ($pedido.metodo -eq 'OPTIONS') {
    Send-Respuesta $stream 204 $null $origenResp $true
  } elseif ($pedido.metodo -eq 'GET' -and $ruta -eq '/estado') {
    $imp = Get-Impresoras
    Send-Respuesta $stream 200 @{ ok = $true; version = $Version; impresoras = @($imp.nombres); predeterminada = $imp.predeterminada } $origenResp $false
  } elseif ($pedido.metodo -eq 'POST' -and $ruta -eq '/imprimir') {
    try {
      $datos = $pedido.cuerpo | ConvertFrom-Json
      if (-not $datos.datos) { throw 'Faltan los datos del ticket.' }
      $bytes = [Convert]::FromBase64String($datos.datos)
      if ($ArchivoPrueba) {
        [System.IO.File]::WriteAllBytes($ArchivoPrueba, $bytes)
      } else {
        $impresora = $datos.impresora
        if (-not $impresora) { $impresora = (Get-Impresoras).predeterminada }
        if (-not $impresora) { throw 'No hay ninguna impresora elegida ni predeterminada.' }
        [SoldiRawPrinter]::Imprimir($impresora, $bytes)
      }
      Send-Respuesta $stream 200 @{ ok = $true; bytes = $bytes.Length } $origenResp $false
    } catch {
      Send-Respuesta $stream 500 @{ ok = $false; error = $_.Exception.Message } $origenResp $false
    }
  } else {
    Send-Respuesta $stream 404 @{ ok = $false; error = 'Ruta inexistente' } $origenResp $false
  }
}

$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $Puerto
try {
  $listener.Start()
} catch {
  Write-Host "El agente ya esta funcionando (puerto $Puerto ocupado)."
  exit 0
}
Write-Host "Agente de impresion escuchando en http://127.0.0.1:$Puerto"
while ($true) {
  $cliente = $listener.AcceptTcpClient()
  try { Invoke-Pedido $cliente } catch { } finally { $cliente.Close() }
}
