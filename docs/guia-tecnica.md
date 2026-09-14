# Guía Técnica — Cómo funciona el proyecto (aprende cada parte)

> Documento de aprendizaje. Explica **qué hace cada archivo**, **qué tecnología interviene** y
> **por qué está hecho así**. Léelo en orden: cada sección apoya a la siguiente.
> Contexto de negocio: [`PropuestaProyecto.md`](../PropuestaProyecto.md) · Plan: [`PLAN.md`](../PLAN.md).

---

## 1. Mapa del proyecto (vista general)

```
IShoesLaundry/
├─ package.json              ->  Raíz del monorepo: define "workspaces"
├─ PLAN.md / README.md / PropuestaProyecto.md
├─ docs/
│  ├─ fase0-diseno.md        ->  Diseño funcional (datos, API)
│  └─ guia-tecnica.md        ->  ESTE documento
└─ apps/
   ├─ api/                   ->  Backend: NestJS + Prisma + PostgreSQL
   └─ web/                   ->  Frontend: React + Vite (PWA)
```

Tenemos **dos aplicaciones en un mismo repositorio**. La `api` (servidor) y la `web` (interfaz en
la tablet/celular) se comunican por **HTTP/JSON** mediante una **API REST**. Ninguna de las dos se
importa entre sí en el código; solo comparten el repositorio y el "lenguaje" de sus datos
(tipos y formato JSON).

---

## 2. Monorepo con npm workspaces

**Archivo clave:** [`package.json`](../package.json) (raíz).

```json
"workspaces": ["apps/*"]
```

- Un **workspace** de npm permite tener varios proyectos (`apps/api`, `apps/web`) en un solo
  repositorio con **un solo `node_modules`** en la raíz (ahorra espacio y versión).
- npm hoistea (sube) las dependencias comunes a la raíz. Si dos apps usaran la misma librería,
  se instala una sola vez.
- Los scripts de la raíz ejecutan scripts de cada workspace:
  ```json
  "dev:api": "npm run start:dev --workspace apps/api",
  "dev:web": "npm run dev --workspace apps/web"
  ```
  Cada `apps/*/package.json` declara sus **propias** dependencias y scripts; es un proyecto
  independiente dentro del monorepo.

> **Concepto a repasar:** qué resuelve un monorepo vs. "un repo por app", y qué hace
> `npm install`, `npm ci`, `--workspace`.

---

## 3. El ciclo de una petición (flujo completo)

Este es el viaje de una solicitud del usuario hasta la base de datos y de vuelta.

```
 Tablet (React PWA)                      Servidor Node (NestJS)                 PostgreSQL
┌────────────────────┐   HTTP/JSON   ┌─────────────────────────────────┐   ┌────────────┐
│ fetch() a la API   │ ────────────> │ Middlewares de Express          │   │            │
│ (GET/POST/PATCH)   │               │  CORS, body parser              │  │  tablas    │
└────────────────────┘               │  Race: route /pedidos           │──┘  del schema│
                                     └───────────────┬─────────────────┘      └────────────┘
                                                     │
                                     GlobalGuards: verificar Token JWT + Rol
                                                     │
                                     Controller: recibir/validar DTO (ValidationPipe)
                                                     │
                                     Service: lógica de negocio (usa Prisma)
                                                     │
                                     Prisma Client: SQL traducido y tipado
```

**Detalle de cómo viaja una petición `POST /pedidos`:**

1. La `web` guarda un **token JWT** en `localStorage` al hacer login.
2. Cada llamada a la API manda el header `Authorization: Bearer <token>` (lo hace `lib/api.ts`).
3. El servidor (NestJS) recibe la petición. Antes de llegar al controller pasan **guards**:
   - `JwtAuthGuard`: descifra el token y, si es válido, coloca `req.user`.
   - `RolesGuard`: comprueba si el rol del usuario está permitido en esa ruta.
4. El **controller** recibe los datos del body, que se validan con `class-validator`
   (decorators en los DTO) mediante el `ValidationPipe`.
