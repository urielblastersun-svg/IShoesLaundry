# Fase 0 — Documento de Diseño

> Definición funcional y técnica del sistema. Alimenta las fases posteriores del [`PLAN.md`](../PLAN.md).

## 1. Usuarios y roles

| Rol | Acceso | Alcance |
|-----|--------|---------|
| `DESPACHADOR` | Tablet de su establecimiento | Crear pedidos con fotos |
| `TRANSPORTISTA` | Todas las notas de recogida | Checklist de recogida |
| `ADMIN` | Todo | Gestión, reportes, estados, descuentos |

Un usuario pertenece a un `Establecimiento` (lunging local). El transportista es multi-local.

## 2. Estados del pedido

```
NUEVO ──▶ EN_TRANSPORTE ──▶ EN_LAVADO ──▶ TERMINADO ──▶ ENTREGADO
```

| # | Estado | Descripción | Quién transiciona |
|---|--------|-------------|-------------------|
| 1 | `NUEVO` | Nota creada con fotos, pendiente de recoger | Despachador (creación) |
| 2 | `EN_TRANSPORTE` | Transportista marcó el checklist de recogida | Transportista |
| 3 | `EN_LAVADO` | Recibido en el centro de lavado / en limpieza | Admin |
| 4 | `TERMINADO` | Regresó al local, detallado y embolsado | Admin |
| 5 | `ENTREGADO` | Retirado por el cliente | Admin/Despachador |

Cada transición registra `HistorialEstado(pedido_id, estado, usuario_id, timestamp)`.

## 3. Modelo de datos (PostgreSQL / Prisma)

### Establecimiento
`id, nombre, direccion, ciudad, activo, createdAt`

### Usuario
`id, nombre, telefono, email (único), passwordHash, rol, establecimientoId? (null para admin/transportista), activo, createdAt`

### Cliente
`id, nombre, telefono, createdAt`

### Pedido
`id, folio (único, auto `IL-YYYYNNNN`), clienteId, establecimientoId, empleadoId (despachador), estado, subtotal, descuento, total, notas?, qrRef, createdAt`

### Item
`id, pedidoId, tipo (TENIS|GORRA|MOCHILA), categoria (BLANCO|COLOR|NINIO|PIEL_GAMUZA|null), marca, modelo, color, talla?, costo`

### Foto
`id, pedidoId, itemId? (null = foto general), tipo (ANGULO_1..4|GENERAL|ITEM), url, almacenadaEn (LOCAL|GCS), createdAt`

### HistorialEstado
`id, pedidoId, estado, usuarioId, timestamp`

### Transporte
`id, transportistaId, fechaRecoleccion, createdAt` — con relación N:N a Pedidos (tabla intermedia `TransportePedido`).

### Gasto
`id, establecimientoId?, descripcion, monto, categoria, fecha`

### CorteCaja
`id, establecimientoId, fecha, totalVentas, totalGastos, diferencia`

### EsquemaDescuento
`id, nombre, tipo (PORCENTAJE|MONTO), valor, condicion?, activo`

## 4. Contrato de API (v1)

Base URL: `http://localhost:3000/api` — Autenticación: `Authorization: Bearer <token>` excepto login.

### Auth
- `POST /auth/login` `{ email, password }` → `{ accessToken, usuario }`
- `GET /auth/perfil` → usuario logueado

### Establecimientos (ADMIN crea/edita; autenticado lista)
- `GET /establecimientos`
- `POST /establecimientos` `{ nombre, direccion, ciudad }`
- `PATCH /establecimientos/:id`
- `DELETE /establecimientos/:id` (soft delete vía `activo`)

### Usuarios (ADMIN)
- `GET /usuarios?rol=&establecimientoId=`
- `POST /usuarios` `{ nombre, telefono, email, password, rol, establecimientoId? }`
- `PATCH /usuarios/:id` · `DELETE /usuarios/:id`

### Pedidos (DESPACHADOR/ADMIN crean; autenticados listan/consultan)
- `POST /pedidos` — ver payload abajo
- `GET /pedidos?estado=&establecimientoId=&desde=&hasta=&folio=&q=`
- `GET /pedidos/:id`
- `PATCH /pedidos/:id/estado` `{ estado }` (valida transiciones y rol)
- `GET /pedidos/:id` devuelve items + fotos + historial

**Payload POST /pedidos:**
```json
{
  "cliente": { "nombre": "Juan", "telefono": "5551234567" },
  "establecimientoId": "uuid",
  "items": [
    { "tipo": "TENIS", "categoria": "BLANCO", "marca": "Nike",
      "modelo": "Air Force", "color": "Blanco", "talla": "27",
      "costo": 120, "fotoGeneral": true }
  ],
  "fotosGroceries": ["/storage/foto-a.jpg", "/storage/foto-b.jpg"],
  "notas": "Sin cordones"
}
```
- Cada `item` lleva opcionalmente `4 urls` (ángulos) → se crea un `ItemFoto`.
- `fotosGenerales` = foto general de todos los pares junto a la nota.
- El total = Σ costos de items − descuento; el folio y QR se generan en el servidor.

### Storage
- `POST /storage/upload` (multipart `file`) → `{ url }` (driver local o GCS según `UPLOAD_DRIVER`).

## 5. Módulos del backend (NestJS)

```
modules/
  auth/          login, JWT, guards RolesGuard/JwtAuthGuard
  usuarios/      CRUD usuarios + seed
  establecimientos/
  clientes/
  pedidos/       creación con items+fotos+historial; transiciones de estado
  storage/       driver local | GCS
  reportes/      (Fase 3) cortes de caja, ganancias, gastos
```

## 6. Pantallas principales (frontend / PWA)

### Login
Email + password, sin registro público.

### Alta de pedido (despachador) — wizard de 3 pasos
1. **Cliente:** nombre + teléfono.
2. **Artículos:** agregar por cada par: tipo → (si tenis) categoría; marca/modelo/color/talla; costo; captura de **4 ángulos** (botones 1–4 con `input capture`) + foto general opcional. Soporta gorras/mochilas (costo según tamaño).
3. **Confirmar:** resumen, subtotal, descuento, total → guardar → folio + QR.

### Lista / detalle (despachador y admin)
Tarjetas por estado, filtros por establecimiento/estado/fecha, detalle con línea de tiempo de estados.

## 7. Supuestos y decisiones

- Las fotos de los 4 ángulos por par se capturan desde la tablet (cámara trasera); en desktop se permite seleccionar archivos (mismo flujo con `capture` opcional).
- El QR por folio se implementa en Fase 2 (impresión) y Fase 4 (etiquetas).
- Multi-locale de alcance medio (3–10): todas las consultas filtran por `establecimientoId` y el índice de `Pedido.establecimientoId`.
- Monetario: montos en la moneda local como decimales de 2 cifras, con redondeo en el servidor.