export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

export const formatDateTime = (date) => `${formatDate(date)} · ${formatTime(date)}`;

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const statusColor = (status) => {
  switch (status) {
    case 'confirmed': return 'green';
    case 'pending':   return 'gold';
    case 'cancelled': return 'red';
    case 'expired':   return 'red';
    case 'failed':    return 'red';
    default:          return 'gray';
  }
};
