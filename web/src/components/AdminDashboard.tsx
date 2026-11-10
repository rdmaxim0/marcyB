import React, { useState, useEffect } from 'react';
import { Check, X, Trash2, Edit3, PlusCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Appointment, Category, Service, ScheduleBlock } from '../types';
import './AdminDashboard.scss';

interface AdminDashboardProps {
  categories: Category[];
  services: Service[];
  onRefreshCatalog: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  services,
  onRefreshCatalog,
}) => {
  const [subTab, setSubTab] = useState<'appointments' | 'services' | 'blocks'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);

  // Estados do CRUD de Serviços
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

  // Estados de Bloqueio de Agenda
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('12:00');
  const [blockReason, setBlockReason] = useState('Horário de Almoço / Pessoal');

  async function loadOverview() {
    try {
      const res = await api.get('/admin/overview');
      setAppointments(res.data.appointments);
      setBlocks(res.data.blocks);
    } catch {
      toast.error('Erro ao carregar dados do painel Admin.');
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleStatusChange(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    try {
      await api.patch(`/admin/appointments/${id}/status`, { status });
      toast.success(status === 'CONFIRMED' ? 'Agendamento confirmado!' : 'Agendamento cancelado.');
      loadOverview();
    } catch {
      toast.error('Erro ao atualizar agendamento.');
    }
  }

  async function handleDeleteAppointment(id: string) {
    try {
      await api.delete(`/admin/appointments/${id}`);
      toast.success('Agendamento removido.');
      loadOverview();
    } catch {
      toast.error('Erro ao excluir agendamento.');
    }
  }

  function startEditService(srv: Service) {
    setEditingId(srv.id);
    setTitle(srv.title);
    setDescription(srv.description);
    setBasePrice(String(srv.basePrice));
    setDurationMin(String(srv.durationMin));
    setImageUrl(srv.imageUrl);
    setCategoryId(srv.categoryId);
  }

  function resetServiceForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setBasePrice('150');
    setDurationMin('180');
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      description,
      basePrice: Number(basePrice),
      durationMin: Number(durationMin),
      imageUrl,
      categoryId: categoryId || categories[0]?.id,
    };

    try {
      if (editingId) {
        await api.put(`/admin/services/${editingId}`, payload);
        toast.success('Serviço atualizado!');
      } else {
        await api.post('/admin/services', payload);
        toast.success('Novo serviço adicionado ao catálogo!');
      }
      resetServiceForm();
      onRefreshCatalog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar serviço.');
    }
  }

  async function handleDeleteService(id: string) {
    try {
      await api.delete(`/admin/services/${id}`);
      toast.success('Serviço excluído.');
      onRefreshCatalog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir serviço.');
    }
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/admin/blocks', {
        date: blockDate,
        startTime: blockStart,
        endTime: blockEnd,
        reason: blockReason,
      });
      toast.success('Horário bloqueado na agenda!');
      loadOverview();
    } catch {
      toast.error('Erro ao bloquear horário.');
    }
  }

  async function handleDeleteBlock(id: string) {
    try {
      await api.delete(`/admin/blocks/${id}`);
      toast.success('Bloqueio removido.');
      loadOverview();
    } catch {
      toast.error('Erro ao remover bloqueio.');
    }
  }

  // ORDENAÇÃO DOS AGENDAMENTOS: 1º PENDING_APPROVAL, 2º CONFIRMED, 3º CANCELLED
  const statusPriority: Record<string, number> = {
    PENDING_APPROVAL: 1,
    CONFIRMED: 2,
    CANCELLED: 3,
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    // Critério de desempate por data/horário caso tenham o mesmo status
    return a.date.localeCompare(b.date);
  });

  return (
    <div className="admin-dashboard">
      <h2 style={{ fontSize: 18 }}>Painel Admin — Marcy Braids</h2>

      <div className="admin-dashboard__tabs">
        <button
          type="button"
          className={subTab === 'appointments' ? 'active' : ''}
          onClick={() => setSubTab('appointments')}
        >
          Agenda ({appointments.length})
        </button>
        <button
          type="button"
          className={subTab === 'services' ? 'active' : ''}
          onClick={() => setSubTab('services')}
        >
          Catálogo ({services.length})
        </button>
        <button
          type="button"
          className={subTab === 'blocks' ? 'active' : ''}
          onClick={() => setSubTab('blocks')}
        >
          Bloqueios ({blocks.length})
        </button>
      </div>

      {/* ABA 1: GERENCIAR AGENDAMENTOS (Ordenados por prioridade de status) */}
      {subTab === 'appointments' && (
        <div className="services-list">
          {sortedAppointments.length === 0 ? (
            <p style={{ fontSize: 12 }}>Nenhum agendamento registrado.</p>
          ) : (
            sortedAppointments.map((appt) => (
              <div key={appt.id} className="appointment-card">
                <div className="appointment-card__top">
                  <h4>{appt.service?.title}</h4>
                  <span className={`appointment-card__badge appointment-card__badge--${appt.status}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="appointment-card__meta">
                  <span>👩🏾 Cliente: <strong>{appt.user?.name}</strong> ({appt.user?.phone})</span>
                  <span>📅 {appt.date} das {appt.startTime} às {appt.endTime}</span>
                  <span>
                    🎨 Jumbo: {appt.jumboColor} • {appt.braidLength} {appt.includeBlowout ? '• +Blowout' : ''}
                  </span>
                  <span>💰 Total: R$ {appt.totalPrice.toFixed(2)} (Sinal 50%: R$ {appt.depositAmount.toFixed(2)})</span>
                </div>
                <div className="admin-dashboard__actions">
                  {appt.status !== 'CONFIRMED' && (
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                    >
                      <Check size={14} /> Confirmar Sinal
                    </button>
                  )}
                  {appt.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                    >
                      <X size={14} /> Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => handleDeleteAppointment(appt.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 2: CRUD DE SERVIÇOS */}
      {subTab === 'services' && (
        <>
          <form className="admin-dashboard__form" onSubmit={handleSaveService}>
            <h3>{editingId ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}</h3>
            <input
              type="text"
              placeholder="Nome do modelo (ex: Goddess Braids)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              rows={2}
              placeholder="Descrição detalhada"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="admin-dashboard__row">
              <input
                type="number"
                placeholder="Preço Base (R$)"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Duração (minutos)"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
              />
            </div>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="url"
              placeholder="URL da Foto"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
            <div className="admin-dashboard__actions">
              <button type="submit" className="btn-confirm">
                <PlusCircle size={14} />
                {editingId ? 'Salvar Alterações' : 'Adicionar Serviço'}
              </button>
              {editingId && (
                <button type="button" className="btn-edit" onClick={resetServiceForm}>
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>

          <div className="services-list">
            {services.map((srv) => (
              <div key={srv.id} className="appointment-card">
                <div className="appointment-card__top">
                  <h4>{srv.title}</h4>
                  <strong>R$ {srv.basePrice.toFixed(2)}</strong>
                </div>
                <p style={{ fontSize: 11, color: '#757065' }}>
                  Duração: {srv.durationMin} min • Categoria: {srv.category?.name}
                </p>
                <div className="admin-dashboard__actions">
                  <button type="button" className="btn-edit" onClick={() => startEditService(srv)}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => handleDeleteService(srv.id)}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ABA 3: BLOQUEIOS DE AGENDA */}
      {subTab === 'blocks' && (
        <>
          <form className="admin-dashboard__form" onSubmit={handleCreateBlock}>
            <h3>Bloquear Horário / Folga</h3>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
            />
            <div className="admin-dashboard__row">
              <input
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                required
              />
              <input
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                required
              />
            </div>
            <input
              type="text"
              placeholder="Motivo (ex: Consulta médica / Folga)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              required
            />
            <button
              type="submit"
              className="btn-confirm"
              style={{ padding: 10, border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              <Lock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Criar Bloqueio na Agenda
            </button>
          </form>

          <div className="services-list">
            {blocks.map((b) => (
              <div key={b.id} className="appointment-card">
                <div className="appointment-card__top">
                  <h4>{b.reason}</h4>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ border: 'none', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                    onClick={() => handleDeleteBlock(b.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p style={{ fontSize: 12 }}>
                  📅 {b.date} • Das {b.startTime} às {b.endTime}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};