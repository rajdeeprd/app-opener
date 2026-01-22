// Google Tag Manager Helper

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export function initGTM() {
  window.dataLayer = window.dataLayer || [];
}

export function trackEvent(eventName: string, data: Record<string, any>) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`[GTM] Tracked: ${eventName}`, data);
  }
}
