import { api } from './client';

export async function fetchScamAlerts() {
  const res = await api.get('/api/assistance/scam-alerts');
  return res.data || [];
}

export async function fetchLegal() {
  const res = await api.get('/api/assistance/legal');
  return res.data || [];
}

export async function fetchSchemes() {
  const res = await api.get('/api/assistance/schemes');
  return res.data || [];
}

export async function fetchRentalAssistanceData() {
  const [scamAlerts, legalGuidance, governmentSchemes] = await Promise.all([
    fetchScamAlerts().catch(() => []),
    fetchLegal().catch(() => []),
    fetchSchemes().catch(() => []),
  ]);
  return { scamAlerts, legalGuidance, governmentSchemes };
}
