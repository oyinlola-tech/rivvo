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

export const isEmail = (value) =>
  typeof value === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export const isOneOf = (value, options) => options.includes(value);
