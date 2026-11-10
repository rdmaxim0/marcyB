import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Service } from '../types';
// Hora atual no fuso de Brasília (helper src/utils/date.ts)
import { getNowMinutes } from '../utils/date';
// NOVO: card único de serviço, o mesmo usado na lista de Serviços
import { ServiceCard } from './ServiceCard';
import './HomeView.scss';

interface HomeViewProps {
  services: Service[];
  onGoToServices: () => void;
  onSelectService: (service: Service) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  services,
  onGoToServices,
  onSelectService,
}) => {
  // Usa a hora de Brasília (antes usava a hora do navegador, que muda conforme o fuso do aparelho)
  const nowMinutes = getNowMinutes();
  const isOpen = nowMinutes >= 8 * 60 && nowMinutes < 20 * 60;

  return (
    <div className="home-view">
      <section className="hero-editorial">
        {/* Marca d'água oficial .y com cor injetada diretamente no SVG para burlar o cache */}
        <svg
          className="hero-editorial__watermark"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <circle cx="22" cy="86" r="12" fill="#5b6236" />
          <path d="M34 18 L52 18 L66 64 L50 68 Z" fill="#5b6236" />
          <path d="M84 18 L102 18 C92 52, 80 86, 60 98 C50 102, 42 100, 42 86 C54 84, 62 76, 68 62 Z" fill="#5b6236" />
        </svg>

        <div className="hero-editorial__top">
          <span className="hero-editorial__location">Campo Grande • RJ</span>
          <div className={`status-pill ${isOpen ? 'status-pill--open' : 'status-pill--closed'}`}>
            <span className="status-pill__dot" />
            <span>{isOpen ? 'Estúdio Aberto' : 'Fechado • 08h às 20h'}</span>
          </div>
        </div>

        <h1>A rua escuta e a preta fala.</h1>

        <blockquote className="hero-editorial__manifesto">
          “Eu não jogo palavras ao vento, tudo tem um intuito, uma caminhada. Quando me ouve, cê escuta rap.”
        </blockquote>

        <div className="hero-editorial__idv-tags">
          <span className="tag-olive">NAGÔ</span>
          <span>TWIST</span>
          <span>BOX BRAIDS</span>
          <span>FULANI</span>
          <span>GYPSY</span>
        </div>

        <button type="button" className="hero-editorial__cta" onClick={onGoToServices}>
          <span>Escolher Trança & Horário</span>
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="studio-metrics" aria-label="Regras do estúdio">
        <div className="studio-metrics__item">
          <strong>50%</strong>
          <span>Sinal Reserva</span>
        </div>
        <div className="studio-metrics__item">
          <strong>R$ 40</strong>
          <span>Blowout</span>
        </div>
        <div className="studio-metrics__item">
          <strong>15 min</strong>
          <span>Tolerância</span>
        </div>
      </section>

      <section>
        <div className="home-view__section-header">
          <h2>Serviços em Destaque</h2>
          <button type="button" onClick={onGoToServices}>
            Ver todos ({services.length})
          </button>
        </div>

        <div className="services-list">
          {services.slice(7, 11).reverse().map((service) => (
            // ALTERADO: o card inteiro agora vem do componente ServiceCard
            <ServiceCard
              key={service.id}
              service={service}
              actionLabel="Reservar"
              onSelect={onSelectService}
            />
          ))}
        </div>
      </section>
    </div>
  );
};