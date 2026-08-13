# Dashboard de resultados: uplift contra el holdout

**Fecha:** 2026-08-14 00:25
**Tipo:** Feature

## Qué se hizo

Pantalla `/resultados`, la última pieza de la Fase 1. Cuatro bloques:

1. **Uplift**: tasa del grupo de tratamiento frente a la del holdout, con la diferencia en puntos
   porcentuales y **el tamaño de ambos grupos siempre a la vista**.
2. **Valor recuperado**: reinscripciones (las únicas que facturan), ingreso estimado a ticket medio,
   y el resto de vueltas —respuestas y logins— contadas aparte porque no generan ingreso inmediato.
3. **Por segmento**: qué tipo de abandono responde mejor.
4. **Por plantilla**: envíos, aciertos, tasa y priors `α`/`β` de cada variante, que es donde se ve
   lo que está aprendiendo el bandit.

Sin librería de gráficas: barras proporcionales en CSS. Recharts está instalado pero aquí habría
significado un componente de cliente para dibujar cinco barras.

## Dos decisiones sobre cómo se calculan las tasas

**El grupo de tratamiento son los que recibieron un email**, no todos los que podrían recibirlo.
Incluir a los 90 que aún no se han trabajado diluiría la tasa del 25,3% al 16,4% y haría parecer que
el sistema funciona peor de lo que funciona.

**Del holdout se descuentan los que tampoco habrían sido contactables** —sin consentimiento, dados
de baja, con rebote o con queja—: 39 de los 45. Comparar contra el holdout entero le bajaría
artificialmente la tasa y nos regalaría uplift que no hemos ganado.

## El hallazgo que condiciona la demo

**El holdout registra cero reactivaciones sobre 39 alumnos, y ningún alumno del dataset se reactivó
sin haber recibido un email antes.**

Eso da un uplift de +25,3 puntos que no hay que creerse: en datos reales una parte de la gente vuelve
sola, y ese suelo es justo lo que el grupo de control existe para medir. Aquí es un artefacto de cómo
se generó el dataset sintético, que solo marca como reactivado a quien fue contactado.

La pantalla lo dice ella misma, en un aviso junto al número. Es deliberado: si el dato se presenta
sin ese contexto, el primer juez que sepa de experimentación lo desmonta. Contado al revés —"la
medición está montada, el grupo de control existe, la magnitud necesita datos reales"— el mismo
número juega a favor.

## Qué se modificó

- `src/lib/resultados/consultas.ts` — agregación (a 301 alumnos se trae todo y se calcula en
  TypeScript; media docena de vistas materializadas serían menos legibles y no más rápidas)
- `src/app/(app)/resultados/page.tsx`
- `src/app/(app)/cola/page.tsx` — enlace a resultados

## Verificación

- `pnpm build`, `pnpm lint`, `pnpm test` (30 pasan, 14 saltados)
- Las cifras de la página replicadas en SQL a mano: tratamiento 42/166 = 25,3%; holdout 0/39 = 0,0%;
  uplift 25,3 pp. Coinciden
- `/resultados` sin sesión redirige a `/login` (307)
- **No verificada visualmente**: la pantalla exige sesión y el enlace mágico va al buzón del
  operador, así que la revisa él
