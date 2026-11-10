import { useState, useEffect, useCallback } from 'react';
import { User as UserIcon } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { api } from './services/api';
import { Category, Service, User, Appointment, TabType } from './types';
import { MarcyLogo } from './components/MarcyLogo';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { ServicesView } from './components/ServicesView';
import { AppointmentsView } from './components/AppointmentsView';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import {
  BookingModal,
  PendingBookingDraft,
  PENDING_BOOKING_KEY,
} from './components/BookingModal';
import './App.scss';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('marcyb_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingBookingDraft | null>(() => {
    const savedDraft = localStorage.getItem(PENDING_BOOKING_KEY);
    return savedDraft ? JSON.parse(savedDraft) : null;
  });

  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.get('/catalog');
      setCategories(res.data.categories);
      setServices(res.data.services);
    } catch {
      toast.error('Erro ao carregar catálogo.');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const loadMyAppointments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/appointments/me');
      setMyAppointments(res.data.appointments);
    } catch {
      toast.error('Não foi possível carregar seus agendamentos.');
    }
  }, [user]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (activeTab === 'appointments' && user && user.role !== 'ADMIN') {
      loadMyAppointments();
    }
  }, [activeTab, user, loadMyAppointments]);

  function handleLoginSuccess(loggedUser: User, token: string) {
    localStorage.setItem('marcyb_token', token);
    localStorage.setItem('marcyb_user', JSON.stringify(loggedUser));
    setUser(loggedUser);

    // Verifica se a cliente tinha um agendamento pendente antes de se cadastrar/logar
    const savedDraftRaw = localStorage.getItem(PENDING_BOOKING_KEY);
    if (savedDraftRaw) {
      const draft: PendingBookingDraft = JSON.parse(savedDraftRaw);
      setPendingDraft(draft);
      setBookingService(draft.service); // Reabre o modal do serviço imediatamente!
      return;
    }

    if (loggedUser.role === 'ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  }

  function handleLogout() {
    localStorage.removeItem('marcyb_token');
    localStorage.removeItem('marcyb_user');
    setUser(null);
    setMyAppointments([]);
    setActiveTab('home');
    toast.info('Você saiu da sua conta.');
  }

  function handleOpenServiceModal(srv: Service) {
    // Se a cliente clicou manualmente em outro serviço, limpa rascunho de serviço diferente
    if (pendingDraft && pendingDraft.service.id !== srv.id) {
      localStorage.removeItem(PENDING_BOOKING_KEY);
      setPendingDraft(null);
    }
    setBookingService(srv);
  }

  return (
    <div className="app-wrapper">
      <Toaster position="top-center" richColors />

      <div className="app-shell">
        <header className="app-header">
          <MarcyLogo size={36} variant="crimson" />
          <button
            type="button"
            className="app-header__user-btn"
            onClick={() => {
              setAuthMode('login');
              setActiveTab('profile');
            }}
          >
            <UserIcon size={16} />
            <span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
          </button>
        </header>

        <main className="app-content">
          {activeTab === 'home' && (
            <HomeView
              services={services}
              onGoToServices={() => setActiveTab('services')}
              onSelectService={handleOpenServiceModal}
            />
          )}

          {activeTab === 'services' && (
            <ServicesView
              categories={categories}
              services={services}
              loading={loadingCatalog}
              onSelectService={handleOpenServiceModal}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              user={user}
              appointments={myAppointments}
              services={services}
              onGoToProfile={() => {
                setAuthMode('login');
                setActiveTab('profile');
              }}
              onAppointmentCreated={() => {
                setActiveTab('admin');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={user}
              initialAuthMode={authMode}
              pendingDraft={pendingDraft}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              onOpenAdmin={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'admin' && user?.role === 'ADMIN' && (
            <AdminDashboard
              categories={categories}
              services={services}
              onRefreshCatalog={loadCatalog}
            />
          )}
        </main>

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} user={user} />

        {bookingService && (
          <BookingModal
            service={bookingService}
            user={user}
            initialDraft={
              pendingDraft && pendingDraft.service.id === bookingService.id
                ? pendingDraft
                : null
            }
            onClose={() => setBookingService(null)}
            onSuccess={() => {
              setPendingDraft(null);
              loadMyAppointments();
            }}
            onRequireRegister={(draft) => {
              setPendingDraft(draft);
              setBookingService(null);
              setAuthMode('register'); // Força a abrir direto na aba CRIAR CONTA
              setActiveTab('profile');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;