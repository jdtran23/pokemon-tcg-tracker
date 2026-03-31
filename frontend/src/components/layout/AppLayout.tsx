import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  List,
  Bell,
  Settings,
  RefreshCw,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRefreshPrices } from "@/hooks/use-api";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/watchlist", label: "Watchlist", icon: List },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            }`
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const refreshPrices = useRefreshPrices();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <CreditCard className="h-5 w-5 text-primary" />
          <span>TCG Tracker</span>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </div>
        <Separator />
        <div className="p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshPrices.isPending ? "animate-spin" : ""}`}
            />
            {refreshPrices.isPending ? "Refreshing…" : "Refresh Prices"}
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="flex h-14 items-center gap-2 px-4 font-semibold">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>TCG Tracker</span>
              </SheetTitle>
              <Separator />
              <div className="px-3 py-4">
                <NavLinks onClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">TCG Tracker</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
