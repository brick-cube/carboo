
import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-zinc-600 hover:text-zinc-950 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden h-10 w-[260px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 md:flex">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search anything..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-400"
          />
          <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-400">
            /
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff5a1f]" />
        </button>

        <div className="flex items-center gap-3 border-l border-zinc-200 pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-zinc-900">
              {user?.name || "Administrator"}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">Admin account</p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#e95720]">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
