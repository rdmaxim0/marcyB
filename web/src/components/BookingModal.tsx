import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { getTodayStr, getNowMinutes } from '../utils/date';
import { Service, User, AvailabilityResponse } from '../types';
import './BookingModal.scss';

export interface PendingBookingDraft {
  service: Service;
  date: string;
  selectedTime: string;
  includeBlowout: boolean;
  braidLength: string;
  jumboColor: string;
  clientNotes: string;
  acceptedRules: boolean;
}

export const PENDING_BOOKING_KEY = 'marcyb_pending_booking';

interface BookingModalProps {
  service: Service;
  user: User | null;
  initialDraft?: PendingBookingDraft | null;
  onClose: () => void;
  onSuccess: () => void;
  onRequireRegister: (draft: PendingBookingDraft) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  service,
  user,
  initialDraft,
  onClose,
  onSuccess,
  onRequireRegister,
}) => {
  const todayStr = getTodayStr();

  const [date, setDate] = useState<string>(
  initialDraft?.date && initialDraft.date >= todayStr ? initialDraft.date : todayStr
);
  const [selectedTime, setSelectedTime] = useState<string>(initialDraft?.selectedTime || '');
  const [includeBlowout, setIncludeBlowout] = useState<boolean>(
    initialDraft?.includeBlowout ?? false
  );
  const [braidLength, setBraidLength] = useState<string>(
    initialDraft?.braidLength || 'Cintura'
  );
  const [jumboColor, setJumboColor] = useState<string>(
    initialDraft?.jumboColor || 'Preto Natural (1B)'
  );
  const [clientNotes, setClientNotes] = useState<string>(initialDraft?.clientNotes || '');
  const [acceptedRules, setAcceptedRules] = useState<boolean>(
    initialDraft?.acceptedRules ?? false
  );

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const res = await api.get<AvailabilityResponse>('/availability', {
        params: {
          date,
          serviceId: service.id,
          includeBlowout: String(includeBlowout),
        },
      });
      setAvailability(res.data);

      setSelectedTime((prevTime) => {
        if (!prevTime) return '';
        const stillAvailable = res.data.slots.some(
          (s) => s.startTime === prevTime && s.available
        );
        return stillAvailable ? prevTime : '';
      });
    } catch {
      toast.error('Erro ao consultar horários disponíveis.');
    } finally {
      setLoadingSlots(false);
    }
  }, [date, service.id, includeBlowout]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTime) {
      toast.warning('Selecione um horário disponível.');
      return;
    }

    if (!acceptedRules) {
      toast.warning('Você precisa aceitar as regras de preparo e tolerância.');
      return;
    }

    if (!user) {
      const draft: PendingBookingDraft = {
        service,
        date,
        selectedTime,
        includeBlowout,
        braidLength,
        jumboColor,
        clientNotes,
        acceptedRules,
      };
      localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(draft));
      toast.info('Crie sua conta rapidinho para finalizar seu agendamento! Seu horário ficou salvo.');
      onRequireRegister(draft);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/appointments', {
        serviceId: service.id,
        date,
        startTime: selectedTime,
        includeBlowout,
        braidLength,
        jumboColor,
        clientNotes: clientNotes || undefined,
        acceptedRules,
        paymentMethod: 'WHATSAPP_REQUEST',
      });

      localStorage.removeItem(PENDING_BOOKING_KEY);
      setWhatsappUrl(res.data.whatsappUrl);
      toast.success('Solicitação registrada! Envie o comprovante de 50% no WhatsApp.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar agendamento.');
      fetchAvailability();
    } finally {
      setSubmitting(false);
    }
  }

  const totalPrice = availability
    ? availability.totalPrice
    : service.basePrice + (includeBlowout ? 40 : 0);
  const depositAmount = totalPrice / 2;

  // Verificação estrita: só aplica o corte de horário passado se a data selecionada for HOJE
  const isToday = date === todayStr;
  const currentMinutes = getNowMinutes(); 

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <header className="booking-modal__header">
          <div>
            <span>Reservar Horário</span>
            <h3>{service.title}</h3>
          </div>
          <button type="button" className="booking-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {whatsappUrl ? (
          <div className="booking-modal__success">
            <CheckCircle2 size={46} color="#5b6236" />
            <h4>Horário Pré-Reservado!</h4>
            <p>
              Para confirmar sua vaga na agenda da <strong>MarcyB.</strong>, envie agora a mensagem no
              WhatsApp para realizar o pagamento do <strong>sinal de 50% (R$ {depositAmount.toFixed(2)})</strong>.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="booking-modal__whatsapp-btn"
            >
              <MessageCircle size={18} />
              <span>Enviar Pedido no WhatsApp da Marcy</span>
            </a>
            <button type="button" className="booking-modal__done-btn" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <form className="booking-modal__form" onSubmit={handleConfirmBooking}>
            {initialDraft && (
              <div
                style={{
                  backgroundColor: '#e6e8d5',
                  color: '#424825',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                ✨ Recuperamos os dados do seu agendamento! Confira abaixo e clique em Confirmar.
              </div>
            )}

            <div className="booking-field">
              <label>1. Escolha a Data</label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <label className="booking-checkbox">
              <input
                type="checkbox"
                checked={includeBlowout}
                onChange={(e) => setIncludeBlowout(e.target.checked)}
              />
              <div>
                <strong>Adicionar Blowout (+R$ 40,00)</strong>
                <span>Escovação/preparação prévia dos fios (+30 min)</span>
              </div>
            </label>

            <div className="booking-field">
              <label>
                <Clock size={14} /> 2. Horários Livres ({availability?.totalDuration || service.durationMin} min)
              </label>
              {loadingSlots ? (
                <p className="slots-info">Consultando agenda...</p>
              ) : !availability || availability.slots.length === 0 ? (
                <p className="slots-info">Nenhum horário comportado nesta data.</p>
              ) : (
                <div className="slots-grid">
                  {availability.slots.map((slot) => {
                    const [h, m] = slot.startTime.split(':').map(Number);
                    const slotMinutes = h * 60 + m;
                    // Se NÃO for hoje, isPastTime é sempre false (liberando total para amanhã e dias seguintes)
                    const isPastTime = isToday && slotMinutes <= currentMinutes;
                    const isDisabled = !slot.available || isPastTime;

                    return (
                      <button
                        type="button"
                        key={slot.startTime}
                        disabled={isDisabled}
                        className={`slot-btn ${
                          selectedTime === slot.startTime ? 'slot-btn--selected' : ''
                        }`}
                        onClick={() => setSelectedTime(slot.startTime)}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="booking-row">
              <div className="booking-field">
                <label>Comprimento</label>
                <select value={braidLength} onChange={(e) => setBraidLength(e.target.value)}>
                  <option value="Ombro / Chanel">Ombro / Chanel</option>
                  <option value="Meio das Costas">Meio das Costas</option>
                  <option value="Cintura">Cintura (Padrão)</option>
                  <option value="Quadril / Bumbum">Quadril / Bumbum</option>
                </select>
              </div>

              <div className="booking-field">
                <label>Cor do Jumbo</label>
                <input
                  type="text"
                  value={jumboColor}
                  onChange={(e) => setJumboColor(e.target.value)}
                  placeholder="Ex: Preto 1B, Mel 27..."
                  required
                />
              </div>
            </div>

            <div className="booking-field">
              <label>Observações (Opcional)</label>
              <textarea
                rows={2}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Algum detalhe sobre seu cabelo ou referência?"
              />
            </div>

            <div className="booking-rules">
              <AlertCircle size={16} />
              <p>
                <strong>Regras MarcyB.:</strong> Tolerância de atraso de 15 min (multa de R$ 30 até 20 min). A vaga só é garantida mediante pagamento de 50% de sinal.
              </p>
            </div>

            <label className="booking-checkbox">
              <input
                type="checkbox"
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
              />
              <span>Li e concordo com as regras de preparo e sinal de 50%.</span>
            </label>

            <div className="booking-summary">
              <div>
                <span>Valor Total</span>
                <strong className="tabular-nums">R$ {totalPrice.toFixed(2)}</strong>
              </div>
              <div>
                <span>Sinal para Reservar (50%)</span>
                <strong className="tabular-nums highlight">R$ {depositAmount.toFixed(2)}</strong>
              </div>
            </div>

            <button type="submit" className="booking-submit" disabled={submitting || !selectedTime}>
              {submitting
                ? 'Processando...'
                : user
                ? 'Confirmar & Gerar Sinal'
                : 'Continuar para Cadastro Rápido'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};