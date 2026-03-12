const premiumCheckoutUrl = (import.meta.env.VITE_STRIPE_PREMIUM_LINK ?? "").trim();

export function hasPremiumCheckout() {
  return premiumCheckoutUrl.length > 0;
}

export function openPremiumCheckout() {
  if (!premiumCheckoutUrl) {
    window.alert("Stripe premium checkout is not configured yet. Add VITE_STRIPE_PREMIUM_LINK in your environment.");
    return;
  }

  window.open(premiumCheckoutUrl, "_blank", "noopener,noreferrer");
}

export function getPremiumCheckoutUrl() {
  return premiumCheckoutUrl;
}
