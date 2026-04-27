import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { GovHeader } from "../GovHeader";
import { cn } from "../ui/utils";

type DashboardSidebarProps = {
  children: ReactNode;
  className?: string;
  desktopTopOffset: number;
  isMobileMenuOpen: boolean;
  sidebarWidth: number;
};

export function DashboardSidebar({
  children,
  className,
  desktopTopOffset,
  isMobileMenuOpen,
  sidebarWidth,
}: DashboardSidebarProps) {
  const desktopStyles: CSSProperties = {
    top: desktopTopOffset,
    height: `calc(100vh - ${desktopTopOffset}px)`,
    width: `${sidebarWidth}px`,
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-1rem))] min-h-0 flex-col border-r border-gray-300 bg-white shadow-lg transition-transform duration-200 ease-in-out",
        "overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:inset-y-auto lg:translate-x-0 lg:overflow-y-hidden lg:hover:overflow-y-auto",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        className,
      )}
      style={desktopStyles}
    >
      {children}
    </aside>
  );
}

type DashboardMainContentProps = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  header?: ReactNode;
};

export function DashboardMainContent({
  children,
  className,
  footer,
  header,
}: DashboardMainContentProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {header ? <div className="shrink-0">{header}</div> : null}
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
        <div className="flex min-h-full flex-col">
          <div className="min-h-0 flex-1">{children}</div>
          {footer}
        </div>
      </main>
    </div>
  );
}

type DashboardLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  onMobileMenuToggle: () => void;
  sidebar: ReactNode;
  sidebarClassName?: string;
  sidebarWidth?: number;
};

export function DashboardLayout({
  children,
  footer,
  header,
  isMobileMenuOpen,
  onMobileMenuClose,
  onMobileMenuToggle,
  sidebar,
  sidebarClassName,
  sidebarWidth = 288,
}: DashboardLayoutProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [desktopTopOffset, setDesktopTopOffset] = useState(0);

  useEffect(() => {
    const shellElement = shellRef.current;

    if (!shellElement) {
      return;
    }

    const updateOffset = () => {
      const shellTop = shellElement.getBoundingClientRect().top;
      setDesktopTopOffset(Math.max(shellTop, 0));
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(updateOffset);
    const headerSiblings: HTMLElement[] = [];
    let sibling = shellElement.previousElementSibling;

    resizeObserver.observe(shellElement);

    while (sibling) {
      if (sibling instanceof HTMLElement) {
        headerSiblings.push(sibling);
      }

      sibling = sibling.previousElementSibling;
    }

    for (const headerElement of headerSiblings) {
      resizeObserver.observe(headerElement);
    }

    window.addEventListener("resize", updateOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-gray-50">
      <GovHeader />

      <div ref={shellRef} className="flex min-h-0 flex-1 overflow-hidden">
        <button
          onClick={onMobileMenuToggle}
          className="fixed left-4 top-24 z-50 rounded-lg border border-gray-300 bg-white p-2 shadow-lg lg:hidden"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <DashboardSidebar
          isMobileMenuOpen={isMobileMenuOpen}
          className={sidebarClassName}
          desktopTopOffset={desktopTopOffset}
          sidebarWidth={sidebarWidth}
        >
          {sidebar}
        </DashboardSidebar>

        <div className="hidden shrink-0 lg:block" style={{ width: `${sidebarWidth}px` }} />

        {isMobileMenuOpen ? (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onMobileMenuClose} />
        ) : null}

        <DashboardMainContent header={header} footer={footer}>
          {children}
        </DashboardMainContent>
      </div>
    </div>
  );
}
