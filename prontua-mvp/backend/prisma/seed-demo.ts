/**
 * Dados de demonstração para prints (dashboard, pacientes, agenda, financeiro).
 *
 * Uso: npm run seed:demo
 * Login: demo@prontua.app / Demo1234
 */
import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_SLUG = 'clinica-demo';
const DEMO_EMAIL = 'demo@prontua.app';
const DEMO_PASSWORD = 'Demo1234';

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;

interface PacienteSeed {
  nomeCompleto: string;
  email?: string;
  whatsapp: string;
  valorSessao: number;
  frequencia?: string;
  tags?: string[];
}

const PACIENTES: PacienteSeed[] = [
  { nomeCompleto: 'Ana Carolina Ribeiro', email: 'ana.ribeiro@email.com', whatsapp: '+5554999111001', valorSessao: 280, frequencia: 'Semanal', tags: ['TCC'] },
  { nomeCompleto: 'Marcos Henrique Oliveira', email: 'marcos.oliveira@email.com', whatsapp: '+5554999111002', valorSessao: 320, frequencia: 'Quinzenal' },
  { nomeCompleto: 'Juliana Costa Santos', whatsapp: '+5554999111003', valorSessao: 250, frequencia: 'Semanal' },
  { nomeCompleto: 'Rafael Mendes Souza', email: 'rafael.m@email.com', whatsapp: '+5554999111004', valorSessao: 300, frequencia: 'Mensal' },
  { nomeCompleto: 'Beatriz Fonseca Lima', whatsapp: '+5554999111005', valorSessao: 280, frequencia: 'Semanal' },
  { nomeCompleto: 'Camila Duarte Pereira', email: 'camila.duarte@email.com', whatsapp: '+5554999111006', valorSessao: 260 },
  { nomeCompleto: 'Pedro Almeida Nunes', whatsapp: '+5554999111007', valorSessao: 350, frequencia: 'Quinzenal' },
  { nomeCompleto: 'Luiza Martins Cardoso', email: 'luiza.martins@email.com', whatsapp: '+5554999111008', valorSessao: 275, frequencia: 'Semanal' },
];

function hojeAs(hours: number, minutes = 0): Date {
  const data = new Date();
  data.setHours(hours, minutes, 0, 0);
  return data;
}

function diasAtras(dias: number, hours = 10, minutes = 0): Date {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(hours, minutes, 0, 0);
  return data;
}

function inicioMes(mesesAtras: number): Date {
  const data = new Date();
  data.setMonth(data.getMonth() - mesesAtras, 1);
  data.setHours(12, 0, 0, 0);
  return data;
}

async function limparDemoAnterior(): Promise<void> {
  const existente = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (existente) {
    await prisma.tenant.delete({ where: { id: existente.id } });
    console.log('Demo anterior removida.');
  }
}

