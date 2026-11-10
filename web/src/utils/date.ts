// Fuso horário fixo do estúdio (Campo Grande, RJ).
// Assim a data "de hoje" não depende do fuso do navegador nem do servidor.
const STUDIO_TZ = 'America/Sao_Paulo';

// Retorna a data de hoje no formato "YYYY-MM-DD" no horário de Brasília.
// O locale 'en-CA' formata a data exatamente nesse padrão.
export function getTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Retorna quantos minutos já passaram desde 00:00 no horário de Brasília.
// Ex.: 21:30 => 1290
export function getNowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  // "% 24" evita que alguns navegadores devolvam "24" à meia-noite
  const hour = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')!.value);
  return hour * 60 + minute;
}