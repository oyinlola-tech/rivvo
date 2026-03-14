const statusLabels = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity'
};

export const sendError = (res, status, message) => {
  const label = statusLabels[status] || 'Error';
  return res.status(status).json({ error: label, message });
};

export const requireFields = (body, fields) =>
  fields.filter((field) => {
    const value = body?.[field];
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    return value === undefined || value === null;
  });

export const isEmail = (value) => {
  if (typeof value !== 'string') return false;
  const input = value.trim();
  if (input.length === 0 || input.length > 254) return false;
  if (input.includes(' ') || input.includes('..')) return false;

  const at = input.indexOf('@');
  if (at <= 0 || at !== input.lastIndexOf('@')) return false;

  const local = input.slice(0, at);
  const domain = input.slice(at + 1);
  if (local.length === 0 || local.length > 64) return false;
  if (domain.length === 0 || domain.length > 255) return false;

  // Require at least one dot in domain and valid labels.
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0 || label.length > 63)) return false;
  if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) return false;

  return true;
};

export const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export const isOneOf = (value, options) => options.includes(value);

export const normalizeUsername = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed;
};

export const isUsername = (value) => {
  const input = normalizeUsername(value);
  if (!input) return false;
  if (input.length < 3 || input.length > 32) return false;
  if (!/^[a-z0-9._]+$/.test(input)) return false;
  if (input.startsWith('.') || input.endsWith('.')) return false;
  if (input.includes('..') || input.includes('__') || input.includes('._') || input.includes('_.')) {
    return false;
  }
  return true;
};

export const normalizePhone = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return plus ? `+${digits}` : digits;
};

export const isPhone = (value) => Boolean(normalizePhone(value));
