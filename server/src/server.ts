// Carrega as variáveis do arquivo .env (JWT_SECRET, SMTP_*, etc.) antes de qualquer outra coisa
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
// "randomBytes" gera bytes aleatórios seguros (usado para a senha das clientes cadastradas pela Marcy)
import { randomBytes } from 'crypto';
import { z } from 'zod';
// "Prisma" nos dá os tipos do Prisma (ex.: o tipo da transação e o código de erro P2002)
import { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma';
import {
  WORKDAY_START_MIN,
  WORKDAY_END_MIN,
  SLOT_STEP_MIN,
  timeToMinutes,
  minutesToTime,
  hasTimeOverlap,
  calculateBookingTotals,
  getTodayStr, // NOVO: data de hoje no fuso de Brasília ("YYYY-MM-DD")
  getNowMinutes, // NOVO: minutos desde 00:00 no fuso de Brasília
} from './utils/timeEngine';
import {
  generateToken,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
} from './middlewares/auth';
import { generateAdminWhatsAppMessage, sendAdminEmailNotification } from './utils/notifications';

const app = express();

// CORS: em produção, defina CORS_ORIGIN no .env (ex.: https://marcyb.com.br).
// Pode ter mais de um endereço separado por vírgula. Sem a variável (modo dev), libera qualquer origem.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json());

// ============================================================================
// FUNÇÕES AUXILIARES (usadas por várias rotas)
// ============================================================================

// Tipo do "cliente de banco" aceito pelas funções auxiliares: funciona tanto dentro
// de uma transação (tx) quanto com o prisma normal.
type Db = Prisma.TransactionClient;

// Mensagem padrão devolvida quando o horário já está ocupado
const CONFLICT_MESSAGE =
  'Este horário acabou de ser ocupado ou conflita com a duração de outro atendimento. Por favor, selecione outro horário livre.';

// Envolve uma rota "async" para que qualquer erro não tratado caia no tratador global
// (lá no final do arquivo) em vez de deixar a requisição pendurada para sempre.
const asyncHandler =
  (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Valida um horário no formato "HH:MM" (00:00 até 23:59). O regex antigo aceitava "99:99".
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve ser HH:MM');

// Converte "DD/MM/YYYY" para "YYYY-MM-DD" (se já estiver no formato certo, devolve igual)
function normalizeDate(date: string): string {
  if (date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return date;
}

// Valida a data: aceita "YYYY-MM-DD" ou "DD/MM/YYYY" e SEMPRE entrega "YYYY-MM-DD" para o resto do código
const dateSchema = z
  .string()
  .transform(normalizeDate)
  .refine((d) => /^\d{4}-\d{2}-\d{2}$/.test(d), 'Formato de data inválido (use YYYY-MM-DD)');

// Devolve só os dados públicos do usuário (nunca o passwordHash!)
function toPublicUser(user: { id: string; name: string; email: string; phone: string; role: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

// Verifica se o intervalo [startMinutes, endMinutes] colide com algum agendamento ativo
// ou com algum bloqueio de agenda naquele dia. Se colidir, lança 'CONFLICT_DETECTED'.
// "ignoreAppointmentId" serve para reconfirmar um agendamento sem ele conflitar consigo mesmo.
async function assertNoConflict(
  db: Db,
  date: string,
  startMinutes: number,
  endMinutes: number,
  ignoreAppointmentId?: string
) {
  const conflictingAppointment = await db.appointment.findFirst({
    where: {
      date,
      status: { in: ['PENDING_APPROVAL', 'CONFIRMED'] },
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      AND: [{ startMinutes: { lt: endMinutes } }, { endMinutes: { gt: startMinutes } }],
    },
  });
  if (conflictingAppointment) throw new Error('CONFLICT_DETECTED');

  const conflictingBlock = await db.scheduleBlock.findFirst({
    where: {
      date,
      AND: [{ startMinutes: { lt: endMinutes } }, { endMinutes: { gt: startMinutes } }],
    },
  });
  if (conflictingBlock) throw new Error('CONFLICT_DETECTED');
}

// ============================================================================
// 1. Rota de Teste / Saúde da API
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    studio: 'MarcyB. Braids — Campo Grande, RJ',
    rules: {
      depositPercentage: '50%',
      blowoutFee: 40.0,
      toleranceMinutes: 15,
      lateFeeUpTo20Min: 30.0,
    },
  });
});

// ============================================================================
// 2. Catálogo (Categorias + Modelos de Trança)
// ============================================================================
app.get('/api/catalog', async (req, res) => {
  try {
    const { categorySlug, search } = req.query;

    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
    });

    const services = await prisma.service.findMany({
      where: {
        ...(categorySlug && categorySlug !== 'all'
          ? { category: { slug: String(categorySlug) } }
          : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: String(search) } },
                { description: { contains: String(search) } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { basePrice: 'asc' },
    });

    res.json({ categories, services });
  } catch (error) {
    console.error('Erro na rota /api/catalog:', error);
    res.status(500).json({ error: 'Erro interno ao carregar o catálogo.' });
  }
});

