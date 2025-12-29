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
