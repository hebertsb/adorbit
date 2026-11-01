## Que cambia

<!-- Resumen breve del cambio. Servicio o app afectada. -->

## Checklist (ver CLAUDE.md / AGENTS.md)

- [ ] Trabaja dentro de un solo servicio (o actualiza un contrato y avisa a los demas)
- [ ] Prueba del caso feliz
- [ ] Prueba de idempotencia (repetir la peticion no duplica)
- [ ] Si cambio BD: script en `base_de_datos/` actualizado en este mismo PR
- [ ] Si cambio contrato (evento/endpoint): `documentacion/03-contratos.md` actualizado
- [ ] Si cambio alcance, BD, contrato o reparto: registrado en `documentacion/05-decisiones-y-pendientes.md`
- [ ] Interfaz (si aplica): responsive probada de 360px a 1920px
- [ ] Sin secretos, `.env`, datasets ni checkpoints de modelos en el commit

## Como probar
