import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const localUno = await prisma.establecimiento.upsert({
    where: { id: 'est-uno' },
    update: {},
    create: {
      id: 'est-uno',
      nombre: 'Sucursal Centro',
      direccion: 'Av. Juárez 123',
      ciudad: 'GDL',
    },
  });

  const localDos = await prisma.establecimiento.upsert({
    where: { id: 'est-dos' },
    update: {},
    create: {
      id: 'est-dos',
      nombre: 'Sucursal Norte',
      direccion: 'Calzada Independencia 456',
      ciudad: 'GDL',
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@islaundry.app' },
    update: {},
    create: {
      email: 'admin@islaundry.app',
      nombre: 'Administrador',
      passwordHash: await bcrypt.hash('admin123', 10),
      rol: Rol.ADMIN,
    },
  });

  const despachador = await prisma.usuario.upsert({
    where: { email: 'despachador@islaundry.app' },
    update: {},
    create: {
      email: 'despachador@islaundry.app',
      nombre: 'María Gómez',
      telefono: '5558001001',
      passwordHash: await bcrypt.hash('despachador123', 10),
      rol: Rol.DESPACHADOR,
      establecimientoId: localUno.id,
    },
  });

  const transportista = await prisma.usuario.upsert({
    where: { email: 'transportista@islaundry.app' },
    update: {},
    create: {
      email: 'transportista@islaundry.app',
      nombre: 'Pedro Ruiz',
      telefono: '5558002002',
      passwordHash: await bcrypt.hash('transportista123', 10),
      rol: Rol.TRANSPORTISTA,
    },
  });

  console.log('Seed completado:', {
    admin: admin.email,
    despachador: despachador.email,
    transportista: transportista.email,
    locales: [localUno.nombre, localDos.nombre],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });