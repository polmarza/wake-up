# Inicialización del proyecto Wake Up Heroes

**Fecha:** 2026-08-13 23:30
**Tipo:** Configuración

## Qué se hizo

Se convirtió el repositorio de plantilla en el repositorio del proyecto **Wake Up Heroes**: la
herramienta interna de Learning Heroes para reactivar alumnos que dejaron un curso a medias.

**Análisis del dataset del hackathon.** Antes de escribir nada se analizó el dataset sintético de
`LH-hackathon/` (300 alumnos, 8 plantillas, 317 envíos históricos). De ahí salieron las cifras que
sostienen toda la documentación: 183 alumnos inactivos, 77 completados sin siguiente paso ofrecido,
~100 candidatos elegibles hoy, 13,2% de tasa de reactivación histórica y ~100.000 € de facturación
representada. El dataset no es una lista de contactos: trae la política de supresión escrita en una
vista SQL, un grupo *holdout* de 45 alumnos y priors Beta por plantilla. Es un diseño pensado para
medir incrementalidad y hacer bandit, y la documentación se escribió en consecuencia.

**Documentación funcional completa.** Los ocho archivos de `docs/` rellenados con contenido real del
proyecto.

**Decisiones de producto tomadas** (con el usuario, antes de documentar):

- Cola de aprobación humana en lugar de envío autónomo. Ningún email sale sin que alguien lo lea.
- Envío simulado por defecto, real solo al buzón del operador. Los correos del dataset son
  `@example.com` y no son entregables por diseño.
- Thompson sampling y holdout dentro del MVP: es lo que diferencia el producto de un generador de
  emails con IA.
- Stack: Next.js 15 + Supabase + Resend + Claude API + Vercel.

**Inicialización del repositorio** según el checklist de `CLAUDE.md`.

## Qué se modificó

- `docs/prd.md` — producto, usuario objetivo, MoSCoW y requisitos no funcionales
- `docs/business.md` — unit economics, métricas de éxito, riesgos y restricciones
- `docs/architecture.md` — stack, diagrama, estructura, despliegue y 5 decisiones técnicas
- `docs/data-model.md` — las 3 tablas, la vista de elegibilidad, RLS, migraciones y seed
- `docs/design-system.md` — paleta de marca LH, tipografía, componentes y tono visual
- `docs/user-flows.md` — 7 flujos con diagramas y casos de error
- `docs/roadmap.md` — fases 0 a 3 y descartes razonados
- `docs/testing.md` — estrategia centrada en la política de supresión
- `README.md` — reescrito para el proyecto
- `CLAUDE.md` — placeholders rellenados; eliminadas la sección de inicialización y las referencias
  a la plantilla
- `LICENSE` — año 2026 y autor Pol Marzà
- `.env.example` — variables reales del stack, incluido el interruptor `ENVIO_REAL_HABILITADO`
- `mejoras/backlog.md` — ejemplo sustituido por dos ideas reales surgidas del análisis
- `changelog/README.md` — eliminada la referencia a la plantilla
- `.claude/commands/init-proyecto.md` — eliminado (ya no aplica)
- `.template/` — eliminada

## Por qué

El repositorio se distribuía con documentación que hablaba de la plantilla, no del proyecto. Con el
dataset del hackathon disponible y las decisiones de producto tomadas, tocaba convertirlo en el
repositorio de *este* proyecto para poder empezar a construir la Fase 0 del roadmap.

## Pendiente

- **Servidores MCP sin configurar.** Con el stack ya decidido, los candidatos son Supabase, Resend y
  Vercel. No se instala ninguno sin aprobación explícita, según el "Protocolo de MCPs" de
  `CLAUDE.md`. Se lanza con `/mcp-setup`.
