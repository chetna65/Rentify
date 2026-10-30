/**
 * Central HTTP client fetch wrapper with credentials: 'include',
 * standard JSON body serialization, and uniform ApiError handling.
 */

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include',
    ...options,
    headers: {
      ...options.headers,
    },
  };

  // Automatically serialize objects if not FormData or string
  if (config.body && !(config.body instanceof FormData) && typeof config.body !== 'string') {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new ApiError(0, err.message || 'Network request failed. Is the server running?');
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && (data?.error || data?.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data?.details || data);
  }

  return data;
}

export const api = {
  get: (url, options) => request(url, { method: 'GET', ...options }),
  post: (url, body, options) => request(url, { method: 'POST', body, ...options }),
  patch: (url, body, options) => request(url, { method: 'PATCH', body, ...options }),
  delete: (url, options) => request(url, { method: 'DELETE', ...options }),
};