5. El **service** ejecuta la lógica (en `pedidos.service.ts`: busca/crea el cliente, calcula
   totales, genera folio, escribe en BD con Prisma en una **transacción**).
6. Prisma traduce las llamadas en SQL y ejecuta contra PostgreSQL (con docker localmente).

> **Conceptos a repasar:** HTTP (verbos GET/POST/PATCH/DELETE, status codes), JWT, middleware,
> arquitectura Controller/Service.

---

## 4. Backend (NestJS) — explicado por módulos

### 4.1 ¿Qué es NestJS y por qué esta estructura?

NestJS es un **framework de Node.js** que organiza el código por **módulos**. Cada módulo agrupa:
una **feature** del producto (auth, usuarios, pedidos, etc.).

| Pieza      | Archivo de ejemplo                  | Su papel                                             |
|------------|-------------------------------------|------------------------------------------------------|
| **Module** | `pedidos.module.ts`                 | "Cajita" que declara qué contiene el módulo          |
| **Controller** | `pedidos.controller.ts`         | Define rutas HTTP y su responsable                   |
| **Service**    | `pedidos.service.ts`            | Lógica de negocio (reglas, cálculos, BD)             |
| **DTO**    | `pedidos/dto/crear-pedido.dto.ts`   | Define y valida la forma de los datos que entran     |
| **Guard**  | `common/guards/jwt-auth.guard.ts`   | Decide si la petición puede pasar (permisos)         |
| **Decorador**  | `common/decorators/roles.decorator.ts` | Metadatos + "azúcar" para reutilizar lógica      |

NestJS usa **Inyección de Dependencias (DI)**: en vez de crear instancias a mano
(`new PedidosService()`), declaras en el constructor la dependencia y el framework la inyecta:

```ts
// pedidos.controller.ts
constructor(private readonly service: PedidosService) {}
// Nest crea PedidosService automáticamente y lo "inyecta" aquí.
// Por eso el servicio está declarado en providers del módulo.
```

> **Conceptos a repasar:** decorators (patrón de metadatos de TypeScript), inyección de
> dependencias, ciclo de vida de NestJS (módulos `Imports/Controllers/Providers/Exports`).

### 4.2 `main.ts` — el punto de entrada

**Archivo:** [`apps/api/src/main.ts`](../apps/api/src/main.ts)

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);
```

- `NestFactory.create` monta toda la app a partir del **módulo raíz** `AppModule` (que importa los
  demás módulos).
- `app.enableCors({...})`: permite que el navegador haga peticiones desde otro origen (la `web`
  corre en `http://localhost:5173` y la API en `:3000`; **CORS** es el mecanismo del navegador que
  regula estos cruces de origen). En producción se restringirá a tu dominio.
- `app.useGlobalPipes(new ValidationPipe({ whitelist: true, ... }))`: valida **todas** las rutas.
  - `whitelist: true` **elimina** del body cualquier campo que no esté definido en el DTO
    (seguridad: nadie te puede mandar datos basura).
  - `transform: true` convierte los tipos (ej. strings de JSON → números/decimales).
- `app.setGlobalPrefix('api')`: todas las rutas quedan bajo `/api/...` (lea la variable de entorno).
- `app.useStaticAssets(...)`: cuando el driver de fotos es `local`, sirve la carpeta `uploads/`
  estáticamente (`/uploads/foto.jpg`) para poder mostrar las imágenes en el navegador.

> **Concepto a repasar:** qué es CORS, por qué importa, qué es un middleware que aplica a todas las
> rutas.

### 4.3 Módulo raíz y guards globales

**Archivo:** [`apps/api/src/app.module.ts`](../apps/api/src/app.module.ts)

```ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]
```

- `APP_GUARD` registra los guards **de forma global**: todas las rutas requieren token JWT por
  defecto. Esto es lo contrario a "proteger cada ruta": la **seguridad por defecto** es exigir
  login, y solo se "abre" lo necesario.
- La ruta de login se exime con `@Public()` (ver 4.5).

### 4.4 Prisma — el acceso a la base de datos

