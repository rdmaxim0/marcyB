import React from 'react';
import { Clock } from 'lucide-react';
import './ServiceDuration.scss';

interface ServiceDurationProps {
  // Duração do serviço em minutos (o campo "durationMin" do Service)
  minutes: number;
}

// Converte minutos em texto amigável:
//   45  => "45 min"
//   180 => "3h"
//   210 => "3h30"
function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Menos de 1 hora: mostra só os minutos
  if (hours === 0) return `${minutes} min`;
  // Horas redondas: "3h"
  if (minutes === 0) return `${hours}h`;
  // Horas + minutos: "3h30" (padStart garante "3h05" em vez de "3h5")
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

// Selo "⏱ Tempo estimado: 3h" usado nos cards da Home e da lista de Serviços
export const ServiceDuration: React.FC<ServiceDurationProps> = ({ minutes }) => (
  <span className="service-duration">
    <Clock size={13} />
    <span>Tempo estimado: {formatDuration(minutes)}</span>
  </span>
);