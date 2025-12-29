import React from 'react';

// Fix for JSX types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
      span: any;
      p: any;
      img: any;
      a: any;
      button: any;
      input: any;
      label: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      form: any;
      ul: any;
      li: any;
      nav: any;
      footer: any;
      header: any;
      section: any;
      aside: any;
      main: any;
      br: any;
      table: any;
      thead: any;
      tbody: any;
      tr: any;
      th: any;
      td: any;
      textarea: any;
      select: any;
      option: any;
      details: any;
      summary: any;
      [elemName: string]: any;
    }
  }
}

export enum EventCategory {
  CONFERENCE = 'Conference',
  WORKSHOP = 'Workshop',
  SEMINAR = 'Seminar',
  CONCERT = 'Concert',
  WEBINAR = 'Webinar'
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: EventCategory;
  bannerUrl: string; // URL from Google Drive
  maxParticipants: number;
  currentParticipants: number;
  paymentInstructions?: string;
  isOpen: boolean;
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
  proofUrl: string; // URL from Google Drive
  status: RegistrationStatus;
  registrationDate: string;
}

// Response structure from GAS
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}