Prisma es el **ORM** (Object-Relational Mapping): en vez de escribir SQL a mano, defines el
modelo de datos y Prisma genera un **cliente TypeScript con seguridad de tipos**.

**Consta de tres piezas:**

1. **Schema** — [`prisma/schema.prisma`](../apps/api/prisma/schema.prisma):
   - Define los **modelos** (tablas): `Usuario`, `Establecimiento`, `Cliente`, `Pedido`, `Item`,
     `Foto`, `HistorialEstado`, etc.
   - Define los **tipos nativos** (@id, @unique, Decimal, DateTime).
   - Define las **relaciones**: por ejemplo `Pedido` tiene `clienteId` que apunta a `Cliente`
     (relación muchos-a-uno), y `items Item[]` (uno-a-muchos).
   - Define los **enums** (valores fijos): `Rol`, `EstadoPedido`, `TipoItem`, `CategoriaTenis`...
     Tipificar los valores de negocio evita errores de tipeo.

2. **Cliente generado** — cada vez que cambias el schema ejecutas `npx prisma generate`, que
   produce un cliente en `node_modules/@prisma/client` con métodos tipados:
   ```ts
   this.prisma.pedido.findMany({ where: { estado }, include: { cliente: true } })
   ```
   Si escribes mal una columna, **TypeScript lo marca en compilación** (error antes de correr).

3. **Migraciones** — `npx prisma migrate dev` compara el schema con la BD y genera un archivo SQL
   (`prisma/migrations/.../migration.sql`). Así la base de datos "evoluciona" de forma
   controlada y reproducible en cualquier máquina.

**Cómo se conecta:** [`prisma.service.ts`](../apps/api/src/prisma/prisma.service.ts) extiende
`PrismaClient` y `onModuleInit()` abre la conexión al arrancar. Se expone globalmente por el
`PrismaModule`, por eso todos los servicios usan `this.prisma` sin importarlo.

> **Conceptos a repasar:** SQL vs ORM, transacciones, relaciones uno-a-muchos / muchos-a-muchos,
> lo que es una migración.

**Detalles del schema que debes entender:**
- `@@map("pedidos")` — el nombre de la tabla real en BD (la clase se llama `Pedido`).
- `Decimal` — para dinero (nunca `float` para dinero, pierde precisión).
- `@onDelete(Cascade)` — si borras un pedido, se borran sus items y fotos.
- `TransportePedido` — tabla **intermedia** de relación muchos-a-muchos
  (un transporte recoge muchos pedidos; un pedido puede ir en un transporte).

### 4.5 Autenticación con JWT + Passport

**Idea del JWT (JSON Web Token):** en vez de guardar "sesiones" en el servidor, el servidor
**firma** un token con el que demuestra que el usuario está autenticado. Se envía como
`Bearer <token>` en cada request.

**Piezas y su papel:**

| Archivo | Papel |
|---------|-------|
| `auth.service.ts` | Verifica credenciales (`bcrypt.compare`), crea el token (`jwt.sign`), devuelve usuario "sanitizado" (sin el hash de la contraseña) |
| `jwt.strategy.ts` | **Passport Strategy**: lee el token del header, lo valida con la clave secreta y construye `req.user` |
| `jwt-auth.guard.ts` | Usa esa estrategia; al ser global, exige token en todo menos `@Public()` |
| `roles.guard.ts` | Lee los roles permitidos por ruta (metadatos de `@Roles()`) y compara con `req.user.rol` |
| `roles.decorator.ts` | `@Roles(Rol.ADMIN)` agrega metadatos a la ruta |
| `public.decorator.ts` | `@Public()` marca rutas que no necesitan token (ej: login) |
| `current-user.decorator.ts` | `@CurrentUser()` extrae `req.user` del request para usarlo en el controller |
| `login.dto.ts` | Valida el cuerpo del login (email válido, contraseña largo suficiente) |

**Flujo del login:**
1. La web manda `POST /auth/login { email, password }`.
2. `auth.service.login()` busca el usuario por email, compara la contraseña con `bcrypt.compare`
   (compárate hashes, nunca contraseñas en texto plano).
