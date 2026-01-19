
import React from 'react';

export enum EventCategory {
  CONFERENCE = 'Conference',
  WORKSHOP = 'Workshop',
  SEMINAR = 'Seminar',
  CONCERT = 'Concert',
  WEBINAR = 'Webinar',
  COMPETITION = 'Competition'
}

export type FormFieldType = 'text' | 'number' | 'email' | 'select' | 'textarea' | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[]; // For select inputs, comma separated
  placeholder?: string;
}

export interface CertificateElement {
  id: string;
  type: 'text' | 'dynamic' | 'image'; 
  field: string; 
  label: string; 
  x: number;
  y: number;
  fontSize?: number; 
  fontFamily?: string; 
  color?: string; 
  fontWeight?: 'normal' | 'bold'; 
  align?: 'left' | 'center' | 'right'; 
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  width?: number; 
  height?: number; 
  strokeWidth?: number; 
  strokeColor?: string; 
}

export interface CertificateConfig {
  backgroundUrl: string;
  elements: CertificateElement[];
  csvDataUrl?: string; 
}

export type EventStatus = 'COMING_SOON' | 'OPEN' | 'EXTENDED' | 'CLOSED';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  mapUrl?: string; 
  groupLink?: string; 
  price: number;
  category: string; 
  bannerUrl: string;
  thumbnailUrl?: string; 
  maxParticipants: number;
  currentParticipants: number;
  paymentInstructions?: string;
  isOpen: boolean; 
  status: EventStatus; 
  formFields?: FormField[];
  
  // NEW: Google Slide Template ID (Unique per Event)
  certificateSlideId?: string; 
  
  // Legacy (Optional - kept for backward compatibility)
  certificateConfig?: CertificateConfig; 
  enableTicketScanner?: boolean; 
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  userEmail: string;
  proofUrl: string;
  status: RegistrationStatus;
  registrationDate: string;
  customData?: string; 
  checkInStatus?: 'NOT_USED' | 'CHECKED_IN'; 
  checkInTime?: string; 
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface PaymentSettings {
  bankAccounts: BankAccount[];
  qrisUrl?: string;
}

export interface CertificateSettings {
  backgroundUrl?: string;
  elements: CertificateElement[];
  csvDataUrl?: string;
}

export type UserRole = 'ADMIN' | 'USER';

export interface UserSession {
  email: string;
  role: UserRole;
  isLoggedIn: boolean;
  name?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
