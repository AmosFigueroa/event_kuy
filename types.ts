
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

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string; // Changed from EventCategory to string to allow custom input
  bannerUrl: string;
  maxParticipants: number;
  currentParticipants: number;
  paymentInstructions?: string;
  isOpen: boolean;
  formFields?: FormField[]; // Custom form fields structure
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