3. Si coincide, firma un JWT con el payload del usuario y lo devuelve.
4. La web guarda el token y lo reenvía en cada request.

**Cómo funciona un guard en NestJS (puntos clave):**
- `canActivate()` retorna `true` (deja pasar) o `false` (bloquea con 403).
- `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de módulo aplica ambos; el orden importa:
  primero autenticar (¿quién eres?), luego autorizar (¿tiene permiso?).
- Los guards **globales** se ejecutan siempre; los **locales** solo en su ruta.

> **Conceptos a repasar:** qué es un hash de contraseña y por qué `bcrypt` (salt, cost factor),
> cómo funciona la firma HMAC del JWT, header `Authorization`.

### 4.6 Establecimientos y Usuarios (CRUD clásico)

Estos dos módulos muestran el **patrón CRUD** (Create, Read, Update, Delete) típico:

- `*.controller.ts` — expone rutas REST:
  - `GET /establecimientos` → listar
  - `POST /establecimientos` → crear
  - `PATCH /establecimientos/:id` → actualizar parcial
  - `DELETE /establecimientos/:id` → eliminar
- `*.service.ts` — lógica con Prisma. En vez de borrar de verdad, hacen **baja lógica**
  (`activo: false`): el registro se conserva (importante en negocio/auditoría/relaciones).
- `*:id` se lee con el decorador `@Param('id')`.

**Por qué la ruta `PATCH` y no `PUT`:** `PATCH` actualiza solo lo que llega (parcial); `PUT`
sustituye el recurso completo. `PartialType` en el DTO de actualización hace que todos los campos
sean opcionales.

### 4.7 Storage de fotos — patrón de "driver" intercambiable

**Archivos:** [`storage.service.ts`](../apps/api/src/storage/storage.service.ts) y `storage.controller.ts`.

- El controller define `POST /storage/upload` (multipart/form-data) protegida para
  `DESPACHADOR` y `ADMIN`, y se vale de `@UseInterceptors(FileInterceptor('file'))` para recibir
  el archivo (multiparte) como un objeto `{ buffer, originalname, mimetype }`.
- El service implementa **dos "drivers"**: `local` (guarda en `uploads/` y devuelve una URL del
  propio servidor) y `gcs` (Google Cloud Storage). Se elige con la variable `UPLOAD_DRIVER`.

El `StorageService` se puede usar así porque en `StorageModule` está en `providers` y
`exports` (para que otros módulos lo usen).

> **Concepto a repasar:** qué es un upload multipart, qué es un "patrón de provider" y cómo
> aislar dependencias externas (si mañana cambiamos a S3, solo toca esta clase).

### 4.8 Pedidos — el corazón del negocio

**Archivo más importante:** [`pedidos.service.ts`](../apps/api/src/pedidos/pedidos.service.ts)

**4.8.1 Crear un pedido (`crear()`) — qué sucede paso a paso:**

1. **Valida** que haya al menos un item (regla de negocio; `BadRequestException` 400).
2. **Determina el establecimiento**: si el DTO no lo trae, usa el del usuario logueado
   (`usuario.establecimientoId`). Un despachador solo puede emitir notas de SU local.
3. **Cliente**: `prisma.cliente.upsert` — si ya existe el teléfono, actualiza el nombre;
   si no, lo crea. (`upsert` = "inserta o actualiza en una sola operación").
4. **Calcula subtotal** sumando el costo de los items.
5. **Genera folio**: consulta el último folio del año y le suma 1 → `IL-2026-1001`.
6. **Todo dentro de una transacción** (`prisma.$transaction`): crea pedido + items + fotos +
   historial. Si algo falla a la mitad, **todo se revierte** (nada de pedidos "a medias").

**4.8.2 Fotos por artículo:**
- El frontend **primero sube las fotos** a `/storage/upload` y recibe URLs.
- Luego `POST /pedidos` llega con arrays de URLs. El servicio mapea la posición del array al tipo
  de ángulo (`Angulo_1`..`Angulo_4`) y crea registros `Foto` ligados al `Item`.
- Las fotos "generales" (todos los pares + la nota) se guardan con `itemId: null`.

**4.8.3 Folio y QR:**
- El folio `IL-<año>-<secuencia>` se genera consultando el mayor folio existente.
- `qrRef` guarda un identificador único (UUID) que **en la Fase 2** se codificará como QR en la
  nota para trazabilidad (buscar/scannear el pedido).

**4.8.4 Máquina de estados (`cambiarEstado()`):**

Los pedidos avanzan por estados definidos; las transiciones **no permitidas** se rechazan:

```
NUEVO ──▶ EN_TRANSPORTE ──▶ EN_LAVADO ──▶ TERMINADO ──▶ ENTREGADO
  │                │              │             │
 transportista   admin         admin       admin/despachador
