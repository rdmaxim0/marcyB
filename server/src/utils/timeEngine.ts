// Constantes oficiais das regras de negócio da MarcyB.
export const BLOWOUT_PRICE = 40.0; // R$ 40,00 adicionais pelo preparo (Blowout)
export const BLOWOUT_DURATION_MIN = 30; // +30 minutos na agenda para realizar o Blowout
export const DEPOSIT_PERCENTAGE = 0.5; // 50% de sinal obrigatório para reservar

// Horário de expediente padrão da Marcy (08:00 às 20:00)
export const WORKDAY_START_MIN = 8 * 60; // 08:00 = 480 min
export const WORKDAY_END_MIN = 20 * 60;   // 20:00 = 1200 min
export const SLOT_STEP_MIN = 30;         // Intervalo de 30 em 30 min no mostrador

/**
 * Converte "09:30" para 570 (minutos desde 00:00)
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte 570 (minutos) de volta para "09:30"
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Verifica matematicamente se o intervalo [startA, endA] colide com [startB, endB]
 */
export function hasTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Calcula duração total, preços e sinal de 50% com base no serviço e opção de Blowout
 */
export function calculateBookingTotals(basePrice: number, baseDurationMin: number, includeBlowout: boolean) {
  const blowoutPrice = includeBlowout ? BLOWOUT_PRICE : 0;
  const blowoutDuration = includeBlowout ? BLOWOUT_DURATION_MIN : 0;

  const totalDuration = baseDurationMin + blowoutDuration;
  const totalPrice = Number((basePrice + blowoutPrice).toFixed(2));
  const depositAmount = Number((totalPrice * DEPOSIT_PERCENTAGE).toFixed(2));

  return {
    blowoutPrice,
    totalDuration,
    totalPrice,
    depositAmount,
  };
}

// Fuso horário fixo do estúdio (Campo Grande, RJ).
// Assim "hoje" não muda conforme o fuso do servidor (na nuvem costuma ser UTC).
const STUDIO_TZ = 'America/Sao_Paulo';

// Data de hoje em "YYYY-MM-DD" no horário de Brasília.
// O locale 'en-CA' formata a data exatamente nesse padrão.
export function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Minutos desde 00:00 no horário de Brasília (ex.: 21:30 => 1290).
export function getNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  // "% 24" evita que alguns ambientes devolvam "24" à meia-noite
  const hour = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')!.value);
  return hour * 60 + minute;
}