// ============================================================================
// 3. Autenticação: Login e Registro de Clientes
// ============================================================================
app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(4),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Preencha um e-mail válido e a sua senha.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    // Comparamos a senha mesmo quando o usuário não existe e devolvemos a MESMA mensagem
    // nos dois casos. Assim ninguém descobre quais e-mails estão cadastrados.
    const validPassword = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;

    if (!user || !validPassword) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  })
);

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2, 'Informe o seu nome'),
      email: z.string().email('E-mail inválido'),
      phone: z.string().min(10, 'Informe o seu WhatsApp com DDD'),
      password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos no registro.', issues: parsed.error.flatten() });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      res.status(409).json({ error: 'Este e-mail já está registrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          passwordHash,
          role: 'CLIENT',
        },
      });

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      res.status(201).json({ token, user: toPublicUser(user) });
    } catch (err) {
      // P2002 = violação de campo único. Acontece se dois cadastros com o mesmo e-mail
      // passarem pelo "findUnique" acima ao mesmo tempo.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        res.status(409).json({ error: 'Este e-mail já está registrado.' });
        return;
      }
      throw err; // qualquer outro erro vai para o tratador global
    }
  })
);

// ============================================================================
// 4. Motor de Disponibilidade (calcula horários livres e bloqueia os passados só se for HOJE)
// ============================================================================
app.get(
  '/api/availability',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data deve ser YYYY-MM-DD'),
      serviceId: z.string().min(1),
      includeBlowout: z.enum(['true', 'false']).optional().default('false'),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parâmetros inválidos para consulta de horários.' });
      return;
    }

    const { date, serviceId, includeBlowout } = parsed.data;
    const isBlowout = includeBlowout === 'true';

    // CORRIGIDO: "hoje" agora é calculado no fuso de Brasília (antes usava UTC e virava o dia às 21h)
    const todayDateStr = getTodayStr();
    if (date < todayDateStr) {
      res.status(400).json({ error: 'Não é possível consultar horários para datas que já passaram.' });
      return;
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      res.status(404).json({ error: 'Modelo de trança não encontrado.' });
      return;
    }

    const totals = calculateBookingTotals(service.basePrice, service.durationMin, isBlowout);

    // Agendamentos ativos do dia (cancelados não ocupam horário)
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        date,
        status: { in: ['PENDING_APPROVAL', 'CONFIRMED'] },
      },
      select: {
        startMinutes: true,
        endMinutes: true,
      },
    });

    // Bloqueios da Marcy (folgas, almoço, etc.)
    const blocks = await prisma.scheduleBlock.findMany({
      where: { date },
    });

    // Só cortamos horários passados se a data consultada for HOJE
    const isToday = date === todayDateStr;
    const currentMinutes = getNowMinutes(); // CORRIGIDO: hora de Brasília, não a do servidor

    const slots: {
      startTime: string;
      endTime: string;
      available: boolean;
    }[] = [];

    // Percorre o expediente de 30 em 30 min, testando se o serviço inteiro cabe em cada início possível
    for (
      let candidateStart = WORKDAY_START_MIN;
      candidateStart + totals.totalDuration <= WORKDAY_END_MIN;
      candidateStart += SLOT_STEP_MIN
    ) {
      const candidateEnd = candidateStart + totals.totalDuration;

      const isPastSlot = isToday && candidateStart <= currentMinutes;

      const conflictWithAppointment = activeAppointments.some((appt) =>
        hasTimeOverlap(candidateStart, candidateEnd, appt.startMinutes, appt.endMinutes)
      );

      const conflictWithBlock = blocks.some((b) =>
        hasTimeOverlap(candidateStart, candidateEnd, b.startMinutes, b.endMinutes)
      );

      slots.push({
        startTime: minutesToTime(candidateStart),
        endTime: minutesToTime(candidateEnd),
        available: !isPastSlot && !conflictWithAppointment && !conflictWithBlock,
      });
    }

    res.json({
      date,
      serviceTitle: service.title,
      includeBlowout: isBlowout,
      ...totals,
      slots,
    });
  })
);

