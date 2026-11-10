// Importa a biblioteca oficial para envio de e-mails no Node.js
import nodemailer from 'nodemailer';

// 1. O "Contrato" (Molde) dos dados que precisamos para notificar a Marcy.
// Removemos o "paymentMethod" pois agora todo agendamento segue o fluxo de WhatsApp!
export interface NotificationPayload {
  clientName: string;      // Nome da cliente (ex: "Dandara Silva")
  clientPhone: string;     // WhatsApp da cliente (ex: "21988887777")
  clientEmail: string;     // E-mail da cliente (para a Marcy ter no registo)
  serviceTitle: string;    // Modelo escolhido (ex: "Fulani Braids")
  date: string;            // Data no formato "YYYY-MM-DD"
  startTime: string;       // Hora de início (ex: "09:00")
  endTime: string;         // Hora de término calculada (ex: "13:00")
  totalPrice: number;      // Valor total estimado (Serviço + Blowout se houver)
  depositAmount: number;   // Valor do sinal de 50% para reserva
  includeBlowout: boolean; // true = pediu Blowout (+R$ 40,00) | false = não pediu
  braidLength: string;     // Comprimento escolhido (ex: "Cintura")
  jumboColor: string;      // Cor da fibra Jumbo (ex: "Preto Natural (1B)")
  clientNotes?: string;    // O "?" indica que este campo é OPCIONAL (pode vir vazio)
}

// 2. Função que gera o link do WhatsApp para a cliente finalizar o sinal de 50% com a Marcy
export function generateAdminWhatsAppMessage(data: NotificationPayload): string {
  // Lê o número do WhatsApp da Marcy do arquivo .env (ou usa o padrão caso não exista)
  const adminPhone = process.env.ADMIN_WHATSAPP || '5521999999999';

  // Monta a mensagem formatada para o WhatsApp (*texto* deixa em negrito no WhatsApp)
  const message = `⏳ *SOLICITAÇÃO DE AGENDAMENTO — MARCYB.*

    Olá, Marcy! Fiz minha pré-reserva pelo site e gostaria de confirmar meu horário mediante o sinal de 50%.

    *Cliente:* ${data.clientName}
    *WhatsApp:* ${data.clientPhone}

    *Modelo Desejado:* ${data.serviceTitle}
    *Data:* ${data.date}
    *Horário reservado:* ${data.startTime} às ${data.endTime}
    *Comprimento:* ${data.braidLength}
    *Cor do Jumbo:* ${data.jumboColor}
    *Blowout (+R$ 40,00):* ${data.includeBlowout ? 'Sim (Incluso)' : 'Não'}
    ${data.clientNotes ? `*Observações:* ${data.clientNotes}\n` : ''}
    *Valor Base Estimado:* R$ ${data.totalPrice.toFixed(2)}
    *Sinal de 50% (Reserva):* R$ ${data.depositAmount.toFixed(2)}

    Estou ciente das regras de cabelo lavado/sem creme e da tolerância de 15 min de atraso.`;

  // Converte espaços e quebras de linha para caracteres seguros de URL (%20, %0A)
  const encodedMessage = encodeURIComponent(message);

  // Retorna o link completo que abre direto na conversa da Marcy
  return `https://wa.me/${adminPhone}?text=${encodedMessage}`;
}

// 3. Configuração do Carteiro de E-mail (SMTP do Gmail ou outro provedor)
const transporter = nodemailer.createTransport({
  // Endereço do servidor de e-mail (para Gmail é sempre smtp.gmail.com)
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  // Porta padrão segura para envio de e-mails
  port: Number(process.env.SMTP_PORT) || 587,
  // false para porta 587 (inicia conexão normal e depois criptografa com TLS)
  secure: false,
  // Credenciais da conta que vai disparar o e-mail (lidas do arquivo .env)
  auth: {
    user: process.env.SMTP_USER, // Ex: marcybraids@gmail.com
    pass: process.env.SMTP_PASS, // Senha de App de 16 letras gerada no Google
  },
});

// 4. Função Assíncrona ("async") que envia o e-mail de Solicitação para a Marcy.
// É "async" porque enviar um e-mail pela internet demora cerca de 1 a 2 segundos.
export async function sendAdminEmailNotification (data: NotificationPayload): Promise<boolean> {
    // Se o programador ainda não configurou o SMTP_USER no .env, avisamos no terminal sem dar erro
    if(!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 [MODO DEV] E-mail simulado para a Admin:', {
            para: process.env.ADMIN_EMAIL,
            client: data.clientName,
            modelo: data.serviceTitle,
            dataHora: `${data.date} (${data.startTime} - ${data.endTime})`,
        });
        return true;
    }

    // O bloco "try / catch" tenta enviar o e-mail. Se a internet cair ou a senha estiver errada,
    // ele cai no "catch" para não travar o agendamento da cliente!
    try {
    // Montamos o visual do e-mail em HTML com as cores da Identidade Visual da MarcyB.
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; background-color: #F6F4E6; color: #12140E; padding: 24px; border-radius: 12px; max-width: 520px;">
        <h2 style="color: #5C6233; margin-top: 0;">⏳ Nova Solicitação de Agendamento — MarcyB.</h2>
        <p>Uma cliente acabou de solicitar um horário pelo site e foi direcionada para o seu WhatsApp para combinar o orçamento final e o sinal de 50%.</p>
        
        <div style="background-color: #FFFFFF; padding: 16px; border-radius: 8px; border: 1px solid #EAE6D3;">
          <h3 style="margin-top: 0; color: #5C6233;">Dados da Cliente</h3>
          <p><strong>Nome:</strong> ${data.clientName}</p>
          <p><strong>WhatsApp:</strong> ${data.clientPhone}</p>
          <p><strong>E-mail:</strong> ${data.clientEmail}</p>

          <hr style="border: 0; border-top: 1px solid #EAE6D3; margin: 16px 0;" />

          <h3 style="color: #5C6233;">Detalhes do Atendimento</h3>
          <p><strong>Modelo Desejado:</strong> ${data.serviceTitle}</p>
          <p><strong>Data:</strong> ${data.date}</p>
          <p><strong>Horário Reservado:</strong> ${data.startTime} às ${data.endTime}</p>
          <p><strong>Comprimento:</strong> ${data.braidLength}</p>
          <p><strong>Cor do Jumbo:</strong> ${data.jumboColor}</p>
          <p><strong>Blowout (+R$ 40,00):</strong> ${data.includeBlowout ? 'Sim' : 'Não'}</p>
          ${data.clientNotes ? `<p><strong>Observações:</strong> ${data.clientNotes}</p>` : ''}

          <hr style="border: 0; border-top: 1px solid #EAE6D3; margin: 16px 0;" />

          <p><strong>Valor Base Estimado:</strong> R$ ${data.totalPrice.toFixed(2)}</p>
          <p><strong>Sinal de 50% sugerido:</strong> R$ ${data.depositAmount.toFixed(2)}</p>
        </div>
      </div>
    `;
    

    await transporter.sendMail({
        from: `"Agenda MarcyB." <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: `⏳ Solicitação de Agendamento: ${data.clientName} (${data.date} às ${data.startTime})`,
        html: htmlEmail,
    });

        console.log('✅ E-mail de solicitação enviado com sucesso para a Admin!');
    return true;
  } catch (error) {
        console.error('⚠️ Falha ao enviar e-mail para a Admin (o agendamento foi salvo mesmo assim):', error);
    return false;
  }
}