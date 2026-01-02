import { ApiResponse, Event, Registration, UserSession, UserRole } from '../types';
import { DEFAULT_SCRIPT_URL } from '../constants';

// Utility to read the stored API URL or use default
export const getApiUrl = () => {
    const stored = localStorage.getItem('GAS_API_URL');
    if (stored) return stored;
    return DEFAULT_SCRIPT_URL;
};
export const setApiUrl = (url: string) => localStorage.setItem('GAS_API_URL', url);

const callScript = async (action: string, payload: any = {}, method: 'GET' | 'POST' = 'GET') => {
  const baseUrl = getApiUrl();
  if (!baseUrl) {
    console.error("API URL is missing");
    throw new Error("Configuration Error: API URL is missing.");
  }

  // Google Apps Script Web App handling
  let url = `${baseUrl}?action=${action}`;
  
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // Important for GAS doPost
    },
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
    
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse API response:", text);
        throw new Error("Invalid response from server");
    }
    
    if (!json.success) {
      throw new Error(json.message || "API Request Failed");
    }
    return json.data;
  } catch (error: any) {
    console.error(`API Call Failed [${action}]:`, error);
    throw error;
  }
};

// --- Auth Methods (Email & Password & OTP) ---

export const loginUser = async (email: string, password: string): Promise<{ valid: boolean, role: UserRole, email: string, name: string }> => {
  return callScript('login', { email, password }, 'POST');
};

export const registerAccount = async (name: string, email: string, password: string): Promise<{ created: boolean, email: string }> => {
  return callScript('signup', { name, email, password }, 'POST');
};

export const requestLoginOtp = async (email: string): Promise<{ sent: boolean, message: string }> => {
  return callScript('requestOtp', { email }, 'POST');
};

export const loginWithOtp = async (email: string, otp: string): Promise<{ valid: boolean, role: UserRole, email: string, name: string }> => {
  return callScript('loginOtp', { email, otp }, 'POST');
};

export const logout = () => {
  localStorage.removeItem('user_session');
  window.location.href = '/';
};

export const getUserSession = (): UserSession | null => {
  const session = localStorage.getItem('user_session');
  return session ? JSON.parse(session) : null;
};

// --- API Methods ---

export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const data = await callScript('getEvents');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("fetchEvents safe catch:", e);
    return []; // Return empty array to prevent UI crash
  }
};

export const createEvent = async (eventData: Omit<Event, 'id' | 'currentParticipants'>, bannerBase64: string): Promise<Event> => {
  return callScript('createEvent', { ...eventData, bannerBase64 }, 'POST');
};

export const registerForEvent = async (registrationData: { eventId: string, name: string, email: string }, proofBase64: string): Promise<any> => {
  return callScript('registerUser', { ...registrationData, proofBase64 }, 'POST');
};

export const fetchRegistrations = async (): Promise<Registration[]> => {
  try {
    const data = await callScript('getRegistrations');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("fetchRegistrations safe catch:", e);
    return [];
  }
};

export const fetchUserRegistrations = async (email: string): Promise<Registration[]> => {
  // If we have a backend endpoint for this, it's better. For now, filter client side or use existing logic.
  // Ideally, secure this on backend, but for this architecture:
  const allRegistrations = await fetchRegistrations();
  if (!allRegistrations || !Array.isArray(allRegistrations)) return [];
  return allRegistrations.filter(r => r.userEmail && r.userEmail.toLowerCase() === email.toLowerCase());
};

export const updateRegistrationStatus = async (id: string, status: string): Promise<any> => {
  return callScript('updateRegistrationStatus', { id, status }, 'POST');
};

export const sendCertificate = async (registrationId: string): Promise<any> => {
  return callScript('sendCertificate', { id: registrationId }, 'POST');
};
