"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, Activity,
  Trophy, Zap, Settings, LogOut, UserCircle, Flag, Rss, TrendingUp, Target
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/feed", icon: Rss, label: "Feed" },
  { href: "/activities", icon: Activity, label: "Atividades" },
  { href: "/training-zones", icon: TrendingUp, label: "Zonas de Treino" },
  { href: "/goals", icon: Target, label: "Objetivos" },
  { href: "/calendar", icon: Calendar, label: "Calendário" },
  { href: "/teams", icon: Users, label: "Equipas" },
  { href: "/competitions", icon: Trophy, label: "Competições" },
  { href: "/tour", icon: Flag, label: "Tour" },
  { href: "/profile", icon: UserCircle, label: "Perfil" },
];

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-60 flex flex-col bg-dark-900 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 glow-brand"
          style={{ background: "linear-gradient(135deg, #2B8FBF, #E8177A)" }}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="hidden lg:block font-display text-lg tracking-widest text-white ml-3 whitespace-nowrap">
          HYBRID NATION
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                active
                  ? "bg-brand-500/15 text-brand-300 border border-brand-500/20"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-brand-400" : "text-neutral-500 group-hover:text-neutral-300")} />
              <span className="hidden lg:block text-sm font-medium whitespace-nowrap">{label}</span>
              {active && <div className="hidden lg:block ml-auto w-1.5 h-1.5 bg-brand-400 rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1 border-t border-white/5 pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-white/5 transition-all group"
        >
          <Settings className="w-5 h-5 shrink-0 group-hover:text-neutral-300" />
          <span className="hidden lg:block text-sm font-medium">Definições</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-500 hover:text-accent-400 hover:bg-accent-500/5 transition-all group"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm font-medium">Sair</span>
        </button>

        {/* User info */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-dark-800 border border-white/5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-300 text-xs font-bold">
                {user.name?.charAt(0).toUpperCase() ?? "U"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
