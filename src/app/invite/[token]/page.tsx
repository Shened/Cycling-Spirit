"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Zap } from "lucide-react";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.team) {
          setStatus("success");
          setMessage(`Entraste na equipa ${data.team.name}!`);
          setTimeout(() => router.push("/teams"), 2500);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Convite inválido.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("Erro ao processar convite."); });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-white/8 rounded-2xl p-8 w-full max-w-sm text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-brand mx-auto mb-6">
          <Zap className="w-5 h-5 text-black fill-black" />
        </div>
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-white font-semibold">A processar convite...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">{message}</p>
            <p className="text-neutral-500 text-sm">A redirecionar...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg mb-1">Ups!</p>
            <p className="text-neutral-400 text-sm mb-5">{message}</p>
            <button onClick={() => router.push("/dashboard")} className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl text-sm transition-all">
              Ir para o Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
