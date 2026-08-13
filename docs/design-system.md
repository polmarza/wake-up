# Design System

**Producto:** Wake Up Heroes
**Base:** identidad de Learning Heroes, adaptada a herramienta interna de trabajo.

Este documento es la fuente de verdad visual. Consultar antes de crear cualquier componente nuevo.

---

## Paleta de colores

Los cuatro primeros son los colores de marca de Learning Heroes. El resto son colores funcionales de
interfaz: neutros y estados, necesarios en una herramienta con tablas, formularios y métricas.

### Marca

| Rol | Nombre | Hex | Uso |
|---|---|---|---|
| Primary | Petróleo LH | `#243F4C` | Fondo de la barra lateral, títulos, botones primarios sobre fondo claro |
| Accent | Rosa LH | `#FF2878` | Acción principal (Aprobar y enviar), badges activos, línea de foco. **Nunca decorativo** |
| Accent 2 | Cian LH | `#61F2F2` | Datos en gráficas, resaltados sobre fondo petróleo, estado "reactivado" |
| Base | Blanco | `#FFFFFF` | Fondo de la aplicación |

### Interfaz

| Rol | Nombre | Hex |
|---|---|---|
| Surface | Fondo de cards y panel lateral | `#F7F9FA` |
| Surface hover | Fila de tabla al pasar por encima | `#EDF2F4` |
| Border | Bordes y separadores | `#DDE5E9` |
| Text primary | Texto principal | `#243F4C` |
| Text secondary | Metadatos, etiquetas de campo | `#5F7280` |
| Text muted | Texto deshabilitado, placeholders | `#93A5AF` |
| Success | Reactivado, envío correcto | `#12A594` |
| Warning | Cerca del techo de intentos, cooldown activo | `#F0A202` |
| Error | Suprimido, rebote, baja | `#E03131` |
| Info | Grupo holdout, avisos neutros | `#3B82C4` |

### Colores por segmento

Cada segmento tiene un color fijo. Se usa igual en badges de la cola y en las series de las
gráficas: si `abandono_temprano` es ámbar en la tabla, es ámbar en el gráfico.

| Segmento | Hex | Lectura |
|---|---|---|
| `nunca_empezo` | `#8B5CF6` | Nunca entró |
| `abandono_temprano` | `#F0A202` | Se fue pronto (<34%) |
| `abandono_medio` | `#3B82C4` | Se fue por la mitad (<70%) |
| `abandono_tardio` | `#12A594` | Casi lo tenía (≥70%) |
| `completado` | `#FF2878` | Terminó → upsell |

**Regla de accesibilidad:** el color nunca es el único portador de significado. Todo badge de
segmento o de estado lleva texto. Contraste mínimo AA (4.5:1) en texto normal.

---

## Tipografía

- **Display / titulares:** Space Grotesk — la tipografía de marca de Learning Heroes.
- **Interfaz y texto largo:** Inter — es una herramienta que se lee mucho y muy seguido.
- **Datos y monoespaciado:** JetBrains Mono — IDs, fragmentos de prompt, valores `alpha`/`beta`.

| Nivel | Fuente | Tamaño | Peso | Uso |
|---|---|---|---|---|
| H1 | Space Grotesk | 32px | 700 | Título de página |
| H2 | Space Grotesk | 24px | 600 | Secciones |
| H3 | Space Grotesk | 18px | 600 | Cabeceras de card |
| Body | Inter | 15px | 400 | Texto general |
| Body small | Inter | 13px | 400 | Metadatos, celdas de tabla |
| Label | Inter | 12px | 500 | Etiquetas de campo (mayúsculas, `letter-spacing: 0.04em`) |
| Metric | Space Grotesk | 40px | 700 | Números grandes del dashboard, tabulares |
| Mono | JetBrains Mono | 13px | 400 | IDs, versiones de prompt, valores del bandit |

**Cuerpo del email (previsualización):** se renderiza con tipografías de sistema, no con las de la
aplicación. Lo que se ve en el panel debe parecerse a lo que verá el alumno en su cliente de correo,
no a la interfaz.

**Números:** siempre `font-variant-numeric: tabular-nums` en tablas y métricas, para que las
columnas no bailen.

---

## Espaciado y grid

- **Escala base 4px:** 4, 8, 12, 16, 24, 32, 48, 64.
- **Layout principal:** barra lateral fija de 240px + área de contenido fluida.
- **Pantalla de revisión:** dos columnas — ficha del alumno (380px, fija) y borrador del email
  (fluida, máx. 680px de ancho de texto). En pantallas < 1024px se apilan, ficha arriba.
