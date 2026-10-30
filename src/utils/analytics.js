/**
 * Privacy-Respecting Analytics Stub for Rentify
 *
 * Requirements:
 * 1. Does not activate until the user provides consent in the Cookie Consent Banner.
 * 2. Never captures or transmits personal identifiable information (PII) such as
 *    phone numbers, Aadhaar numbers, real names, or unmasked document references.
 * 3. Configurable via VITE_ANALYTICS_ID environment variable (e.g. Plausible / Google Analytics).
 * 4. Logs to console in development mode for developer testing.
 */

const STORAGE_KEY_CONSENT = 'rentify_cookie_consent_v1';

/**
 * Checks if the user has consented to analytics/performance tracking
 */
export const hasAnalyticsConsent = () => {
  try {
    const consent = localStorage.getItem(STORAGE_KEY_CONSENT);
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed?.analytics === true;
  } catch {
    return false;
  }
};

/**
 * Track an application event safely
 * @param {string} eventName - Semantic name of the action (e.g. 'search_properties', 'view_listing')
 * @param {object} properties - Non-PII contextual parameters (e.g. { city: 'Nagpur', filter: '2BHK' })
 */
export const trackEvent = (eventName, properties = {}) => {
  // Respect user consent
  if (!hasAnalyticsConsent()) {
    if (import.meta.env.DEV) {
      console.debug(`[Analytics Suppressed: No Consent] ${eventName}`, properties);
    }
    return;
  }

  // Sanitize: ensure no sensitive keys are passed
  const sanitizedProps = { ...properties };
  delete sanitizedProps.phone;
  delete sanitizedProps.ownerPhone;
  delete sanitizedProps.aadhaar;
  delete sanitizedProps.password;

  const measurementId = import.meta.env.VITE_ANALYTICS_ID;

  if (import.meta.env.DEV) {
    console.info(`[Analytics Event: ${eventName}]`, sanitizedProps, measurementId ? `(ID: ${measurementId})` : '(No provider ID configured)');
  }

  // If a real provider (like window.gtag or window.plausible) is injected, forward the event:
  if (typeof window !== 'undefined') {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props: sanitizedProps });
    } else if (typeof window.gtag === 'function' && measurementId) {
      window.gtag('event', eventName, sanitizedProps);
    }
  }
};

/**
 * Track page view safely
 * @param {string} pagePath - Client-side path e.g. '/customer' or '/assistance'
 */
export const trackPageView = (pagePath) => {
  trackEvent('page_view', { path: pagePath });
};
