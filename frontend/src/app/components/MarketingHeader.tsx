import { useState } from "react";
import { Building2, LogIn, Menu, MessageSquare, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import { GovHeader } from "./GovHeader";
import { Button } from "./ui/button";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/public/assistant", label: "AI Assistant" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      <GovHeader />
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="rounded-xl bg-[#1e3a8a] p-2.5 shadow-sm">
                <Building2 className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1e3a8a] sm:text-base">
                  Smart AI Civic Intelligence Platform
                </p>
                <p className="truncate text-[11px] text-gray-600 sm:text-xs">
                  Government of India | Digital India Initiative
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <nav className="flex items-center gap-5">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "border-[#1e3a8a] text-[#1e3a8a]"
                        : "border-transparent text-gray-700 hover:text-[#1e3a8a]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <Link to="/login">
                <Button className="bg-[#1e3a8a] text-white hover:bg-[#1e40af]">
                  <LogIn className="mr-2 size-4" />
                  Portal Login
                </Button>
              </Link>
            </div>

            <button
              type="button"
              className="inline-flex rounded-xl border border-gray-300 bg-white p-2 text-gray-700 shadow-sm md:hidden"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation"
            >
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="border-t border-gray-200 py-4 md:hidden">
              <nav className="flex flex-col gap-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 text-[#1e3a8a]"
                        : "text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a]"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button className="mt-2 w-full bg-[#1e3a8a] text-white hover:bg-[#1e40af]">
                    <MessageSquare className="mr-2 size-4" />
                    Open Portal Login
                  </Button>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