```

- Se define una tabla `TRANSICIONES` en el servicio: `{ destino, roles permitidos }`.
- `transicion.destino !== estado` → 400 (transición inválida).
- `!roles.includes(usuario.rol)` → 403 (rol sin permiso).
- Cada cambio se registra en `HistorialEstado` (auditoría: quién y cuándo).
- El estado `ENTREGADO` es terminal (no hay destinos válidos).

> **Conceptos a repasar:** transacciones de BD (ACID), máquina de estados, `upsert`,
> auditoría con un historial.

### 4.9 DTOs y validación (contratos de entrada)

**Qué es un DTO (Data Transfer Object):** una clase que describe **qué forma deben tener los
datos** que entran a la API. `class-validator` lee los decorators de cada propiedad al pasar por
el `ValidationPipe`.

```ts
@IsOptional() @MinLength(1) talla?: string;   // opcional
@IsNumber({ maxDecimalPlaces: 2 }) @Min(0) costo!: number;  // dinero válido
@IsEnum(TipoItem) tipo!: TipoItem;            // solo valores del enum
@ValidateNested() @Type(() => ClienteDto) cliente!: ClienteDto; // objetos anidados
```

- `class-transformer` (`@Type`) convierte el JSON plano a **instancias de clase**, lo que permite
  validar objetos anidados (un pedido contiene items que contienen fotos).
- Si la validación falla, el `ValidationPipe` devuelve `400 Bad Request` con la lista de errores.

> **Concepto a repasar:** por qué validar en el servidor (nunca confiar en el frontend),
> diferencia entre validación de forma vs. de lógica.

---

## 5. Frontend (React + Vite) — explicado por piezas

### 5.1 Vite + React + TypeScript

- **Vite** es el "build tool": sirve el código en desarrollo con **Hot Module Replacement**
  (recargas instantáneas al guardar) y produce el paquete de producción (archivos estáticos en
  `dist/`).
- **React** es la librería de UI declarativa: describes **cómo se ve la interfaz según el estado**
  (`const [x, setX] = useState(...)`) y React se encarga de actualizar el DOM.
- **TypeScript** da tipos a todo (`interface Pedido`, `Rol`, etc. en `lib/types.ts`).

### 5.2 Tailwind CSS v4

- **Tailwind** es un framework CSS "utility-first": escribes clases como `bg-white`, `px-4`,
  `rounded-lg` directamente en el HTML/JSX, sin escribir hojas CSS a mano.
- En la v4 se activa con el plugin de Vite (`@tailwindcss/vite`) y un solo `@import "tailwindcss"`
  en [`src/index.css`](../apps/web/src/index.css).
- Como las clases se usan en el JSX, solo se incluyen en el CSS final las que realmente se
  utilizan (`tailwind scrapea los archivos`).

> **Concepto a repasar:** CSS modules vs Tailwind vs librerías de componentes; de qué depende
> el tamaño del CSS final.

### 5.3 PWA (Progressive Web App)

**Config:** [`vite.config.ts`](../apps/web/vite.config.ts) con `VitePWA`.

Una PWA es una web que se puede **instalar** en la tablet y funciona bajo ciertas condiciones sin
conexión. Se compone de:

| Pieza | Qué es |
|-------|--------|
| **Manifest** (`manifest.webmanifest`) | Metadatos para "instalarla": nombre, iconos, color, modo `standalone` (se ve como app nativa, sin barra del navegador) |
| **Service Worker** (`sw.js`) | Un "proxy" entre el navegador y la red; en desarrollo `registerSW()` lo instala y actualiza (`autoUpdate`) |
| **Precache de workbox** | Guarda en caché los archivos del frontend para que cargue rápido y offline |

`registerSW` se llama en [`src/main.tsx`](../apps/web/src/main.tsx). En la **Fase 4** se hará
offline **de datos** (los pedidos se guardan localmente y sincronizan); hoy es offline del
"shell" (la app abre aunque no haya señal).

> **Conceptos a repasar:** qué es un service worker, qué es el caché, qué es el "app shell".

### 5.4 React Router + Protección de rutas

**Archivos:** [`App.tsx`](../apps/web/src/App.tsx), `components/ProtectedRoute.tsx`, `Layout.tsx`.

- `<BrowserRouter>` implementa el enrutamiento: cada `<Route path="...">` renderiza una página.
- `ProtectedRoute` controla el acceso:
  1. Si aún se está validando el token (`cargando`) → spinner.
  2. Si no hay usuario → `<Navigate to="/login">`.
  3. Si la página exige rol y no lo cumple → redirecciona a `/`.
- `Layout` es la "cáscara" común: barra superior con logo, navegación (filtrada **según el rol**
  del usuario) y botón de salir. Las páginas se renderizan dentro de `<main>`.

### 5.5 Contexto de autenticación (`lib/auth.tsx`)

React **Context** permite compartir estado entre componentes sin pasarlo por props.

```tsx
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  ...
  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

