# herramientas/probar.ps1
# Ejecuta las pruebas del servicio indicado en PowerShell

param (
    [string]$Servicio = "ms-campanas"
)

switch ($Servicio) {
    "ms-campanas" {
        Write-Host "=== [ms-campanas] Ejecutando pruebas unitarias y de integracion Maven ===" -ForegroundColor Cyan
        mvn -f servicios/ms-campanas/pom.xml test
    }
    "pasarela" {
        Write-Host "=== [pasarela] Validando esquema GraphQL federado ===" -ForegroundColor Cyan
        node plataforma/pasarela/tests/esquema.test.js
    }
    default {
        Write-Host "Servicio: $Servicio. Ejecutando campanas y pasarela..." -ForegroundColor Yellow
        mvn -f servicios/ms-campanas/pom.xml test
        node plataforma/pasarela/tests/esquema.test.js
    }
}
