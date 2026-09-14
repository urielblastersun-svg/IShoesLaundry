# Plan de Trabajo — App de Control y Trazabilidad para Lavandería de Tenis

> Documento de planificación del proyecto. Contexto de negocio en `PropuestaProyecto.md`.
> Estado: **Fase 0 – 1 en curso**.

## 1. Resumen ejecutivo

Aplicación web **PWA** instalable en las tablets de cada establecimiento que digitaliza la nota
manuscrita actual, elimina la pérdida de notas y garantiza que cada par de tenis quede identificado
con su establecimiento de origen (resolviendo el problema de "el calzado llega a otro local").
Incluye login por empleado, 3 roles, 5 estados de trazabilidad y panel administrativo con reportes,
descuentos y cortes de caja.

## 2. Esquema técnico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend (PWA) | React 19 + TypeScript + Vite, React Router, Tailwind CSS, `vite-plugin-pwa` | Instalable en tablets, acceso a cámara vía `input capture`, se actualiza sola |
| Backend | Node.js + NestJS (TypeScript) | Estructura modular, escalable para 3–10 locales |
| Base de datos | PostgreSQL + Prisma ORM | Datos relacionales (pedidos, items, estados, cortes) |
| Autenticación | JWT (access + refresh) + `bcrypt`, guards de roles | Login por empleado con control de rol |
| Almacenamiento | Google Cloud Storage (GCS) | Afinidad con Google; URLs firmadas para acceso seguro |
| Reportes | Consultas SQL + exportación CSV/PDF | Cortes de caja, ganancias por local, gastos (mensual/anual) |
| CI/CD | GitHub Actions | Despliegue automático |
| Monitoreo | Sentry + UptimeRobot | Errores y disponibilidad |

### Hosting y servicios

- **Frontend:** Vercel o Cloudflare Pages (estático + CDN, HTTPS gratis).
- **Backend:** Railway o Render.
- **PostgreSQL:** Neon (managed, backups automáticos).
- **Storage:** GCS (~50–200 MB/mes a 8 fotos/pedido × 100 pedidos/día).
- **Dominio propio** + HTTPS.

## 3. Modelo de datos (entidades)

```
Establecimiento (nombre, dirección, ciudad)
Usuario (nombre, teléfono, email, password_hash, rol, establecimiento_id)
Cliente (nombre, teléfono)
Pedido (folio, cliente_id, establecimiento_id, empleado_id,
         estado, subtotal, descuento, total, fecha_creacion)
Item (pedido_id, tipo[tenis/gorra/mochila], categoria[blanco/color/niño/piel-gamuza],
      marca, modelo, color, talla, costo_unitario)
Foto (entidad, tipo[angulo1-4/general], url_storage)
HistorialEstado (pedido_id, estado, usuario_id, timestamp)
Transporte (transportista_id, fecha, checklist_pedidos[])
Gasto (establecimiento_id, descripcion, monto, categoria, fecha)
CorteCaja (establecimiento_id, fecha, total_ventas, total_gastos, diferencia)
EsquemaDescuento (nombre, tipo[porcentaje/monto], condición, activo)
```

### Estados del pedido

```
NUEVO → EN_TRANSPORTE → EN_LAVADO → TERMINADO → ENTREGADO
```

- `NUEVO`: despachador crea la nota con fotos.
- `EN_TRANSPORTE`: transportista marca su checklist al recoger.
- `EN_LAVADO`: administrador confirma recepción en el centro de lavado.
- `TERMINADO`: regresa al local, detallado y embolsado, listo para entrega.
- `ENTREGADO`: el cliente retira.

## 4. Flujos por rol

**Despachador (tablet del local)**
1. Login → nuevo pedido → establecimiento predeterminado.
2. Por cada par: 4 fotos (ángulos) + características (tipo, marca, modelo, color, talla) + precio.
   Permite gorras/mochilas (costo según tamaño).
