"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Users, User, Loader2, Bell, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchUser { id: string; name: string; email: string; avatar?: string | null }
interface SearchTeam { id: string; name: string; description?: string | null; _count: { members: number } }
interface SearchResults { users: SearchUser[]; teams: SearchTeam[] }
interface PendingRequest { id: string; sender: { id: string; name: string; avatar?: string | null } }

interface Props {
  user: { name?: string | null };
}

export default function Header({ user }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  // Fetch pending requests
  const fetchPending = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setPendingRequests(data.received ?? []);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Search with debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults(null); setShowResults(false); return; }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      }
      setSearching(false);
    }, 300);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleUserClick = (id: string) => {
    setShowResults(false);
    setQuery("");
    router.push(`/profile/${id}`);
  };

  const respondRequest = async (id: string, status: "accepted" | "declined") => {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchPending();
  };

  const hasResults = results && (results.users.length > 0 || results.teams.length > 0);

  return (
    <header className="h-16 border-b border-white/5 bg-dark-900/50 backdrop-blur flex items-center justify-between px-6 shrink-0 gap-4">
      {/* Left — greeting */}
      <div className="shrink-0 hidden sm:block">
        <p className="text-sm text-neutral-400">
          {greeting}, <span className="text-white font-semibold">{user.name?.split(" ")[0]}</span> 👋
        </p>
      </div>

      {/* Center — search */}
      <div ref={searchRef} className="relative flex-1 max-w-md mx-auto">
        <div className="flex items-center gap-2 bg-dark-800 border border-white/8 rounded-xl px-3 py-2 focus-within:border-brand-500/50 transition-colors">
          {searching ? (
            <Loader2 className="w-4 h-4 text-neutral-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            placeholder="Pesquisar utilizadores ou equipas..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults(null); setShowResults(false); }}>
              <X className="w-3.5 h-3.5 text-neutral-500 hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-dark-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-500">
                Sem resultados para "{query}"
              </div>
            ) : (
              <div className="py-1 max-h-80 overflow-y-auto">
                {results!.users.length > 0 && (
                  <>
                    <p className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Utilizadores
                    </p>
                    {results!.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleUserClick(u.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
                          <span className="text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                        </div>
                        <User className="w-4 h-4 text-neutral-600 shrink-0" />
                      </button>
                    ))}
                  </>
                )}
                {results!.teams.length > 0 && (
                  <>
                    <p className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider border-t border-white/5">
                      Equipas
                    </p>
                    {results!.teams.map((t) => (
                      <div
                        key={t.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <div className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-brand-400 text-xs font-bold">{t.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{t.name}</p>
                          <p className="text-xs text-neutral-500">{t._count.members} membros</p>
                        </div>
                        <Users className="w-4 h-4 text-neutral-600 shrink-0" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — notifications */}
      <div ref={notifRef} className="relative shrink-0">
        <button
          onClick={() => setShowNotifications((o) => !o)}
          className="relative w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-neutral-500 hover:text-white hover:border-white/15 transition-all"
        >
          <Bell className="w-4 h-4" />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
              style={{ background: "#E8177A" }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        {/* Notifications dropdown */}
        {showNotifications && (
          <div className="absolute top-full mt-2 right-0 w-72 bg-dark-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-semibold text-white">Notificações</p>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-neutral-500">
                Sem notificações
              </div>
            ) : (
              <div className="py-1 max-h-64 overflow-y-auto">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="px-3 py-3 hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, rgba(43,143,191,0.3), rgba(232,23,122,0.3))" }}>
                        <span className="text-white text-xs font-bold">
                          {req.sender.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-semibold">{req.sender.name}</span> quer ser teu amigo
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-11">
                      <button
                        onClick={() => respondRequest(req.id, "accepted")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 text-xs font-medium transition-all"
                      >
                        <UserPlus className="w-3 h-3" /> Aceitar
                      </button>
                      <button
                        onClick={() => respondRequest(req.id, "declined")}
                        className="flex-1 py-1.5 rounded-lg bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-xs font-medium transition-all"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}