- **Densidad de tabla:** compacta. Fila de 44px, padding horizontal 12px. La cola es una pantalla de
  escaneo rápido: cuanto más quepa sin agobiar, mejor.
- **Ancho máximo de la aplicación:** 1440px, centrada.

---

## Estilo de componentes

- **Border radius:** 10px en cards y modales, 6px en botones e inputs, `full` en badges.
- **Sombras:** solo en elementos flotantes (modal, dropdown, toast). Las cards se separan con borde,
  no con sombra. Nada de sombras decorativas.
- **Bordes:** 1px `#DDE5E9`. La jerarquía se construye con espacio y peso tipográfico, no con cajas
  dentro de cajas.
- **Botones:** un único botón primario visible por pantalla, y es siempre la acción que hace avanzar
  el trabajo (*Aprobar y enviar*). El resto, secundarios o de texto. Las acciones destructivas o
  irreversibles piden confirmación.
- **Iconos:** Lucide React, 18px en línea de texto, 20px en botones. Trazo 1.5px.
- **Estados de foco:** anillo de 2px en rosa LH con 2px de separación. Visible siempre: la cola se
  recorre con teclado.
- **Movimiento:** transiciones de 150ms en hover y foco. La única animación con presencia propia es
  el streaming del texto generado, porque comunica que el modelo está trabajando. Nada más se mueve.

---

## Tono visual

Una herramienta de trabajo, no una landing. Densa de información, tranquila de aspecto. El operador
va a pasar por esta pantalla cien veces seguidas: cada elemento decorativo se convierte en ruido a
la décima repetición.

El protagonista es **el alumno concreto**: su nombre, dónde se atascó, qué dijo al irse. La interfaz
existe para poner ese contexto delante de los ojos y quitarse de en medio. El rosa de marca aparece
poco y siempre significa lo mismo: *esto es lo que tienes que hacer ahora*.

**Lo que NO debe parecer:** un panel de email marketing lleno de gráficas de vanidad, ni un producto
de IA que presume de serlo. Que el texto lo escriba un modelo es un detalle de implementación, no un
argumento visual. No hay destellos, ni degradados morados, ni animaciones de "pensando" con
partículas.

**Lo que sí debe transmitir:** control. En todo momento se ve por qué este alumno está en la lista,
qué se le ha enviado antes y qué va a salir exactamente si se aprueba.

---

## Componentes definidos

> Se documentan aquí a medida que se construyen. Al crear uno nuevo, añadirlo con su propósito,
> props principales y cuándo *no* usarlo.

### SegmentoBadge
Muestra el segmento calculado de un alumno con su color fijo y su etiqueta de texto.
Props: `segmento: 'nunca_empezo' | 'abandono_temprano' | 'abandono_medio' | 'abandono_tardio' | 'completado'`.
Usar en la cola, en la ficha y en las leyendas de gráficas. No usar como filtro clicable: para eso
está el control de filtros.

### FichaAlumno
Panel con todo el contexto de un candidato: curso, sesión donde se quedó, progreso, días inactivo,
motivo declarado, historial de envíos y estado de consentimiento.
Es el componente que justifica la decisión del operador. Si un dato influye en si escribir o no,
tiene que estar aquí.

### BorradorEmail
Asunto editable + cuerpo editable con previsualización renderizada. Muestra qué plantilla eligió el
bandit y por qué (`alpha`/`beta` de la variante). Soporta streaming durante la generación.

### BarraGuardarrailes
Franja de estado que indica por qué un alumno es o no elegible: consentimiento, cooldown, intentos
consumidos, holdout. Usar siempre que se muestre un alumno fuera de la cola normal, para que nunca
haya que adivinar por qué no aparece.

### MetricaUplift
Compara tratamiento contra holdout: dos tasas, la diferencia en puntos y el tamaño de cada grupo.
**Siempre muestra el tamaño de la muestra.** Un porcentaje sin denominador es una mentira educada.

---

## Referencias visuales

- **Linear** — densidad de lista, atajos de teclado, sensación de herramienta rápida.
- **Vercel Dashboard** — sobriedad, uso disciplinado del color, tablas legibles.
- **shadcn/ui** — base de componentes sobre la que se construye. Se adopta su estructura y se
  sustituyen sus tokens de color por los de marca.
- **Superhuman** — el flujo de "revisar y despachar uno detrás de otro" que queremos en la cola.