// ============================================================================
// 5. Criar Agendamento (trava atômica anti-conflito + anti-passado)
// ============================================================================
app.post('/api/appointments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    serviceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: timeSchema,
    includeBlowout: z.boolean().default(false),
    braidLength: z.string().default('Cintura'),
    jumboColor: z.string().default('Preto Natural (1B)'),
    clientNotes: z.string().max(500).optional(), // limite evita textos gigantes
    acceptedRules: z.literal(true, {
      errorMap: () => ({
        message: 'É obrigatório aceitar as regras de preparo do cabelo e tolerância de 15 min.',
      }),
    }),
    paymentMethod: z.enum(['WHATSAPP_REQUEST', 'MERCADO_PAGO']).default('WHATSAPP_REQUEST'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Verifique os dados do agendamento.',
      issues: parsed.error.flatten(),
    });
    return;
  }

  const {
    serviceId,
    date,
    startTime,
    includeBlowout,
    braidLength,
    jumboColor,
    clientNotes,
    acceptedRules,
    paymentMethod,
  } = parsed.data;

  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      res.status(404).json({ error: 'Modelo de trança não encontrado.' });
      return;
    }

    const totals = calculateBookingTotals(service.basePrice, service.durationMin, includeBlowout);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totals.totalDuration;
    const endTime = minutesToTime(endMinutes);

    // CORRIGIDO: data e hora atuais no fuso de Brasília
    const todayDateStr = getTodayStr();
    const currentMinutes = getNowMinutes();

    if (date < todayDateStr) {
      res.status(400).json({ error: 'Não é possível realizar agendamentos para datas que já passaram.' });
      return;
    }

    if (date === todayDateStr && startMinutes <= currentMinutes) {
      res.status(400).json({
        error: 'Não é possível realizar agendamentos para horários que já passaram no dia de hoje.',
      });
      return;
    }

    if (startMinutes < WORKDAY_START_MIN || endMinutes > WORKDAY_END_MIN) {
      res.status(400).json({
        error: 'Este horário ultrapassa o expediente do estúdio. Escolha um horário mais cedo.',
      });
      return;
    }

    // A verificação de conflito e a criação acontecem na MESMA transação,
    // para duas clientes não pegarem o mesmo horário ao mesmo tempo.
    const createdAppointment = await prisma.$transaction(async (tx) => {
      await assertNoConflict(tx, date, startMinutes, endMinutes);

      return tx.appointment.create({
        data: {
          userId: req.user!.id,
          serviceId: service.id,
          date,
          startTime,
          endTime,
          startMinutes,
          endMinutes,
          totalDuration: totals.totalDuration,
          includeBlowout,
          blowoutPrice: totals.blowoutPrice,
          braidLength,
          jumboColor,
          clientNotes,
          totalPrice: totals.totalPrice,
          depositAmount: totals.depositAmount,
          acceptedRules,
          paymentMethod,
          status: 'PENDING_APPROVAL',
        },
        include: {
          service: { include: { category: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    });

    // Dados usados no link do WhatsApp e no e-mail para a Marcy
    const notificationData = {
      clientName: createdAppointment.user.name,
      clientPhone: createdAppointment.user.phone,
      clientEmail: createdAppointment.user.email,
      serviceTitle: createdAppointment.service.title,
      date: createdAppointment.date,
      startTime: createdAppointment.startTime,
      endTime: createdAppointment.endTime,
      totalPrice: createdAppointment.totalPrice,
      depositAmount: createdAppointment.depositAmount,
      includeBlowout: createdAppointment.includeBlowout,
      braidLength: createdAppointment.braidLength,
      jumboColor: createdAppointment.jumboColor,
      clientNotes: createdAppointment.clientNotes || undefined,
    };

    const whatsappUrl = generateAdminWhatsAppMessage(notificationData);

    // Sem "await" de propósito: o e-mail demora 1-2 s e não deve atrasar a resposta da cliente.
    // A função já tem try/catch interno, então não gera erro não tratado.
    void sendAdminEmailNotification(notificationData);

    res.status(201).json({
      message: 'Solicitação de agendamento criada com sucesso!',
      appointment: createdAppointment,
      whatsappUrl,
    });
  } catch (err: any) {
    if (err.message === 'CONFLICT_DETECTED') {
      res.status(409).json({ error: CONFLICT_MESSAGE });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao gravar o agendamento.' });
  }
});

// ============================================================================
// 6. Listar Agendamentos da Cliente Logada
// ============================================================================
app.get(
  '/api/appointments/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user!.id },
      include: {
        service: { include: { category: true } },
      },
      orderBy: [{ date: 'desc' }, { startMinutes: 'asc' }],
    });

    res.json({ appointments });
  })
);

