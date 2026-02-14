export const approximateLocation = (lat: number, lng: number) => ({
  lat: Math.round(lat * 1000) / 1000,
  lng: Math.round(lng * 1000) / 1000,
});

export const statusColor = (status: string, urgency: string) => {
  if (urgency === 'alta') return '#ef4444';
  if (status === 'rescatado' || status === 'reunido') return '#22c55e';
  return '#3b82f6';
};
