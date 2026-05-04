import { supabase } from "./supabase";

export async function openPremiumCheckout() {
  const { data, error } = await supabase.functions.invoke("create-checkout");

  if (error || !data?.url) {
    window.alert("Could not start checkout. Please try again.");
    return;
  }

  window.location.href = data.url;
}