Qué hace cada parte:
- `AuthProvider` envuelve toda la app (en `App.tsx`). Cualquier componente puede llamar a
  `useAuth()` y obtener `usuario`, `login`, `logout` sin props.
- Al montarse, `useEffect` revisa si hay token en `localStorage` y llama a `/auth/perfil` para
  reconstruir la sesión al recargar la página.
- `useAuth` es un **custom hook** que envuelve `useContext` para que el consumo sea ergonómico.

> **Conceptos a repasar:** `useState`, `useEffect`, `Context API`, custom hooks; de dónde viene
> ese famoso `throw new Error` del contexto (evita que el hook se use fuera del provider).

### 5.6 Cliente HTTP (`lib/api.ts`)

Un único `fetch` envuelto para no repetir la lógica del token en cada página:

```ts
async function request<T>(path, options) {
  // 1. Construye headers (token como Bearer si existe)
  // 2. fetch(BASE + path, ...)
  // 3. Si la respuesta NO es ok:
  //    - intenta leer el mensaje de error (Puede ser array del ValidationPipe)
  //    - si es 401, limpia la sesión
  //    - lanza ApiError
  // 4. Devuelve el JSON parseado con tipo T
}
```

- `get/post/patch/del` son atajos con el método HTTP correspondiente.
- `subirFoto(file)` usa `FormData` con `multipart/form-data` (distinto de JSON) para subir el
  archivo y devuelve la URL asignada.
- La URL base viene de `import.meta.env.VITE_API_URL` (variables de entorno de Vite, ver §7).

> **Concepto a repasar:** diferencia entre `Content-Type: application/json` y `multipart/form-data`.

### 5.7 Tipos compartidos (`lib/types.ts`)

Como el frontend y el backend hablan JSON, este archivo **replica** las estructuras de las entidades
pero del lado del navegador:

```ts
export type Rol = 'DESPACHADOR' | 'TRANSPORTISTA' | 'ADMIN';
export type EstadoPedido = 'NUEVO' | 'EN_TRANSPORTE' | 'EN_LAVADO' | 'TERMINADO' | 'ENTREGADO';
export interface Pedido { folio: string; estado: EstadoPedido; ... }
```

