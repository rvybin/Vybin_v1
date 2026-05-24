import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-12 w-full border-t border-black/[0.06] bg-white py-8 text-center sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="mb-4 text-base font-semibold text-[#1D1D1F] sm:text-lg">Get in Touch</h2>

        <div className="mb-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <Mail className="h-4 w-4 text-[#0EA5E9]" />
            <a
              href="mailto:vybinorg@gmail.com"
              className="text-[#6E6E73] transition-colors hover:text-[#1D1D1F]"
            >
              vybinorg@gmail.com
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <svg className="h-4 w-4 text-[#DD2A7B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            <a
              href="https://www.instagram.com/vybin_org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6E6E73] transition-colors hover:text-[#1D1D1F]"
            >
              @vybin_org
            </a>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#8E8E93]">&copy; 2026 Vybin. All rights reserved.</p>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#8E8E93]">
          <Link to="/terms" className="transition-colors hover:text-[#0EA5E9]">
            Terms of Service
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-[#6366F1]">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