// ============================================================================
// 7. ROTAS ADMINISTRATIVAS (CRUD ADMIN)
// ============================================================================

// 7.1 Listar todos os agendamentos e bloqueios
app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    // Ordena por data e, dentro do mesmo dia, pelo horário de início
    const appointments = await prisma.appointment.findMany({
      include: {
        // "select" evita mandar o passwordHash do cliente para o painel
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        service: true,
      },
      orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
    });

    const blocks = await prisma.scheduleBlock.findMany({
      orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
    });

    res.json({ appointments, blocks });
  } catch (error) {
    console.error('Erro detalhado em /api/admin/overview:', error);
    res.status(500).json({ error: 'Erro ao carregar painel administrativo.' });
  }
});

// 7.2 Atualizar status do agendamento (Confirmar Sinal 50% ou Cancelar)
app.patch('/api/admin/appointments/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const schema = z.object({
      status: z.enum(['PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Status inválido fornecido.' });
      return;
    }

    const { status } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({ where: { id } });
      if (!current) throw new Error('NOT_FOUND');

      // NOVO: se o agendamento vai voltar a ocupar a agenda (confirmar ou reabrir),
      // checamos se o horário continua livre. Evita duplicar um horário que outra cliente
      // pegou depois do cancelamento.
      if (status !== 'CANCELLED') {
        await assertNoConflict(tx, current.date, current.startMinutes, current.endMinutes, current.id);
      }

      return tx.appointment.update({
        where: { id },
        data: { status },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
          service: true,
        },
      });
    });

    res.json({ appointment: updated });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
      return;
    }
    if (error.message === 'CONFLICT_DETECTED') {
      res.status(409).json({
        error: 'Este horário já foi ocupado por outro agendamento ou bloqueio e não pode ser reativado.',
      });
      return;
    }
    console.error('Erro detalhado ao atualizar status do agendamento:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar status do agendamento.' });
  }
});

// 7.3 Excluir um agendamento
app.delete('/api/admin/appointments/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: 'Erro ao excluir agendamento.' });
  }
});

// 7.4 Criar novo Serviço no Catálogo
const serviceSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  basePrice: z.number().positive(),
  durationMin: z.number().int().min(15),
  imageUrl: z.string(),
  categoryId: z.string().min(1),
});

app.post('/api/admin/services', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({
      data,
      include: { category: true },
    });
    res.status(201).json({ service });
  } catch {
    res.status(400).json({ error: 'Dados inválidos para criar serviço.' });
  }
});

// 7.5 Editar Serviço existente
app.put('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json({ service });
  } catch {
    res.status(400).json({ error: 'Erro ao atualizar serviço.' });
  }
});

// 7.6 Excluir Serviço
app.delete('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(400).json({
      error: 'Não é possível excluir um serviço que já possui agendamentos vinculados.',
    });
  }
});

// 7.7 Criar e Excluir Bloqueios de Agenda (Folgas / Horários Indisponíveis)
app.post('/api/admin/blocks', requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      date: dateSchema, // NOVO: valida de verdade e já converte DD/MM/YYYY
      startTime: timeSchema,
      endTime: timeSchema,
      reason: z.string().min(2),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos para bloqueio de agenda.' });
      return;
    }

    const { date, startTime, endTime, reason } = parsed.data;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      res.status(400).json({ error: 'O horário final deve ser maior que o inicial.' });
      return;
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        date,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
        reason,
      },
    });

    res.status(201).json({ block });
  } catch (error) {
    console.error('Erro detalhado ao criar bloqueio:', error);
    res.status(500).json({ error: 'Erro interno ao criar bloqueio na agenda.' });
  }
});

