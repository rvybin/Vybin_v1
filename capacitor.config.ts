import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.vybin.app",
  appName: "Vybin",
  webDir: "dist",
  server: {
    // Allows Capacitor WebView to make requests to external HTTPS services (Supabase)
    androidScheme: "https",
    allowNavigation: ["*.supabase.co"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#FFFFFF",
    },
  },
};

export default config;
