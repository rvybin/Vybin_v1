import { Mail, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-12 w-full border-t border-white/10 bg-[#0B0C10]/90 py-8 text-center text-gray-400 backdrop-blur-sm sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="mb-4 text-base font-semibold text-white sm:text-lg">Get in Touch</h2>

        <div className="mb-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <Mail className="h-4 w-4 text-[#4C6EF5]" />
            <span className="text-gray-300">contact@vybin.org</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <Instagram className="h-4 w-4 text-[#A78BFA]" />
            <a
              href="https://www.instagram.com/wearevybin/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 transition-colors hover:text-white"
            >
              @wearevybin
            </a>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-gray-500">
          © {new Date().getFullYear()} <span className="font-semibold text-white">Vybin</span>. Connecting McGill
          students through shared experiences.
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          <Link to="/terms" className="transition-colors hover:text-[#4C6EF5]">
            Terms of Service
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-[#7C3AED]">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
