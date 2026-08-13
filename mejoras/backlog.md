# Backlog de mejoras

Ideas que no entran en el sprint actual pero que no queremos perder. No es un compromiso, es un
repositorio de ideas. Añadir una entrada cada vez que surja algo durante el desarrollo (`/mejora`).

Si una idea ya está planificada, su sitio es `docs/roadmap.md`, no este archivo.

---

## Formato de entrada

```
### [MEJORA-XX] Título de la idea
**Área:** Frontend / Backend / UX / Infraestructura / Negocio
**Prioridad estimada:** Alta / Media / Baja
**Origen:** De dónde salió la idea (conversación, feedback de usuario, etc.)

Descripción breve de la mejora y por qué aportaría valor.
```

---

### [MEJORA-01] Segmentar también por motivo de abandono, no solo por progreso
**Área:** Negocio
**Prioridad estimada:** Media
**Origen:** Análisis del dataset durante la definición del producto

Hoy el segmento se calcula solo con el porcentaje de progreso. Pero 123 alumnos declararon un motivo
concreto al irse —nivel bajo (26), falta de tiempo (23), nivel alto (23), económico (20), cambio de
trabajo (17), problema técnico (14)— y ese dato predice mejor qué mensaje funciona que el punto
donde se quedaron. A quien lo dejó por dinero no se le escribe igual que a quien lo dejó porque le
venía grande.

Implica una matriz de plantillas más grande (segmento × motivo) y por tanto más variantes para el
bandit, así que conviene esperar a tener volumen suficiente para que la exploración no se disperse.

---

### [MEJORA-02] Detectar alumnos en riesgo antes de que abandonen
**Área:** Negocio
**Prioridad estimada:** Baja
**Origen:** Conversación de definición del alcance

Wake Up Heroes actúa cuando el alumno ya se fue. Con la mediana de inactividad en 222 días, llegamos
tarde por definición. Un aviso al profesor cuando alguien lleva dos semanas sin avanzar tendría más
impacto que cualquier email de reactivación.

Se descartó del MVP porque es otro producto con otras métricas, pero comparte todo el modelo de
datos.
