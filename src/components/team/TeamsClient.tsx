"use client";
import { useState } from "react";
import { Plus, Users, Crown, UserPlus, Trash2, X, Loader2, Copy, Check, Shield, Settings } from "lucide-react";
import type { Team, TeamMemberWithUser } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  initialTeams: (Team & { members: TeamMemberWithUser[] })[];
}

export default function TeamsClient({ userId, initialTeams }: Props) {
  const [teams, setTeams] = useState(initialTeams);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTeam, setActiveTeam] = useState<string | null>(teams[0]?.id ?? null);

  const createTeam = async () => {
    if (!newTeam.name) return;
    setSaving(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTeam),
    });
    if (res.ok) {
      const team = await res.json();
      setTeams((prev) => [team, ...prev]);
      setActiveTeam(team.id);
      setShowCreate(false);
      setNewTeam({ name: "", description: "" });
    }
    setSaving(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail || !showInvite) return;
    setSaving(true);
    const res = await fetch(`/api/teams/${showInvite}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (res.ok && data.inviteUrl) {
      setInviteLink(data.inviteUrl);
    }
    setSaving(false);
    setInviteEmail("");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTeam = teams.find((t) => t.id === activeTeam);
  const isOwner = currentTeam?.ownerId === userId;

  const roleLabel: Record<string, string> = { owner: "Manager", admin: "Admin", member: "Membro" };
  const roleIcon = (role: string) => role === "owner" ? <Crown className="w-3 h-3 text-brand-400" /> : role === "admin" ? <Shield className="w-3 h-3 text-blue-400" /> : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">EQUIPAS</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Treina e compite com os teus colegas</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Nova Equipa
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="animate-fade-up delay-100 flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-dark-800 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-400 font-medium mb-1">Sem equipas ainda</p>
          <p className="text-neutral-600 text-sm mb-6">Cria uma equipa e convida os teus colegas de treino.</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Criar Equipa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-fade-up delay-100">
          {/* Team list */}
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setActiveTeam(team.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  activeTeam === team.id
                    ? "bg-brand-500/10 border-brand-500/30 text-white"
                    : "bg-dark-800 border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-brand-400 font-bold text-sm">{team.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{team.name}</p>
                    <p className="text-xs text-neutral-500">{team.members?.length ?? 0} membros</p>
                  </div>
                  {team.ownerId === userId && <Crown className="w-3.5 h-3.5 text-brand-400 shrink-0 ml-auto" />}
                </div>
              </button>
            ))}
          </div>

          {/* Team detail */}
          {currentTeam && (
            <div className="lg:col-span-3 bg-dark-800 border border-white/5 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{currentTeam.name}</h2>
                    {isOwner && <span className="text-xs bg-brand-500/15 text-brand-300 border border-brand-500/25 px-2 py-0.5 rounded-full">Team Manager</span>}
                  </div>
                  {currentTeam.description && <p className="text-sm text-neutral-400">{currentTeam.description}</p>}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowInvite(currentTeam.id); setInviteLink(""); }}
                      className="flex items-center gap-2 bg-dark-700 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 text-sm px-3 py-2 rounded-xl transition-all"
                    >
                      <UserPlus className="w-4 h-4" /> Convidar
                    </button>
                    <a
                      href={`/teams/${currentTeam.id}/manage`}
                      className="flex items-center gap-2 bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 text-sm px-3 py-2 rounded-xl transition-all"
                    >
                      <Settings className="w-4 h-4" /> Gerir
                    </a>
                  </div>
                )}
              </div>

              {/* Members list */}
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Membros</p>
                <div className="space-y-2">
                  {currentTeam.members?.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl border border-white/5">
                      <div className="w-8 h-8 bg-dark-600 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-neutral-300">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{member.user.name}</p>
                          {roleIcon(member.role)}
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{member.user.email}</p>
                      </div>
                      <span className="text-xs text-neutral-500 bg-dark-600 px-2 py-0.5 rounded-full shrink-0">
                        {roleLabel[member.role]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* Create team modal */}
      {
        showCreate && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white text-lg">Nova Equipa</h3>
                <button onClick={() => setShowCreate(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Nome *</label>
                  <input
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Ex: Pedalada do Norte"
                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block">Descrição</label>
                  <textarea
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Sobre a equipa..."
                    rows={3}
                    className="w-full bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 border border-white/8 text-neutral-400 hover:text-white text-sm transition-all">Cancelar</button>
                <button onClick={createTeam} disabled={saving || !newTeam.name} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Criar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Invite modal */}
      {
        showInvite && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-md animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white text-lg">Convidar Membro</h3>
                <button onClick={() => setShowInvite(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="flex-1 bg-dark-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500"
                />
                <button onClick={sendInvite} disabled={saving || !inviteEmail} className="bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-4 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </button>
              </div>
              {inviteLink && (
                <div className="bg-dark-700 border border-white/8 rounded-xl p-3 flex items-center gap-2">
                  <p className="text-xs text-neutral-400 flex-1 truncate">{inviteLink}</p>
                  <button onClick={copyLink} className="shrink-0 text-neutral-400 hover:text-white transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
}
