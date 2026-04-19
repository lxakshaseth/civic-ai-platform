import { ExternalLink, Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router";

export function GovFooter() {
  const lastUpdated = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <footer className="mt-auto border-t-4 border-[#FF6600] bg-gray-50">
      <div className="bg-[#1e3a8a] text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-4 border-b border-white/20 pb-2 text-lg font-bold">About SAIP</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-200">
                Smart AI Civic Intelligence Platform is a Government of India initiative for
                transparent and efficient civic governance.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-300">All systems operational</span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 border-b border-white/20 pb-2 text-lg font-bold">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/public" className="flex items-center gap-2 text-gray-200 hover:text-white hover:underline">
                    <span>-</span>
                    Citizen Portal
                  </Link>
                </li>
                <li>
                  <Link to="/employee" className="flex items-center gap-2 text-gray-200 hover:text-white hover:underline">
                    <span>-</span>
                    Employee Portal
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="flex items-center gap-2 text-gray-200 hover:text-white hover:underline">
                    <span>-</span>
                    Admin Portal
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.india.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-200 hover:text-white hover:underline"
                  >
                    <span>-</span>
                    India.gov.in
                    <ExternalLink className="size-3" />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 border-b border-white/20 pb-2 text-lg font-bold">Important Links</h3>
              <ul className="space-y-2 text-sm">
                {["Privacy Policy", "Terms of Service", "RTI Portal", "Sitemap", "Accessibility Statement"].map((item) => (
                  <li key={item}>
                    <a href="#" className="flex items-center gap-2 text-gray-200 hover:text-white hover:underline">
                      <span>-</span>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 border-b border-white/20 pb-2 text-lg font-bold">Contact Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-gray-200">
                  <Phone className="mt-0.5 size-4 flex-shrink-0" />
                  <div>
                    <div>Helpline: 1800-XXX-XXXX</div>
                    <div className="text-xs text-gray-300">(Toll Free)</div>
                  </div>
                </li>
                <li className="flex items-start gap-2 text-gray-200">
                  <Mail className="mt-0.5 size-4 flex-shrink-0" />
                  <div>support@saip.gov.in</div>
                </li>
                <li className="flex items-start gap-2 text-gray-200">
                  <MapPin className="mt-0.5 size-4 flex-shrink-0" />
                  <div>
                    Ministry of Urban Development
                    <br />
                    New Delhi - 110001
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/20 pt-6">
            <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
              <div className="text-sm text-gray-300">Follow us on social media for updates</div>
              <div className="flex items-center gap-4">
                <a href="#" className="transition-colors hover:text-blue-300" aria-label="Facebook">
                  <Facebook className="size-5" />
                </a>
                <a href="#" className="transition-colors hover:text-blue-300" aria-label="Twitter">
                  <Twitter className="size-5" />
                </a>
                <a href="#" className="transition-colors hover:text-red-300" aria-label="YouTube">
                  <Youtube className="size-5" />
                </a>
                <a href="#" className="transition-colors hover:text-pink-300" aria-label="Instagram">
                  <Instagram className="size-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 text-gray-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-2 text-center text-xs md:flex-row md:text-left">
            <div>
              Copyright 2026 Government of India. Content owned, updated and maintained by
              Ministry of Urban Development.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span>Last Updated: {lastUpdated}</span>
              <span className="hidden md:inline">|</span>
              <span>Visitors: 2,45,678</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap justify-center gap-4 text-center text-xs text-gray-600 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#FF6600]">
                <span className="text-[10px] font-bold text-white">DI</span>
              </div>
              <span>Digital India Initiative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-green-600">
                <span className="text-[10px] font-bold text-white">W3C</span>
              </div>
              <span>W3C WAI-AA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                <span className="text-[10px] font-bold text-white">SSL</span>
              </div>
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
                <span className="text-[10px] font-bold text-white">ISO</span>
              </div>
              <span>ISO 27001:2013 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
