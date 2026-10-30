import { useEffect } from 'react';

/**
 * usePageMeta: Dynamically updates the document title and meta description.
 * Ensures page-specific SEO titles and descriptions across client-side routes.
 *
 * @param {string} title - The page-specific title (will append " | Rentify")
 * @param {string} description - The meta description for search snippets
 */
export const usePageMeta = (title, description) => {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = 'Rentify — Deed-Verified Rentals';
    document.title = title ? `${title} | Rentify` : baseTitle;

    // 2. Update Meta Description
    if (description) {
      let descTag = document.querySelector('meta[name="description"]');
      if (!descTag) {
        descTag = document.createElement('meta');
        descTag.setAttribute('name', 'description');
        document.head.appendChild(descTag);
      }
      descTag.setAttribute('content', description);

      // Also update og:description for social scrapers
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }
    }

    // Scroll to top on route navigation for clean user experience
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [title, description]);
};
