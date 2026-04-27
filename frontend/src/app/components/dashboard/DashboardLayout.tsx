import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { GovHeader } from "../GovHeader";
import { cn } from "../ui/utils";

type DashboardSidebarProps = {
  children: ReactNode;
  className?: string;
  isMobileMenuOpen: boolean;
  widthClassName?: string;
};

export function DashboardSidebar({
  children,
  className,
  isMobileMenuOpen,
  widthClassName = "lg:w-72",
}: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-1rem))] min-h-0 flex-col border-r border-gray-300 bg-white shadow-lg transition-transform duration-200 ease-in-out",
        "overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:static lg:h-full lg:translate-x-0 lg:overflow-y-hidden lg:hover:overflow-y-auto",
        widthClassName,
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        className,
      )}
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
  sidebarWidthClassName?: string;
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
  sidebarWidthClassName,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-gray-50">
      <GovHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
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
          widthClassName={sidebarWidthClassName}
        >
          {sidebar}
        </DashboardSidebar>

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