Los **enums duplicados** del schema de Prisma sirven al editor (autocompletado y errores de
tipado) y a los catálagos de la UI (p.ej. `ESTADOS` mapea código → etiqueta en español para usar
en badges y selects).

### 5.8 Las páginas

#### `Login.tsx`
- Formulario controlado: cada campo está ligado a un estado (`value={email}`
  `onChange={(e) => setEmail(...)}`).
- Al enviar llama a `login()` del contexto; al fallar muestra el mensaje y si es 401 traduce a
  "Credenciales inválidas".
- Si ya hay sesión, redirige a `/` (`<Navigate>`).

#### `Pedidos.tsx` (listado)
- `useEffect` re-ejecuta la búsqueda al cambiar cualquier filtro (con **debounce** de 250 ms para
  no disparar una petición por cada tecla).
- Construye los query params de búsqueda: `GET /pedidos?estado=&establecimientoId=&q=&desde=&hasta=`.
- Renderiza una **tabla** con folio, cliente, local, total, estado (badge con color según estado)
  y fecha. Cada folio es un `<Link>` al detalle.

#### `NuevoPedido.tsx` (wizard de 3 pasos)
La pantalla más compleja. Ideas clave:

- **Paso interno** (`paso = 0 | 1 | 2`): muestra una sección a la vez; botones "Continuar" /
  "Atrás".
- **Estado:** `items` es un array de `ItemBorrador`. Cada item tiene `temporalKey` (clave de React);
  al agregar/quitar items React necesita claves **estables y únicas** para listas.
- **Captura de fotos** con `input type="file" accept="image/*" capture="environment"`:
  `capture` le dice al navegador que abra la **cámara** directamente (ideal en tablet).
  - Se guarda el `File` y un **preview** con `URL.createObjectURL(file)` (una URL temporal solo en
    memoria del navegador para mostrar la miniatura).
- **Guardar:** primero `subirFoto()` de cada slot que tenga archivo (secuencial), recoge las URLs,
  calcula el payload y hace `POST /pedidos`. Muestra el folio creado.

> **Conceptos a repasar:** formularios controlados, claves en listas (`key`), `URL.createObjectURL`,
> debounce, promesas en serie (`for...of`) vs en paralelo (`Promise.all`).

#### `DetallePedido.tsx`
- Carga el pedido y muestra cliente, resumen (subtotal/descuento/total), artículos con sus fotos
  (enlace a pantalla completa), y una **línea de tiempo** del historial.
- Botón de transición de estado: según el **rol** y el estado actual calcula el "próximo paso".
  Refleja la misma lógica de `TRANSICIONES` del backend (el servidor es quien valida de verdad).

#### `Establecimientos.tsx` / `Usuarios.tsx` (solo ADMIN)
- Formulario para crear + tabla para gestionar. Siguen el mismo patrón "traer con `get`, crear con
  `post`, desactivar con `del`" y recargan la lista tras cada operación.

### 5.9 Estilo de componentes

Todas las páginas reutilizan clases de Tailwind con el mismo "lenguaje visual":
`rounded-2xl border bg-white p-5`, inputs con `rounded-lg border-gray-300`, botones primarios
`bg-indigo-600`, etc. No hay librería de componentes externa: se compone con Tailwind directamente.

---

## 6. Variables de entorno (configuración por ambiente)

Las variables llegan al servidor y a la web de forma diferente:

| Dónde | Cómo se lee | Archivo de referencia |
|-------|-------------|------------------------|
| **Backend (NestJS)** | `process.env.X` mediante `ConfigService` | `.env` → `ConfigModule.forRoot()` en `app.module.ts` |
| **Frontend (Vite)** | `import.meta.env.VITE_X` (solo las que empiezan con `VITE_`) | `.env` en `apps/web` |

```ts
// backend: inyecta el ConfigService y lee la variable
constructor(private readonly config: ConfigService) {
  this.driver = config.get('UPLOAD_DRIVER') ?? 'local';
}
```

```ts
// frontend: Vite embebe la variable en el bundle de forma estática
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
```

