import React from 'react';
import { Service } from '../types';
import { getServiceImage } from '../utils/images';
import { ServiceDuration } from './ServiceDuration';
import './ServiceCard.scss';

interface ServiceCardProps {
  service: Service;
  // Texto do botão do card (a Home usa "Reservar" e a lista de Serviços usa "Agendar")
  actionLabel: string;
  // Chamado quando a cliente clica no botão do card
  onSelect: (service: Service) => void;
}

// Card de serviço ÚNICO: a Home e a lista de Serviços usam este mesmo componente,
// então os dois sempre ficam idênticos (qualquer ajuste de layout vale para as duas telas).
export const ServiceCard: React.FC<ServiceCardProps> = ({ service, actionLabel, onSelect }) => {
  // Serviços simples e Knotless têm preço fechado; os demais têm "a partir de"
  const hasFixedPrice =
    service.category?.slug === 'servicos-simples' || service.title.includes('lavagem');

  // "\u00A0" é um espaço que NÃO quebra linha: mantém "R$ 350.00" sempre junto.
  // Se faltar espaço, o texto quebra assim: "A partir de" / "R$ 350.00" (e não "R$" sozinho).
  const priceText = `${hasFixedPrice ? '' : 'A partir de '}R$\u00A0${service.basePrice.toFixed(2)}`;

  return (
    <div className="service-card">
      <img src={getServiceImage(service.imageUrl)} alt={service.title} loading="lazy" />

      <div className="service-card__info">
        <h3>{service.title}</h3>
        <p>{service.description}</p>

        {/* Tempo estimado do serviço, entre a descrição e o preço */}
        <ServiceDuration minutes={service.durationMin} />

        <div className="service-card__footer">
          <strong className="tabular-nums">{priceText}</strong>
          <button type="button" onClick={() => onSelect(service)}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};