# Matriz de Validacion Inicial

## Baseline visual aprobado

- Fuente principal: `comercioebogota_3/comercioebogota`.
- Tokens visuales detectados: paleta oro/negro, tipografia DM Sans + Cormorant + DM Mono.
- Componentes base: navbar, cards, formularios, toasts, modales, tablas admin.

## Matriz funcional (manuales -> estado actual)

| Modulo | Manual | Estado UI actual | Estado logica actual | Estado backend |
|---|---|---|---|---|
| Registro | Registro Plataforma | Implementado | Simulado en localStorage | Implementado API |
| Acceso panel | Acceso Panel Cliente | Implementado | Simulado login local | Implementado API |
| Mi cuenta | MI Cuenta | Implementado | Parcial/simulado | Implementado API |
| Codigo promocional | Active su codigo promocion | Implementado | Simulado | Implementado API |
| Suscripcion | Actualice su Suscripcion | Implementado | Simulado | Implementado API |
| Metodos de pago | Metodos de Pago | Implementado | Simulado | Implementado API |
| Mi negocio | Configurar su negocio | Implementado | Simulado | Implementado API |
| Promociones | Configure y Visualice promociones | Implementado | Parcial | Implementado API |
| Recuperacion | Recupere Usuario-contrasena-cuenta | Implementado | Simulado | Implementado API |
| Quienes somos | Quienes Somos | Implementado | N/A | N/A |

## Brechas cerradas en este corte

- Persistencia real en PostgreSQL.
- Seguridad base con JWT y roles.
- Outbox local para emails de prueba.
- Endpoints admin para aprobacion/rechazo de recaudos.

## Pendientes para siguiente iteracion

- Integracion completa de todas las vistas frontend con API real.
- Refinar validaciones de medios de pago reales.
- Suite e2e UI automatizada.
