import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

export type SidebarItem = {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function SapSidebar({
  title = "Navigation",
  subtitle = "Control Center",
  items,
  mobileOpen,
  onMobileClose,
}: {
  title?: string;
  subtitle?: string;
  items: SidebarItem[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const navScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    const key = "sap.sidebar.scrollTop";
    const saved = sessionStorage.getItem(key);
    if (saved) el.scrollTop = Number(saved);

    const onScroll = () => sessionStorage.setItem(key, String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-64 transition-transform duration-200",
          "lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full w-full flex-col">
          <div className="m-3 flex h-[calc(100%-1.5rem)] flex-col rounded-2xl bg-background/70 backdrop-blur-xl shadow-lg border border-border/40">
            {/* Sidebar Header - Fixed */}
            <div className="px-4 pt-5 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md" />
                  <div>
                    <div className="text-lg font-semibold leading-tight">{title}</div>
                    <div className="text-xs text-muted-foreground">{subtitle}</div>
                  </div>
                </div>
                <button onClick={onMobileClose} className="lg:hidden p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sidebar Nav - Scrollable */}
            <nav ref={navScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3">
              <div className="space-y-2">
                {items.map((it) => (
                  <NavLink
                    key={it.href}
                    to={it.href}
                    onClick={() => window.innerWidth < 1024 && onMobileClose?.()}
                    className={({ isActive }) =>
                      cn(
                        "group block rounded-2xl transition-all",
                        isActive ? "shadow-lg" : "hover:shadow-md"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-3",
                          isActive
                            ? "rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-primary-foreground"
                            : "rounded-2xl bg-transparent"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-all flex-shrink-0",
                            isActive
                              ? "bg-white/20 backdrop-blur shadow-sm"
                              : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                          )}
                        >
                          <it.icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "text-sm font-semibold leading-snug",
                              isActive ? "text-white" : "text-foreground"
                            )}
                          >
                            {it.label}
                          </div>

                          {it.description ? (
                            <div
                              className={cn(
                                "mt-0.5 text-xs leading-snug",
                                isActive ? "text-white/80" : "text-muted-foreground"
                              )}
                            >
                              {it.description}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isActive ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                              <span className="text-lg text-white/90">↗</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
