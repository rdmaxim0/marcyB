export type TabType = 'home' | 'services' | 'appointments' | 'profile' | 'admin';

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  durationMin: number;
  imageUrl: string;
  categoryId: string;
  category?: Category;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CLIENT' | 'ADMIN';
}

export interface Appointment {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  totalDuration: number;
  includeBlowout: boolean;
  blowoutPrice: number;
  braidLength: string;
  jumboColor: string;
  clientNotes?: string;
  totalPrice: number;
  depositAmount: number;
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'CANCELLED';
  service: Service;
  user?: User;
}

export interface ScheduleBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes?: number;
  endMinutes?: number;
  reason: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  serviceTitle: string;
  includeBlowout: boolean;
  basePrice: number;
  blowoutPrice: number;
  totalPrice: number;
  depositAmount: number;
  totalDuration: number;
  slots: AvailabilitySlot[];
}