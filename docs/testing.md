# Estrategia de testing

Documento vivo. Actualizar cuando cambien las convenciones o el stack de testing.

---

## Filosofía

Es un hackathon: no se busca cobertura, se busca **dormir tranquilo**. Y en este proyecto solo hay
una cosa que quita el sueño de verdad: **escribirle a alguien a quien no se debía escribir.**

Por eso el testing está deliberadamente desequilibrado. La política de supresión se prueba a
conciencia —es la parte del sistema cuyo fallo tiene consecuencias reales e irreversibles— y el
resto se cubre solo donde hay lógica que pueda romperse en silencio.

Tres reglas que ordenan el esfuerzo:

1. **Lo irreversible se testea siempre.** Un email enviado no se puede recuperar; un alumno que
   marca spam no vuelve.
2. **Lo que se rompe en silencio, también.** Un fallo en el bandit no lanza ninguna excepción: solo
   hace que el sistema aprenda mal durante semanas.
3. **Lo visual no se testea.** Se mira. Es más rápido y más fiable.

---

## Stack de testing

| Tipo | Herramienta |
|---|---|
| Unitario | Vitest |
| Integración | Vitest + cliente de Supabase contra base de datos de test |
| Base de datos | Assertions SQL sobre la vista `candidatos_reactivacion` |
| E2E | Playwright (solo el flujo de aprobación) |

---

## Qué testear

### Sí testear

**La política de supresión (prioridad máxima).** Un test por cada condición de la vista, con un
alumno fabricado que la incumple, verificando que **no aparece** entre los candidatos:

- sin `consentimiento_marketing`
- con `opt_out_at` informado
- con `hard_bounce`
- con `queja_spam`
- ya `reactivado`
- `estado = 'baja'`
- `grupo_experimento = 'holdout'` ← el que más fácil se cuela en un refactor
- con menos de 21 días de inactividad
- con envío hace menos de 14 días (enfriamiento)
- con `emails_enviados_total >= 3` (techo)

Más un test agregado sobre el dataset completo: **de los 300 alumnos, los ~200 no elegibles no
aparecen jamás**, y ninguno de los 45 del holdout está en la cola.

**La segmentación.** Casos frontera del progreso: exactamente 0 sesiones (`nunca_empezo`), 0,33 y
0,34 (`abandono_temprano` / `abandono_medio`), 0,69 y 0,70 (`abandono_medio` / `abandono_tardio`), y
que `estado = 'completado'` gana a cualquier cálculo de porcentaje.

**Thompson sampling.** Con semilla fija: que la distribución de elecciones favorezca a las variantes
con mejores priors sin dejar de explorar; que una plantilla `activa = false` nunca salga elegida;
que una variante con 24 envíos y 0 reactivaciones (`t_nunca_empezo_B`) se elija cada vez menos.

**La actualización de priors.** Que `alpha = 1 + reactivaciones` y `beta = 1 + envios − reactivaciones`
se mantengan tras registrar un resultado, y que registrar dos veces el mismo resultado no sume dos
veces.

**Los contadores de envío.** Aprobar incrementa `emails_enviados_total` y `ultimo_envio_at`;
**descartar no incrementa nada**. Es la diferencia que decide si un alumno gasta un intento o no.

**La validación del texto generado.** Que un resultado sin asunto, con el cuerpo vacío o con
marcadores sin sustituir (`{nombre}`) se rechace antes de guardarse.

**La baja por token.** Que escribe `opt_out_at`, que saca al alumno de la vista de inmediato, que es
idempotente y que un token inválido responde igual que uno válido.

### No testear (o mockear)

- **Componentes puramente visuales.** Se revisan a ojo.
- **La API de Claude.** Se mockea. Lo que se testea es la validación de su respuesta y el
  comportamiento ante un fallo, no que el modelo escriba bien.
- **La API de Resend.** Se mockea siempre. Ningún test debe poder enviar un email de verdad.
- **Supabase Auth.** Es infraestructura de terceros.
- **El propio dataset sintético.** Es dato de entrada, no código.

---

## Convenciones

- Archivos `nombre.test.ts` junto al archivo que prueban.
- Los tests de base de datos en `supabase/tests/`, uno por migración que cambie la política.
- Nombres en presente y en castellano, describiendo el comportamiento esperado:
  `"excluye a los alumnos del grupo holdout"`, `"no consume intento al descartar"`.
- **Ningún test toca la base de datos de desarrollo.** Base de datos de test aparte, sembrada y
  vaciada por test.
- Los tests del bandit fijan la semilla del generador aleatorio. Sin semilla, un test no
  determinista acaba desactivado a los dos días.
- Un test que falle porque cambió una regla de negocio **no se ajusta sin más**: primero se
  actualiza `data-model.md` y se registra el cambio en `changelog/`. La política de contacto no se
  cambia sin dejar rastro.

---

## Cobertura objetivo

No hay porcentaje global. Hay objetivos por zona:

| Zona | Objetivo |
|---|---|
| Política de supresión y elegibilidad | **100%. Cada condición, su test** |
| `lib/bandit/` | ≥ 90% |
| `lib/candidatos/`, `lib/generacion/` (validación) | ≥ 80% |
| Componentes de interfaz | Sin objetivo |

---

## Cómo correr los tests

```bash
pnpm test
```

```bash
pnpm test:watch
```

```bash
pnpm test:coverage
```

```bash
pnpm test:e2e
```

Los tests de base de datos necesitan un proyecto Supabase de test con las migraciones aplicadas y el
dataset sembrado (`pnpm seed:test`).

### Probar el prompt a mano

La calidad de un email no la mide ningún test: hay que leerlo. Este script genera un borrador real
por consola, sin tocar la base de datos ni enviar nada, y es la forma rápida de iterar sobre el
prompt.

```bash
pnpm tsx scripts/probar-generacion.ts
```

Con un correo concreto como argumento, genera el de ese alumno.

---

## Antes de la demo

Lista corta de verificación manual, porque hay cosas que ningún test automático confirma:

- [ ] La cola carga y muestra candidatos reales del dataset
- [ ] Ningún alumno del holdout aparece en la cola
- [ ] Un borrador se genera en vivo y el texto menciona el curso y la sesión correctos
- [ ] El envío de prueba llega al buzón del operador
- [ ] `ENVIO_REAL_HABILITADO` está en `false` salvo durante esa prueba
- [ ] El dashboard muestra el uplift con el tamaño de ambos grupos
- [ ] Aprobar un candidato lo saca de la cola