app.delete('/api/admin/blocks/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.scheduleBlock.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: 'Erro ao remover bloqueio.' });
  }
});

// 7.8 Criar Agendamento Manual pela Admin
app.post('/api/appointments/manual', requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      clientName: z.string().min(2),
      clientPhone: z.string().min(8),
      serviceId: z.string().min(1),
      date: dateSchema, // NOVO: validação real da data
      startTime: timeSchema,
      includeBlowout: z.boolean().default(false),
      braidLength: z.string().default('Cintura'),
      jumboColor: z.string().default('Preto Natural (1B)'),
      acceptedRules: z.boolean().default(true),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos para agendamento manual.' });
      return;
    }

    const {
      clientName,
      clientPhone,
      serviceId,
      date,
      startTime,
      includeBlowout,
      braidLength,
      jumboColor,
      acceptedRules,
    } = parsed.data;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      res.status(404).json({ error: 'Serviço não encontrado.' });
      return;
    }

    const totals = calculateBookingTotals(service.basePrice, service.durationMin, includeBlowout);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totals.totalDuration;
    const endTime = minutesToTime(endMinutes);

    // NOVO: a Marcy também respeita o expediente (retire este bloco se quiser permitir encaixes fora do horário)
    if (startMinutes < WORKDAY_START_MIN || endMinutes > WORKDAY_END_MIN) {
      res.status(400).json({
        error: 'Este horário ultrapassa o expediente do estúdio (08h às 20h).',
      });
      return;
    }

    // E-mail "técnico" gerado a partir do telefone, pois clientes presenciais não têm e-mail
    const cleanPhone = clientPhone.replace(/\D/g, '') || String(Date.now());
    const generatedEmail = `cliente_${cleanPhone}@marcyb.com`;

    const appointment = await prisma.$transaction(async (tx) => {
      // NOVO: agendamento manual agora também checa conflito (antes podia duplicar horário)
      await assertNoConflict(tx, date, startMinutes, endMinutes);

      let clientUser = await tx.user.findFirst({
        where: {
          OR: [{ phone: clientPhone }, { email: generatedEmail }],
        },
      });

      if (!clientUser) {
        // CORRIGIDO: senha aleatória e impossível de adivinhar (antes era fixa: 'marcyb2026').
        // A cliente presencial não precisa dela; se um dia quiser entrar, usa "recuperar senha".
        const randomPassword = randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        clientUser = await tx.user.create({
          data: {
            name: clientName,
            email: generatedEmail,
            phone: clientPhone,
            passwordHash,
            role: 'CLIENT',
          },
        });
      }

      return tx.appointment.create({
        data: {
          userId: clientUser.id,
          serviceId: service.id,
          date,
          startTime,
          endTime,
          startMinutes,
          endMinutes,
          totalDuration: totals.totalDuration,
          includeBlowout,
          blowoutPrice: totals.blowoutPrice,
          braidLength,
          jumboColor,
          totalPrice: totals.totalPrice,
          depositAmount: totals.depositAmount,
          acceptedRules,
          paymentMethod: 'WHATSAPP_REQUEST',
          status: 'CONFIRMED',
        },
        include: {
          service: true,
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        },
      });
    });

    res.status(201).json({
      message: 'Agendamento manual criado com sucesso!',
      appointment,
    });
  } catch (err: any) {
    if (err.message === 'CONFLICT_DETECTED') {
      res.status(409).json({ error: CONFLICT_MESSAGE });
      return;
    }
    console.error('Erro detalhado ao criar agendamento manual:', err);
    res.status(500).json({ error: 'Erro interno ao registrar agendamento manual.' });
  }
});

// ============================================================================
// TRATADOR GLOBAL DE ERROS
// Pega qualquer erro lançado dentro de rotas com "asyncHandler" (ou por middlewares)
// e responde 500 em vez de deixar a requisição travada. Precisa ficar DEPOIS de todas as rotas.
// ============================================================================
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
const PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, () => {
  console.log(`🔥 Servidor MarcyB. online em http://localhost:${PORT}`);
});