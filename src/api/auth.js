import { api } from './client';

export async function sendOtp(phone) {
  return await api.post('/api/auth/send-otp', { phone });
}

export async function verifyOtp(phone, otp) {
  return await api.post('/api/auth/verify-otp', { phone, otp });
}

export async function getMe() {
  try {
    const res = await api.get('/api/auth/me');
    return res?.user || null;
  } catch (err) {
    if (err.status === 401) {
      return null;
    }
    throw err;
  }
}

export async function logout() {
  return await api.post('/api/auth/logout');
}
