import React, { useState, useEffect } from 'react';
import { PlusCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
// NOVO: AvailabilityResponse é o tipo da resposta da rota /availability (a mesma do modal da cliente)
import { Appointment, Service, User, AvailabilityResponse } from '../types';
// Data de hoje no fuso de Brasília (helper criado em src/utils/date.ts)
import { getTodayStr } from '../utils/date';
import './AppointmentsView.scss';
// NOVO: estilo da grade de horários da admin (arquivo separado, não precisa mexer no AppointmentsView.scss)
import './Adminslots.scss';

interface AppointmentsViewProps {
  user: User | null;
  appointments: Appointment[];
  services: Service[];
  onGoToProfile: () => void;
  onAppointmentCreated: () => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  user,
  appointments,
  services,
  onGoToProfile,
  onAppointmentCreated,
}) => {
  const isAdmin = user?.role === 'ADMIN';

  const todayStr = getTodayStr();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(todayStr);
  // ALTERADO: começa vazio. Agora o horário é escolhido clicando na grade (antes era "09:00" fixo)
  const [startTime, setStartTime] = useState('');
  const [includeBlowout, setIncludeBlowout] = useState(false);
  const [braidLength, setBraidLength] = useState('Cintura');
  const [jumboColor, setJumboColor] = useState('Preto Natural (1B)');
  const [submitting, setSubmitting] = useState(false);

  // NOVO: estados da grade de horários
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Contador que, ao mudar, força o useEffect abaixo a consultar a agenda de novo
  // (usamos depois de criar um agendamento, para o horário ocupado sumir da grade)
  const [refreshKey, setRefreshKey] = useState(0);

  // Garante que o primeiro serviço do catálogo seja selecionado assim que os serviços carregarem
  useEffect(() => {
    if (!serviceId && services.length > 0) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  // NOVO: busca os horários livres sempre que a Marcy muda serviço, data ou blowout.
  // É a mesma rota que a cliente usa, então a grade das duas telas é idêntica.
  useEffect(() => {
    // Só a admin vê essa grade, e só faz sentido consultar com serviço e data preenchidos
    if (!isAdmin || !serviceId || !date) return;

    // "cancelled" evita que uma resposta antiga (de uma data anterior) sobrescreva a mais nova
    let cancelled = false;

    async function loadAvailability() {
      setLoadingSlots(true);
      try {
        const res = await api.get<AvailabilityResponse>('/availability', {
          params: {
            date,
            serviceId,
            includeBlowout: String(includeBlowout),
          },
        });
        if (cancelled) return;
        setAvailability(res.data);

        // Se o horário escolhido deixou de estar livre (trocou data/serviço), limpa a seleção
        setStartTime((prev) =>
          res.data.slots.some((s) => s.startTime === prev && s.available) ? prev : ''
        );
      } catch (err: any) {
        if (cancelled) return;
        setAvailability(null);
        setStartTime('');
        toast.error(err.response?.data?.error || 'Erro ao consultar horários disponíveis.');
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadAvailability();

    // Função de limpeza: roda quando as dependências mudam, marcando a consulta antiga como descartada
    return () => {
      cancelled = true;
    };
  }, [isAdmin, serviceId, date, includeBlowout, refreshKey]);

  async function handleManualBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) {
      toast.error('Selecione um serviço.');
      return;
    }
    // NOVO: agora é obrigatório escolher um horário na grade
    if (!startTime) {
      toast.warning('Escolha um horário livre na grade.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/appointments/manual', {
        clientName,
        clientPhone,
        serviceId,
        date,
        startTime,
        includeBlowout,
        braidLength,
        jumboColor,
        acceptedRules: true,
      });

      toast.success('Agendamento manual criado com sucesso!');
      setClientName('');
      setClientPhone('');
      setStartTime('');
      onAppointmentCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar agendamento manual.');
    } finally {
      setSubmitting(false);
      // Atualiza a grade tanto no sucesso (horário some) quanto no erro 409 (alguém ocupou antes)
      setRefreshKey((k) => k + 1);
    }
  }

  const statusLabel = {
    PENDING_APPROVAL: 'Aguardando Sinal (50%)',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
  };

  // Horário escolhido, para mostrar "09:00 às 13:00" no resumo abaixo da grade
  const selectedSlot = availability?.slots.find((s) => s.startTime === startTime);

  if (isAdmin) {
    return (
      <div className="appointments-view">
        <h2 style={{ fontSize: 18, color: '#0f0e0c' }}>Novo Agendamento Manual</h2>
        <p style={{ fontSize: 12, color: '#655f56' }}>
          Cadastre um horário diretamente na agenda do estúdio para clientes presenciais ou WhatsApp.
        </p>

        <form className="manual-booking-form" onSubmit={handleManualBooking}>
          <div className="field-group">
            <label>Nome da Cliente</label>
            <input
              type="text"
              placeholder="Ex: Mariana Silva"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label>WhatsApp da Cliente</label>
            <input
              type="text"
              placeholder="Ex: 21999998888"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label>Modelo de Trança / Serviço</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} (R$ {s.basePrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* ALTERADO: a data agora ocupa a linha inteira; o horário foi para a grade logo abaixo */}
          <div className="field-group">
            <label>Data</label>
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <label className="checkbox-box">
            <input
              type="checkbox"
              checked={includeBlowout}
              onChange={(e) => setIncludeBlowout(e.target.checked)}
            />
            <span>Incluir Blowout (+R$ 40,00)</span>
          </label>

          {/* NOVO: grade de horários, igual à da cliente */}
          <div className="field-group">
            <label>
              <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Horários Livres ({availability?.totalDuration ?? '—'} min)
            </label>

            {loadingSlots ? (
              <p style={{ fontSize: 12, color: '#655f56' }}>Consultando agenda...</p>
            ) : !availability || availability.slots.length === 0 ? (
              <p style={{ fontSize: 12, color: '#655f56' }}>Nenhum horário comportado nesta data.</p>
            ) : (
              <div className="admin-slots-grid">
                {availability.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startTime}
                    // O servidor já marca como indisponível: horário ocupado, bloqueio ou que já passou hoje
                    disabled={!slot.available}
                    title={`${slot.startTime} às ${slot.endTime}`}
                    className={`admin-slot-btn ${
                      startTime === slot.startTime ? 'admin-slot-btn--selected' : ''
                    }`}
                    onClick={() => setStartTime(slot.startTime)}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}

            {/* Resumo do que foi escolhido, para a Marcy conferir o término do atendimento */}
            {selectedSlot && (
              <p style={{ fontSize: 12, color: '#655f56', marginTop: 8 }}>
                Selecionado: <strong>{selectedSlot.startTime}</strong> às{' '}
                <strong>{selectedSlot.endTime}</strong>
              </p>
            )}
          </div>

          <div className="field-group">
            <label>Comprimento</label>
            <select value={braidLength} onChange={(e) => setBraidLength(e.target.value)}>
              <option value="Ombro / Chanel">Ombro / Chanel</option>
              <option value="Meio das Costas">Meio das Costas</option>
              <option value="Cintura">Cintura (Padrão)</option>
              <option value="Quadril / Bumbum">Quadril / Bumbum</option>
            </select>
          </div>

          <div className="field-group">
            <label>Cor do Jumbo</label>
            <input
              type="text"
              value={jumboColor}
              onChange={(e) => setJumboColor(e.target.value)}
              placeholder="Ex: 1B, 27, Castanho..."
              required
            />
          </div>

          {/* O botão só habilita depois que um horário da grade for escolhido */}
          <button type="submit" className="submit-btn" disabled={submitting || !startTime}>
            <PlusCircle size={16} />
            <span>{submitting ? 'Registrando...' : 'Criar Agendamento Manual'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="appointments-view">
      <h2 style={{ fontSize: 18, color: '#0f0e0c' }}>Meus Agendamentos</h2>
      {!user ? (
        <div className="auth-card">
          <p style={{ fontSize: 13 }}>Entre na sua conta para acompanhar seus horários.</p>
          <button type="button" className="auth-card__submit" onClick={onGoToProfile}>
            Ir para Login
          </button>
        </div>
      ) : appointments.length === 0 ? (
        <p style={{ fontSize: 13 }}>Você ainda não possui agendamentos registrados.</p>
      ) : (
        <div className="services-list">
          {appointments.map((appt) => (
            <div key={appt.id} className="appointment-card">
              <div className="appointment-card__top">
                <h4>{appt.service.title}</h4>
                <span className={`appointment-card__badge appointment-card__badge--${appt.status}`}>
                  {statusLabel[appt.status]}
                </span>
              </div>
              <div className="appointment-card__meta">
                <span>📅 Data: {appt.date} ({appt.startTime} às {appt.endTime})</span>
                <span>🎨 Jumbo: {appt.jumboColor} • Comprimento: {appt.braidLength}</span>
                <span>
                  💰 Total: R$ {appt.totalPrice.toFixed(2)} (Sinal: R$ {appt.depositAmount.toFixed(2)})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};