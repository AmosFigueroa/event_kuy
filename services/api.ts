
import { ApiResponse, Event, Registration, UserSession, UserRole, PaymentSettings, CertificateConfig } from '../types';
import { DEFAULT_SCRIPT_URL } from '../constants';

// Utility to read the stored API URL or use default
export const getApiUrl = () => {
    const stored = localStorage.getItem('GAS_API_URL');
    if (stored) return stored;
    return DEFAULT_SCRIPT_URL;
};
export const setApiUrl = (url: string) => localStorage.setItem('GAS_API_URL', url);

export const createSlug = (title: string) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const callScript = async (action: string, payload: any = {}, method: 'GET' | 'POST' = 'GET') => {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error("API URL is missing");

  let url = `${baseUrl}?action=${action}`;
  const options: RequestInit = {
    method: method,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  };

  if (method === 'GET') {
    Object.keys(payload).forEach(key => {
        url += `&${key}=${encodeURIComponent(payload[key])}`;
    });
  } else {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let json: ApiResponse<any>;
    try { json = JSON.parse(text); } catch (e) { throw new Error("Invalid response from server"); }
    if (!json.success) throw new Error(json.message || "API Request Failed");
    return json.data;
  } catch (error: any) {
    console.error(`API Call Failed [${action}]:`, error);
    throw error;
  }
};

// --- Auth ---
export const loginUser = (email: string, password: string) => callScript('login', { email, password }, 'POST');
export const registerAccount = (name: string, email: string, password: string) => callScript('signup', { name, email, password }, 'POST');
export const requestLoginOtp = (email: string) => callScript('requestOtp', { email }, 'POST');
export const loginWithOtp = (email: string, otp: string) => callScript('loginOtp', { email, otp }, 'POST');
export const logout = () => { localStorage.removeItem('user_session'); window.location.href = '/'; };
export const getUserSession = (): UserSession | null => {
  const session = localStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
};

// --- Events ---
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const data = await callScript('getEvents');
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
};

// Updated: Supports certBackgroundBase64 now
export const createEvent = (eventData: Partial<Event>, bannerBase64: string | undefined, certBackgroundBase64?: string, thumbnailBase64?: string) => 
    callScript('createEvent', { ...eventData, bannerBase64, certBackgroundBase64, thumbnailBase64 }, 'POST');

export const updateEvent = (eventData: Partial<Event>, bannerBase64?: string, certBackgroundBase64?: string, thumbnailBase64?: string) => 
    callScript('updateEvent', { ...eventData, bannerBase64, certBackgroundBase64, thumbnailBase64 }, 'POST');

export const deleteEvent = (id: string) => callScript('deleteEvent', { id }, 'POST');

export const toggleEventStatus = (id: string) => callScript('toggleEventStatus', { id }, 'POST');

// --- Registrations ---
export const registerForEvent = (registrationData: any, proofBase64: string) => callScript('registerUser', { ...registrationData, proofBase64 }, 'POST');
export const fetchRegistrations = async (): Promise<Registration[]> => {
  try {
    const data = await callScript('getRegistrations');
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
};
export const fetchUserRegistrations = async (email: string) => {
  const all = await fetchRegistrations();
  return all.filter(r => r.userEmail && r.userEmail.toLowerCase() === email.toLowerCase());
};

// Updated: Returns registration + certConfig
export const fetchRegistrationById = async (id: string): Promise<{registration: Registration, certificateConfig: CertificateConfig | null}> => {
    return await callScript('getRegistration', { id }, 'POST');
};
export const updateRegistrationStatus = (id: string, status: string) => callScript('updateRegistrationStatus', { id, status }, 'POST');
export const sendCertificate = (id: string) => {
    // Pass current window origin to backend so email links are correct
    const baseUrl = window.location.origin + window.location.pathname;
    return callScript('sendCertificate', { id, baseUrl }, 'POST');
};
export const sendBulkCertificates = (ids: string[]) => {
    // Pass current window origin to backend so email links are correct
    const baseUrl = window.location.origin + window.location.pathname;
    return callScript('sendBulkCertificates', { ids, baseUrl }, 'POST');
};

// --- Payment Settings ---
export const savePaymentSettings = (settings: PaymentSettings, qrisBase64?: string) => callScript('savePaymentSettings', { ...settings, qrisBase64 }, 'POST');
export const fetchPaymentSettings = async (): Promise<PaymentSettings> => callScript('getPaymentSettings');

// --- Legacy Certificate Settings (Deprecated but kept for type safety if needed) ---
export const saveCertificateSettings = (settings: any, templateBase64?: string) => callScript('saveCertificateSettings', { ...settings, templateBase64 }, 'POST');
export const fetchCertificateSettings = async (): Promise<any> => callScript('getCertificateSettings');
