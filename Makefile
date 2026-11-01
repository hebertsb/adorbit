levantar:  ; docker compose -f infraestructura/docker-compose.yml up -d
bajar:     ; docker compose -f infraestructura/docker-compose.yml down
registros: ; docker compose -f infraestructura/docker-compose.yml logs -f $(S)
probar:    ; ./herramientas/probar.sh $(S)      # ejecuta las pruebas del servicio S
revisar:   ; ./herramientas/revisar.sh $(S)     # formato y analisis estatico
