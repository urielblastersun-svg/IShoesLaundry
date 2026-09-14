# IShoes Laundry

Sistema de control de ventas y trazabilidad de entregas para lavandería de tenis.
Aplicación **PWA** para tablets que digitaliza las notas de servicio, identifica cada pedido
por establecimiento y da seguimiento puntual al calzado de cada cliente.

Contexto de negocio y propuesta original en [`PropuestaProyecto.md`](./PropuestaProyecto.md).
Plan de trabajo en [`PLAN.md`](./PLAN.md). Diseño en [`docs/fase0-diseno.md`](./docs/fase0-diseno.md).
¿Quieres entender cada archivo y tecnología? Lee la [`docs/guia-tecnica.md`](./docs/guia-tecnica.md).

## Stack

- **Frontend:** React + TypeScript + Vite (PWA) — `apps/web`
- **Backend:** NestJS + Prisma + PostgreSQL — `apps/api`
- **Storage:** local (dev) / Google Cloud Storage (prod)
- **Auth:** JWT + bcrypt, roles `DESPACHADOR | TRANSPORTISTA | ADMIN`

## Estructura

```
apps/
  api/                  Backend NestJS
  web/                  Frontend React PWA
docs/
  fase0-diseno.md       Diseño (flujos, datos, contratos API)
  guia-tecnica.md       Guía de aprendizaje: cómo funciona cada parte
```

## Requisitos

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local) o un host gestionado (Neon, etc.)

## Puesta en marcha (desarrollo)

### 1. Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env     # editar DATABASE_URL
npm install
npx prisma migrate dev   # aplicar migración inicial
npx prisma db seed       # crea admin + establecimientos demo
npm run start:dev        # http://localhost:3000
```

### 2. Frontend (`apps/web`)

```bash
cd apps/web
cp .env.example .env     # editar VITE_API_URL si cambia el puerto
npm install
npm run dev              # http://localhost:5173
```

### Credenciales demo (seed)

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | `admin@islaundry.app` | `admin123` |
| DESPACHADOR | `despachador@islaundry.app` | `despachador123` |

## Variables de entorno clave

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens |
| `JWT_EXPIRES_IN` | TTL del access token (ej. `1d`) |
| `UPLOAD_DRIVER` | `local` (dev) o `gcs` (prod) |
| `GCS_BUCKET` / `GCS_KEYFILE` | Config de storage (solo `gcs`) |
| `PUBLIC_BASE_URL` | URL base pública del backend para servir archivos locales |

## Estado del proyecto

En desarrollo — **Fase 0 y 1 en curso** (base, auth, despachador). Ver [`PLAN.md`](./PLAN.md).

## Contrato de API (resumen)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/auth/login` | público | Iniciar sesión |
| `GET` | `/establecimientos` | autenticado | Listar establecimientos |
| `POST/PATCH/DELETE` | `/establecimientos` | ADMIN | CRUD establecimientos |
| `GET` | `/usuarios` | ADMIN | Listar usuarios |
| `POST` | `/usuarios` | ADMIN | Crear usuario |
| `POST` | `/pedidos` | DESPACHADOR, ADMIN | Crear pedido (items + fotos + cliente) |
| `POST` | `/storage/upload*` | DESPACHADOR, ADMIN | Subida de fotos |

Detalle completo de contratos en [`docs/fase0-diseno.md`](./docs/fase0-diseno.md).