3. Foto general de todos los pares + datos del cliente (nombre, teléfono).
4. Total automático → nota guardada con folio + QR.

**Transportista**
- Ve las notas pendientes de recoger por local y hace checklist de recogida → `EN_TRANSPORTE`.

**Administrador**
- Ve todas las notas de todos los locales con filtros.
- Marca recepción en el centro (`EN_LAVADO`) y regreso (`TERMINADO`).
- Descuentos: edita precio directo o aplica esquemas.
- Reportes: corte de caja, ganancias por local/total, gastos; mensual/anual; exporta CSV/PDF.

## 5. Roadmap por fases

Estimado para 1 desarrollador, ~8–10 semanas.

### Fase 0 — Definición y diseño *(1 semana)*
- [ ] Flujos por rol en detalle (storyboards).
- [ ] Wireframe/UI de las 3 vistas (mobile-first para tablet).
- [ ] Esquema PostgreSQL final + contratos de API.
- **Hito:** documento de diseño + mockups aprobados. → `docs/fase0-diseno.md`

### Fase 1 — Base, auth y despachador (MVP) *(2–3 semanas)*
- [x] Setup monorepo (frontend + backend) y CI básico.
- [x] Backend: NestJS + Prisma + modelos base + migración.
- [x] Autenticación JWT con roles y guards.
- [x] CRUD de establecimientos y usuarios (seeder inicial).
- [x] Módulo de pedidos: crear nota con items, fotos y cliente.
- [x] Storage de fotos: local en dev, GCS configurable por variables.
- [x] Frontend PWA: login y alta de nota con captura de fotos.
- **Hito:** despachador puede crear una nota completa con fotos en la tablet.

### Fase 2 — Transporte y trazabilidad *(1–2 semanas)*
- [ ] Módulo de transporte: lista de notas por local + checklist del transportista.
- [ ] Motor de transiciones de estado con historial.
- [ ] Vista de seguimiento (línea de tiempo).
- [ ] QR/folio en cada nota y búsqueda rápida por folio.
- **Hito:** flujo cerrado punta a punta con 5 estados rastreables.

### Fase 3 — Panel administrativo *(2 semanas)*
- [ ] Filtros y consulta de notas (local, estado, rango, folio, cliente).
- [ ] Gestión de descuentos (edición directa + esquemas).
- [ ] Módulo de gastos.
- [ ] Cortes de caja y reportes (mensual/anual), exportación CSV/PDF.
- **Hito:** administrador gestiona y reporta sin hojas externas.

### Fase 4 — PWA hardening y UX *(1 semana)*
- [ ] Instalable en la tablet (manifest + service worker).
- [ ] Modo offline-first con sincronización automática.
- [ ] Impresión de nota/etiqueta con QR.
- [ ] Permisos de cámara, resolución y progreso de subida.
- **Hito:** instalada y operando en tablets reales.

### Fase 5 — Despliegue y producción *(1 semana)*
- [ ] Despliegue frontend/backend/DB.
- [ ] Dominio + HTTPS + variables de entorno seguras.
- [ ] Backups automáticos y monitoreo.
- [ ] Datos semilla y capacitación por rol.
- **Hito:** sistema en producción con los 3 roles operando.

### Fase 6 — Post-lanzamiento (fuera de alcance inicial)
- [ ] Notificaciones WhatsApp/email al cliente cuando el pedido está listo.
- [ ] Panel de estadísticas y tendencias.
- [ ] Impresión de tickets con QR y app cliente para escanear estado.

## 6. Riesgos y consideraciones

- **Cámara en tablets:** validar `capture` y orientación en los modelos reales.
- **Offline:** crítico para locals con wifi inestable → fase 4 antes de producción.
- **Seguridad:** fotos con URLs firmadas, bcrypt, roles validados en backend.
- **Escala:** el esquema multi-local es central (todo filtra por `establecimiento_id`).
- **Migración de fotos:** definir estrategia para las fotos ya subidas a GCS/cuenta Google.