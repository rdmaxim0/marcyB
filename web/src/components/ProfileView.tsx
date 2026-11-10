import React, { useState, useEffect } from 'react';
import { LogOut, ShieldCheck, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { User } from '../types';
import { PendingBookingDraft } from './BookingModal';
import './ProfileView.scss';

interface ProfileViewProps {
  user: User | null;
  initialAuthMode?: 'login' | 'register';
  pendingDraft?: PendingBookingDraft | null;
  onLoginSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  initialAuthMode = 'login',
  pendingDraft,
  onLoginSuccess,
  onLogout,
  onOpenAdmin,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialAuthMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Sempre que vier redirecionado de um agendamento pendente, abre na aba "Criar Conta" (register)
  useEffect(() => {
    setMode(initialAuthMode);
  }, [initialAuthMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        toast.success(`Bem-vinda de volta, ${res.data.user.name}!`);
        onLoginSuccess(res.data.user, res.data.token);
      } else {
        const res = await api.post('/auth/register', { name, email, phone, password });
        toast.success(`Conta criada com sucesso, ${res.data.user.name}!`);
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="profile-view">
        <div className="profile-card">
          <div className="profile-card__avatar">{user.name.charAt(0).toUpperCase()}</div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span>📱 {user.phone}</span>

          {user.role === 'ADMIN' && (
            <button type="button" className="profile-card__admin-btn" onClick={onOpenAdmin}>
              <ShieldCheck size={16} />
              <span>Acessar Painel CRUD Admin</span>
            </button>
          )}

          <button type="button" className="profile-card__logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view">
      {pendingDraft && (
        <div
          style={{
            backgroundColor: '#f9e6e6',
            borderLeft: '4px solid #9e1b20',
            padding: '12px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#6b0f14',
          }}
        >
          <CalendarCheck size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Seu horário ({pendingDraft.selectedTime}) está guardado!</strong>
            <p style={{ margin: 0 }}>
              Finalize seu cadastro abaixo para concluir a reserva de{' '}
              <strong>{pendingDraft.service.title}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tabs__btn ${mode === 'login' ? 'auth-tabs__btn--active' : ''}`}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`auth-tabs__btn ${mode === 'register' ? 'auth-tabs__btn--active' : ''}`}
            onClick={() => setMode('register')}
          >
            Criar Conta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label>Seu Nome</label>
                <input
                  type="text"
                  placeholder="Ex: Dandara Alves"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label>WhatsApp com DDD</label>
                <input
                  type="tel"
                  placeholder="Ex: 21999998888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Senha</label>
            <input
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-card__submit" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : mode === 'register'
              ? pendingDraft
                ? 'Criar Conta & Continuar Agendamento'
                : 'Criar Minha Conta'
              : 'Entrar na Conta'}
          </button>
        </form>
      </div>
    </div>
  );
};