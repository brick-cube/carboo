
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BusFront,
  MapPinned,
  Route,
  CalendarDays,
  Armchair,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: "OVERVIEW",
    links: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "OPERATIONS",
    links: [
      { label: "Trips", path: "/trips", icon: BusFront },
      { label: "Trip templates", path: "/trip-templates", icon: CalendarDays },
      { label: "Routes", path: "/routes", icon: Route },
      { label: "Vehicles", path: "/vehicles", icon: BusFront },
      {
        label: "Seat configurations",
        path: "/seat-configurations",
        icon: Armchair,
      },
    ],
  },
  {
    title: "BOOKING",
    links: [
      { label: "Bookings", path: "/bookings", icon: MapPinned, disabled: true },
      { label: "Customers", path: "/customers", icon: Users, disabled: true },
      { label: "Payments", path: "/payments", icon: CreditCard, disabled: true },
    ],
  },
  {
    title: "ANALYTICS",
    links: [
      { label: "Reports", path: "/reports", icon: BarChart3, disabled: true },
    ],
  },
  {
    title: "SYSTEM",
    links: [
      { label: "Settings", path: "/settings", icon: Settings, disabled: true },
    ],
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#191b1e] text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5a1f] text-lg font-bold">
              C
            </span>
            <span className="text-xl font-bold tracking-tight">
              carboo<span className="text-[#ff5a1f]">.</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-white/30">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon;

                  if (link.disabled) {
                    return (
                      <div
                        key={link.path}
                        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/30"
                        title="Coming soon"
                      >
                        <Icon className="h-[17px] w-[17px]" />
                        <span>{link.label}</span>
                        <span className="ml-auto text-[9px] uppercase tracking-wider">
                          Soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          isActive
                            ? "bg-[#ff5a1f] font-semibold text-white"
                            : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-[17px] w-[17px]" />
                      {link.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.07] p-4">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
