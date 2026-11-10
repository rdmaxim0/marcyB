import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Category, Service } from '../types';
// NOVO: card único de serviço, o mesmo usado na Home
import { ServiceCard } from './ServiceCard';
import './ServicesView.scss';

interface ServicesViewProps {
  categories: Category[];
  services: Service[];
  loading: boolean;
  onSelectService: (service: Service) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  categories,
  services,
  loading,
  onSelectService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredServices = services.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || s.category?.slug === selectedCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="services-view">
      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar Box Braids, Fulani, Nagô..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="category-pills">
        <button
          type="button"
          className={`category-pills__btn ${
            selectedCategory === 'all' ? 'category-pills__btn--active' : ''
          }`}
          onClick={() => setSelectedCategory('all')}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-pills__btn ${
              selectedCategory === cat.slug ? 'category-pills__btn--active' : ''
            }`}
            onClick={() => setSelectedCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13 }}>Carregando catálogo...</p>
      ) : (
        <div className="services-list">
          {filteredServices.reverse().map((service) => (
            // ALTERADO: o card inteiro agora vem do componente ServiceCard
            <ServiceCard
              key={service.id}
              service={service}
              actionLabel="Agendar"
              onSelect={onSelectService}
            />
          ))}
        </div>
      )}
    </div>
  );
};