| Variable | Dónde | Para qué |
|----------|-------|----------|
| `DATABASE_URL` | api | Conexión a PostgreSQL |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | api | Firma y vida del token |
| `API_PREFIX` | api | Prefijo `/api` |
| `UPLOAD_DRIVER` / `UPLOAD_DIR` | api | `local` o `gcs`; carpeta |
| `PUBLIC_BASE_URL` | api | Para construir URLs absolutas de fotos |
| `GCS_BUCKET` / `GCS_KEYFILE` | api | Google Cloud Storage (solo sí UPLOAD_DRIVER=gcs) |
| `VITE_API_URL` | web | Base de la API que llamará el navegador |

> **Seguridad:** `.env` está en `.gitignore` (no se sube al repo). Se versiona `.env.example` con
> valores de muestra. **Nunca** comprometas `JWT_SECRET` ni credenciales.

---

## 7. Comandos de uso diario

```bash
# Desde la raíz del proyecto
npm run dev:api     # backend en modo watch (http://localhost:3000)
npm run dev:web     # frontend con hot-reload (http://localhost:5173)
npm run build       # compile ambos (nest build + tsc/vite build)

# Dentro de apps/api
npm run prisma:migrate   # migra el schema a la BD
npm run seed             # crea datos demo (admin/despachador/transportista)
npm run lint             # oxlint (análisis estático)

# Dentro de apps/web
npm run build            # verificar que compila + genera PWA
```

**BD en local:** se usa docker (`docker run -d --name ishoes-pg ...`). Los datos "demo" (
usuarios y locales) se cargan con el seed.

---

## 8. Conceptos y tecnologías para repasar (checklist de estudio)

Si quieres recuperar la práctica, esto es lo que aparece en cada parte y vale la pena repasar:

1. **Node.js/JS moderno:** promesas (`async/await`), `import/export` (ESM), `??` y `?.`
   (nullish/optional chaining), `map/filter/reduce`.
2. **TypeScript:** tipos e interfaces, enums/unions, `generics` (`function get<T>()`),
   `decorators`.
3. **HTTP / REST:** verbos HTTP, códigos de estado, headers, `multipart/form-data`, JSON.
4. **NestJS:** módulos, controllers, services, DI, guards, pipes, interceptors y DTOs.
5. **Prisma:** esquema, migraciones, `prisma generate`, transacciones, relaciones.
6. **SQL/PostgreSQL:** tablas, claves primarias/foráneas, índice único.
7. **Seguridad:** hashing de contraseñas (bcrypt), JWT, CORS, validación de entrada, inyección SQL
   (Prisma la previene con parámetros) .
8. **React:** hooks (`useState`, `useEffect`), Context, render condicional, listas con `key`,
   formularios controlados, enrutamiento.
9. **PWA:** manifest, service worker, caché, instalación.
10. **CSS moderno:** Tailwind utility-first, responsive con mobile-first.

Sugerencia de cómo usarlo: toma un recurso (p.ej. "cómo firma de un JWT"), léelo una sección del
código que lo usa (`auth.service.ts`), y después prueba cambiando algo pequeño y observa el
comportamiento — es la mejor forma de fijar lo aprendido.

---

## 9. Mapa de lectura recomendado (por rol)

| Interés | Lee en este orden |
|---------|-------------------|
| Empiezo por el backend | `main.ts` → `app.module.ts` → `auth.service.ts` + `jwt.strategy.ts` → `pedidos.service.ts` → `schema.prisma` |
| Quiero entender la app | `main.tsx` → `App.tsx` → `Layout.tsx` → `Pedidos.tsx` → `NuevoPedido.tsx` |
| Quiero entender los datos | `prisma/schema.prisma` → `lib/types.ts` (web) → `fase0-diseno.md` §3 |
| Quiero ver el flujo de negocio | `fase0-diseno.md` → `pedidos.service.ts` → `NuevoPedido.tsx` → `DetallePedido.tsx` |

---

*Documento vivo: conforme avancen las fases (transporte, reportes, offline) se actualizará.*