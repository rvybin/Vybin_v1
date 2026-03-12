const premiumCheckoutUrl = (import.meta.env.VITE_STRIPE_PREMIUM_LINK ?? "").trim();

export function hasPremiumCheckout() {
  return premiumCheckoutUrl.length > 0;
}

export function openPremiumCheckout() {
  window.alert("Vybin Premium is coming soon.");
}

export function getPremiumCheckoutUrl() {
  return premiumCheckoutUrl;
}
