
import React from 'react';

// Augment global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export enum EventCategory {
  CONFERENCE = 'Conference',
  WORKSHOP = 'Workshop',
  SEMINAR = 'Seminar',
  CONCERT = 'Concert',
  WEBINAR = 'Webinar',
  COMPETITION = 'Competition'
}

export type FormFieldType = 'text' | 'number' | 'email' | 'select' | 'textarea';

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
  type: 'text' | 'dynamic' | 'image'; // Added 'image'
  field: string; // For text/dynamic: content/key. For image: base64 string or URL
  label: string; // UI Label for the admin
  x: number;
  y: number;
  fontSize?: number; // Optional for image
  fontFamily?: string; // Optional for image
  color?: string; // Optional for image
  fontWeight?: 'normal' | 'bold'; // Optional for image
  align?: 'left' | 'center' | 'right'; // Optional for image
  textTransform?: 'none' | 'uppercase' | 'lowercase'; // ADDED: Uppercase support
  width?: number; // Required for image/centering
  height?: number; // Added for image
}

export interface CertificateConfig {
  backgroundUrl: string;
  elements: CertificateElement[];
  csvDataUrl?: string; // URL to the uploaded CSV JSON data in Drive
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string; 
  bannerUrl: string;
  maxParticipants: number;
  currentParticipants: number;
  paymentInstructions?: string;
  isOpen: boolean;
  formFields?: FormField[];
  certificateConfig?: CertificateConfig; // NEW: Event-specific cert config
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
  customData?: string; // JSON string of custom form answers
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

// Updated to match Config
export interface CertificateSettings {
  backgroundUrl?: string;
  elements: CertificateElement[];
  csvDataUrl?: string;
}

// Auth Types
export type UserRole = 'ADMIN' | 'USER';

export interface UserSession {
  email: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
