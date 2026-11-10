import React from 'react';
import { Home, Scissors, Calendar, Plus, User as UserIcon, ShieldCheck } from 'lucide-react';
import { TabType, User } from '../types';
import './BottomNav.scss';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  user: User | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, user }) => {
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="glass-nav-wrapper">
      <nav className="glass-nav">
        <button
          type="button"
          className={`glass-nav__item ${activeTab === 'home' ? 'glass-nav__item--active' : ''}`}
          onClick={() => onChangeTab('home')}
        >
          <Home size={18} />
          <span>Início</span>
        </button>

        <button
          type="button"
          className={`glass-nav__item ${activeTab === 'services' ? 'glass-nav__item--active' : ''}`}
          onClick={() => onChangeTab('services')}
        >
          <Scissors size={18} />
          <span>Serviços</span>
        </button>

        <button
          type="button"
          className={`glass-nav__item ${activeTab === 'appointments' ? 'glass-nav__item--active' : ''}`}
          onClick={() => onChangeTab('appointments')}
        >
          {isAdmin ? <Plus size={20} /> : <Calendar size={18} />}
          <span>{isAdmin ? 'Novo' : 'Agenda'}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`glass-nav__item ${activeTab === 'admin' ? 'glass-nav__item--active' : ''}`}
            onClick={() => onChangeTab('admin')}
          >
            <ShieldCheck size={18} />
            <span>Admin</span>
          </button>
        )}

        <button
          type="button"
          className={`glass-nav__item ${activeTab === 'profile' ? 'glass-nav__item--active' : ''}`}
          onClick={() => onChangeTab('profile')}
        >
          <UserIcon size={18} />
          <span>Perfil</span>
        </button>
      </nav>
    </div>
  );
};