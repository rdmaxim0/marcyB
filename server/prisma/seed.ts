import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Limpa dados anteriores para evitar conflitos de chave estrangeira
  await prisma.appointment.deleteMany({});
  await prisma.scheduleBlock.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // Categorias
  const catTrancas = await prisma.category.create({
    data: { name: 'Tranças e Estilos', slug: 'trancas-e-estilos', order: 1 },
  });

  const catCuidados = await prisma.category.create({
    data: { name: 'Cuidados e Tratamentos', slug: 'servicos-simples', order: 2 },
  });

  // Serviços com os preços exatos atualizados
  await prisma.service.createMany({
    data: [
      {
        title: 'Nagô Desenhada',
        description: 'Tranças rasteiras coladas ao couro cabeludo com desenhos geométricos e exclusivos.',
        basePrice: 100.0,
        durationMin: 120,
        imageUrl: 'nago',
        categoryId: catTrancas.id,
      },
      {
        title: 'Barrel Twist',
        description: 'Torcidos estruturados com acabamento sofisticado e duradouro.',
        basePrice: 140.0,
        durationMin: 150,
        imageUrl: 'barrel-twist',
        categoryId: catTrancas.id,
      },
      {
        title: 'Twist',
        description: 'Estilo versátil de torcidos com ótimo caimento.',
        basePrice: 160.0,
        durationMin: 180,
        imageUrl: 'twist',
        categoryId: catTrancas.id,
      },
      {
        title: 'Fulani Braids',
        description: 'Estilo autêntico com divisão trabalhada e acessórios exclusivos.',
        basePrice: 250.0,
        durationMin: 270,
        imageUrl: 'fulani',
        categoryId: catTrancas.id,
      },
      {
        title: 'Gypsy Braids',
        description: 'Tranças soltas com mechas cacheadas espalhadas pelo comprimento.',
        basePrice: 270.0,
        durationMin: 330,
        imageUrl: 'gipsy',
        categoryId: catTrancas.id,
      },
      {
        title: 'Knotless Box Braids',
        description: 'Tranças sem nós na raiz, proporcionando máxima leveza e caimento natural.',
        basePrice: 300.0,
        durationMin: 300,
        imageUrl: 'knotless',
        categoryId: catTrancas.id,
      },
      {
        title: 'Box Braids',
        description: 'Tranças clássicas com acabamento impecável e alta durabilidade.',
        basePrice: 350.0,
        durationMin: 360,
        imageUrl: 'box-braids',
        categoryId: catTrancas.id,
      },
      {
        title: 'Lavagem',
        description: 'Higienização profissional do couro cabeludo.',
        basePrice: 20.0,
        durationMin: 20,
        imageUrl: 'lavagem',
        categoryId: catCuidados.id,
      },
      {
        title: 'Hidratação',
        description: 'Tratamento de nutrição e restauração capilar.',
        basePrice: 30.0,
        durationMin: 30,
        imageUrl: 'hidratacao',
        categoryId: catCuidados.id,
      },
      {
        title: 'Finalização Power',
        description: 'Definição avançada de cachos, ondas e pontas.',
        basePrice: 30.0,
        durationMin: 30,
        imageUrl: 'finalizacao',
        categoryId: catCuidados.id,
      },
      {
        title: 'Blowout',
        description: 'Escovação e estiramento prévio dos fios para preparação.',
        basePrice: 40.0,
        durationMin: 30,
        imageUrl: 'blowout',
        categoryId: catCuidados.id,
      },
    ],
  });

  console.log('🌱 Banco semeado com os preços atualizados da MarcyB!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });