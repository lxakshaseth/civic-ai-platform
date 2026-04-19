import { useState } from "react";
import { Eye, Globe, Type } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "./ui/button";

export function GovHeader() {
  const location = useLocation();
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);

  const homeHref = location.pathname.startsWith("/admin")
    ? "/admin"
    : location.pathname.startsWith("/employee")
      ? "/employee"
      : location.pathname.startsWith("/public")
        ? "/public"
        : "/";

  const updateFontSize = (nextSize: number) => {
    setFontSize(nextSize);
    document.documentElement.style.setProperty("--font-size", `${nextSize}px`);
  };

  const increaseFontSize = () => {
    if (fontSize < 20) {
      updateFontSize(fontSize + 2);
    }
  };

  const decreaseFontSize = () => {
    if (fontSize > 12) {
      updateFontSize(fontSize - 2);
    }
  };

  const resetFontSize = () => {
    updateFontSize(16);
  };

  const toggleContrast = () => {
    const nextContrastValue = !highContrast;
    setHighContrast(nextContrastValue);

    if (nextContrastValue) {
      document.body.classList.add("high-contrast");
      return;
    }

    document.body.classList.remove("high-contrast");
  };

  return (
    <>
      <div className="border-b border-gray-300 bg-[#f1f5f9]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-2 py-2 text-[11px] sm:text-xs md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 text-center md:justify-start">
              <span className="font-medium text-gray-700">Government of India</span>
              <span className="hidden text-gray-400 md:inline">|</span>
              <span className="text-gray-600">Ministry of Urban Development</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] sm:text-xs"
                  onClick={decreaseFontSize}
                  title="Decrease font size"
                >
                  <Type className="size-3" />
                  <span className="ml-1">A-</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] sm:text-xs"
                  onClick={resetFontSize}
                  title="Reset font size"
                >
                  <Type className="size-3" />
                  <span className="ml-1">A</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] sm:text-xs"
                  onClick={increaseFontSize}
                  title="Increase font size"
                >
                  <Type className="size-3" />
                  <span className="ml-1">A+</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 border-r border-gray-300 px-2 pr-2 text-[11px] sm:text-xs"
                onClick={toggleContrast}
                title="Toggle high contrast"
              >
                <Eye className="mr-1 size-3" />
                Contrast
              </Button>

              <div className="flex items-center gap-1 text-gray-600">
                <Globe className="size-3" />
                <span>English</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-300 bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to={homeHref} className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80 sm:gap-4">
              <div className="flex flex-col items-center">
                <div className="relative h-12 w-10 sm:h-14 sm:w-12">
                  <div className="absolute inset-0 flex flex-col items-center justify-end">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#FF6600] to-[#FF9933] sm:h-10 sm:w-10">
                      <div className="text-[9px] font-bold text-white">INDIA</div>
                    </div>
                    <div className="mt-1 h-2 w-10 rounded-sm bg-[#138808] sm:w-12" />
                  </div>
                </div>
                <div className="mt-1 text-center text-[8px] font-semibold text-gray-600">
                  Satyameva Jayate
                </div>
              </div>

              <div className="min-w-0 border-l-2 border-gray-300 pl-3 sm:pl-4">
                <h1 className="text-base font-bold tracking-tight text-[#1e3a8a] sm:text-xl lg:text-2xl">
                  Smart AI Civic Intelligence Platform
                </h1>
                <p className="text-[11px] font-medium text-gray-600 sm:text-sm">
                  Government of India | Digital India Initiative
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 rounded bg-gradient-to-r from-[#FF6600] to-[#FF9933] px-3 py-1 text-white">
                  <span className="text-xs font-semibold">DIGITAL</span>
                  <span className="text-xs font-bold">INDIA</span>
                </div>
                <div className="mt-0.5 text-[9px] text-gray-500">
                  Making India Digitally Empowered
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
