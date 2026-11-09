param(
    [string]$ClienteId = '00000000-0000-0000-0000-000000000009',
    [decimal]$Monto = 1000.00,
    [int]$TiempoLimiteSegundos = 120,
    [string]$CampanaId = '',
    [ValidateSet('completada', 'rechazada', 'compensada', 'fallida')]
    [string]$EstadoEsperado = 'completada'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Nueva-Clave([string]$prefijo, [string]$sufijo) {
    return "$prefijo-$sufijo"
}

function Nuevas-Cabeceras([string]$token, [string]$clave) {
    return @{
        Authorization     = "Bearer $token"
        'Content-Type'    = 'application/json'
        'Idempotency-Key' = $clave
    }
}

function Invocar-AdOrbit {
    param(
        [ValidateSet('Get', 'Post', 'Put')][string]$Metodo,
        [string]$Uri,
        [hashtable]$Cabeceras,
        [object]$Cuerpo
    )

    try {
        $parametros = @{
            Method  = $Metodo
            Uri     = $Uri
            Headers = $Cabeceras
        }
        if ($null -ne $Cuerpo) {
            $parametros.Body = $Cuerpo | ConvertTo-Json -Depth 10
        }
        return Invoke-RestMethod @parametros
    }
    catch {
        $errorActual = $_
        $detalle = $null
        if ($null -ne $errorActual.ErrorDetails) {
            $detalle = $errorActual.ErrorDetails.Message
        }
        if ([string]::IsNullOrWhiteSpace($detalle)) {
            $detalle = $errorActual.Exception.Message
        }
        throw "Fallo $Metodo $Uri`: $detalle"
    }
}

$sufijo = [guid]::NewGuid().ToString('N').Substring(0, 8)
Write-Host "Prueba SAGA: $sufijo" -ForegroundColor Cyan

try {
    $tokenRespuesta = Invoke-RestMethod -Uri (
        'http://localhost:8180/emitir' +
        '?roles=ejecutivo%2Cgerente%2Ccreativo&email=admin%40adorbit.com'
    ) -TimeoutSec 3
    $token = $tokenRespuesta.access_token
} catch {
    $cuerpoToken = @{
        grant_type = 'password'
        client_id  = 'adorbit-frontend'
        username   = 'admin@adorbit.com'
        password   = 'secreto-local'
        scope      = 'openid'
    }
    $tokenRespuesta = Invoke-RestMethod -Uri 'http://localhost:8180/realms/adorbit/protocol/openid-connect/token' `
        -Method Post `
        -Body $cuerpoToken
    $token = $tokenRespuesta.access_token
}
if (-not $token) { throw 'El emisor de prueba no devolvio access_token.' }

if ([string]::IsNullOrWhiteSpace($CampanaId)) {
    $campana = Invocar-AdOrbit -Metodo Post `
        -Uri 'http://localhost:8081/api/v1/campanas' `
        -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'crear-campana' $sufijo)) `
        -Cuerpo @{
            cliente_id  = $ClienteId
            nombre      = "PRUEBA SAGA $sufijo"
            descripcion = 'Camino feliz de integracion entre microservicios'
            fecha_inicio = '2026-11-10'
            fecha_fin    = '2026-12-10'
        }
    $CampanaId = $campana.id
    Write-Host "1. Campana creada: $CampanaId"

    $null = Invocar-AdOrbit -Metodo Post `
        -Uri "http://localhost:8081/api/v1/campanas/$CampanaId/presupuesto" `
        -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'presupuesto' $sufijo)) `
        -Cuerpo @{ monto_total = $Monto; moneda = 'BOB' }
    Write-Host "2. Presupuesto asignado: $Monto BOB"
}
else {
    Write-Host "1-2. Reutilizando campana y presupuesto: $CampanaId"
}

$brief = Invocar-AdOrbit -Metodo Post `
    -Uri 'http://localhost:8083/api/v1/briefs' `
    -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'crear-brief' $sufijo)) `
    -Cuerpo @{
        campana_id = $CampanaId
        titulo      = "Brief SAGA $sufijo"
        descripcion = 'Brief para probar el bloqueo de piezas'
    }
Write-Host "3. Brief creado: $($brief.id)"

$pieza = Invocar-AdOrbit -Metodo Post `
    -Uri "http://localhost:8083/api/v1/briefs/$($brief.id)/piezas" `
    -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'crear-pieza' $sufijo)) `
    -Cuerpo @{ nombre = "Pieza SAGA $sufijo"; tipo = 'imagen' }
Write-Host "4. Pieza creada: $($pieza.id)"

$piezaAprobada = Invocar-AdOrbit -Metodo Post `
    -Uri "http://localhost:8083/api/v1/piezas/$($pieza.id)/aprobar" `
    -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'aprobar-pieza' $sufijo)) `
    -Cuerpo @{ decision = 'aprobar' }
Write-Host "5. Pieza aprobada: $($piezaAprobada.estado)"

$saga = Invocar-AdOrbit -Metodo Post `
    -Uri "http://localhost:8081/api/v1/campanas/$CampanaId/contratar" `
    -Cabeceras (Nuevas-Cabeceras $token (Nueva-Clave 'contratar-campana' $sufijo)) `
    -Cuerpo $null
$sagaId = $saga.id
Write-Host "6. SAGA iniciada: $sagaId" -ForegroundColor Yellow

$cabecerasLectura = @{ Authorization = "Bearer $token" }
$fin = (Get-Date).AddSeconds($TiempoLimiteSegundos)
$terminales = @('completada', 'compensada', 'fallida', 'rechazada')
do {
    Start-Sleep -Seconds 2
    $estado = Invocar-AdOrbit -Metodo Get `
        -Uri "http://localhost:8081/api/v1/sagas/$sagaId" `
        -Cabeceras $cabecerasLectura `
        -Cuerpo $null
    Write-Host ("   {0:HH:mm:ss} estado={1}, paso={2}" -f (Get-Date), $estado.estado, $estado.paso_actual)
} while ($terminales -notcontains $estado.estado -and (Get-Date) -lt $fin)

Write-Host ''
$estado | ConvertTo-Json -Depth 10

if ($estado.estado -eq $EstadoEsperado) {
    Write-Host "PRUEBA CORRECTA: la SAGA termino en el estado esperado '$EstadoEsperado'." -ForegroundColor Green
    exit 0
}

if ($terminales -contains $estado.estado) {
    Write-Host "La SAGA termino en '$($estado.estado)', pero se esperaba '$EstadoEsperado'. Revisa motivo_fallo y los logs." -ForegroundColor Red
    exit 1
}

Write-Host 'La SAGA no alcanzo un estado terminal dentro del tiempo limite.' -ForegroundColor Red
exit 2