async function main(): Promise<void> {
  await limparDemoAnterior();

  const tenant = await prisma.tenant.create({
    data: { slug: DEMO_SLUG, name: 'Clínica MindCare' },
  });

  const passwordHash = await argon2.hash(DEMO_PASSWORD, ARGON_OPTIONS);

  const profissional = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Dra. Marina Alves',
      whatsapp: '+5554999282014',
      city: 'Caxias do Sul',
      state: 'RS',
      specialty: 'PSICOLOGIA',
      registry: 'CRP 12/34567',
      emailVerifiedAt: new Date(),
      role: 'OWNER',
    },
  });

  const pacientesCriados = await Promise.all(
    PACIENTES.map((paciente) =>
      prisma.patient.create({
        data: {
          tenantId: tenant.id,
          fullName: paciente.nomeCompleto,
          email: paciente.email,
          whatsapp: paciente.whatsapp,
          sessionValue: new Prisma.Decimal(paciente.valorSessao),
          frequencyTag: paciente.frequencia,
          tags: JSON.stringify(paciente.tags ?? []),
        },
      }),
    ),
  );

  const porNome = (nome: string) => {
    const encontrado = pacientesCriados.find((p) => p.fullName.startsWith(nome.split(' ')[0]!));
    if (!encontrado) throw new Error(`Paciente não encontrado: ${nome}`);
    return encontrado;
  };

  type SessaoSeed = {
    paciente: string;
    quando: Date;
    status: string;
    modo?: string;
    pagamento?: { status: string; metodo?: string; pagoEm?: Date; criadoEm?: Date };
  };

  const sessoes: SessaoSeed[] = [
    // Hoje — agenda do dashboard
    { paciente: 'Ana', quando: hojeAs(8, 0), status: 'CONFIRMED', pagamento: { status: 'PAID', metodo: 'PIX', pagoEm: hojeAs(7, 30) } },
    { paciente: 'Marcos', quando: hojeAs(9, 0), status: 'SCHEDULED', pagamento: { status: 'PENDING' } },
    { paciente: 'Juliana', quando: hojeAs(10, 30), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'PIX', pagoEm: hojeAs(10, 0) } },
    { paciente: 'Rafael', quando: hojeAs(14, 0), status: 'SCHEDULED', modo: 'ONLINE', pagamento: { status: 'PENDING' } },
    { paciente: 'Beatriz', quando: hojeAs(15, 30), status: 'CONFIRMED', pagamento: { status: 'PAID', metodo: 'CARD', pagoEm: diasAtras(0, 8) } },
    { paciente: 'Camila', quando: hojeAs(17, 0), status: 'SCHEDULED', pagamento: { status: 'PENDING' } },
    // Semana
    { paciente: 'Pedro', quando: diasAtras(1, 11), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'PIX', pagoEm: diasAtras(1, 10) } },
    { paciente: 'Luiza', quando: diasAtras(1, 16), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'TRANSFER', pagoEm: diasAtras(1, 15) } },
    { paciente: 'Ana', quando: diasAtras(2, 9), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'PIX', pagoEm: diasAtras(2, 8) } },
    { paciente: 'Marcos', quando: diasAtras(3, 14), status: 'NO_SHOW', pagamento: { status: 'PENDING', criadoEm: diasAtras(35) } },
    { paciente: 'Juliana', quando: diasAtras(4, 10), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'CASH', pagoEm: diasAtras(4, 9) } },
    { paciente: 'Rafael', quando: diasAtras(5, 15), status: 'COMPLETED', pagamento: { status: 'PAID', metodo: 'PIX', pagoEm: diasAtras(5, 14) } },
    // Amanhã
    { paciente: 'Beatriz', quando: diasAtras(-1, 9), status: 'SCHEDULED', pagamento: { status: 'PENDING' } },
    { paciente: 'Camila', quando: diasAtras(-1, 11), status: 'CONFIRMED', pagamento: { status: 'PENDING' } },
  ];

  // Faturamento dos últimos 6 meses (gráfico)
  const faturamentoMensal = [4_200, 5_100, 5_800, 5_400, 6_200, 6_800];
  for (let mesesAtras = 5; mesesAtras >= 0; mesesAtras -= 1) {
    const paciente = pacientesCriados[mesesAtras % pacientesCriados.length]!;
    const valor = faturamentoMensal[5 - mesesAtras]! / 4;
    const dataPagamento = inicioMes(mesesAtras);
    dataPagamento.setDate(15);

    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        patientId: paciente.id,
        amount: new Prisma.Decimal(valor),
        status: 'PAID',
        method: 'PIX',
        paidAt: dataPagamento,
        createdAt: dataPagamento,
      },
    });
  }

  // Pagamentos pendentes extras (aba financeiro)
  const pendentesExtras: Array<{ paciente: string; valor: number; diasAtrasCriacao?: number }> = [
    { paciente: 'Pedro', valor: 350 },
    { paciente: 'Luiza', valor: 275 },
    { paciente: 'Rafael', valor: 300, diasAtrasCriacao: 12 },
  ];

  for (const item of pendentesExtras) {
    const paciente = porNome(item.paciente);
    const criadoEm = item.diasAtrasCriacao ? diasAtras(item.diasAtrasCriacao) : new Date();
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        patientId: paciente.id,
        amount: new Prisma.Decimal(item.valor),
        status: 'PENDING',
        createdAt: criadoEm,
      },
    });
  }

  for (const item of sessoes) {
    const paciente = porNome(item.paciente);
    const valor = Number(paciente.sessionValue);

    const sessao = await prisma.session.create({
      data: {
        tenantId: tenant.id,
        patientId: paciente.id,
        professionalId: profissional.id,
        scheduledAt: item.quando,
        durationMin: 50,
        mode: item.modo ?? 'PRESENCIAL',
        value: new Prisma.Decimal(valor),
        status: item.status,
      },
    });

    if (item.pagamento) {
      const criadoEm = item.pagamento.criadoEm ?? item.quando;
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          patientId: paciente.id,
          sessionId: sessao.id,
          amount: new Prisma.Decimal(valor),
          status: item.pagamento.status,
          method: item.pagamento.metodo,
          paidAt: item.pagamento.pagoEm,
          createdAt: criadoEm,
        },
      });
    }
  }

  console.log('');
  console.log('Demo criada com sucesso.');
  console.log('──────────────────────────────────────');
  console.log(`  E-mail:  ${DEMO_EMAIL}`);
  console.log(`  Senha:   ${DEMO_PASSWORD}`);
  console.log(`  Clínica: ${tenant.name}`);
  console.log(`  Pacientes: ${pacientesCriados.length}`);
  console.log('──────────────────────────────────────');
  console.log('Faça login e acesse painel, pacientes, agenda e financeiro.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
