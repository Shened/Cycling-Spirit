"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Zap } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError("");
    const res = await signIn("credentials", { ...data, redirect: false });
    if (res?.error) setError("Credenciais inválidas. Tenta novamente.");
    else router.push("/dashboard");
  };

  return (
    <div className="animate-fade-up">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-brand"
          style={{ background: "linear-gradient(135deg, #2B8FBF, #E8177A)" }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-display text-2xl tracking-wider text-white">HYBRID NATION</span>
      </div>

      <div className="glass border border-white/8 rounded-2xl p-8">
        {/* Top accent bar */}
        <div className="h-0.5 w-full rounded-full mb-7"
          style={{ background: "linear-gradient(90deg, #2B8FBF, #E8177A)" }} />

        <h1 className="font-display text-3xl text-white mb-1 tracking-wide">ENTRAR</h1>
        <p className="text-neutral-500 text-sm mb-8">Bem-vindo de volta, atleta.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="tu@exemplo.com"
              className="w-full bg-dark-800 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors text-sm"
            />
            {errors.email && <p className="text-accent-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full bg-dark-800 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors text-sm"
            />
            {errors.password && <p className="text-accent-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="bg-accent-500/10 border border-accent-500/20 rounded-xl px-4 py-3 text-accent-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 glow-brand"
            style={{ background: "linear-gradient(135deg, #2B8FBF, #1A5A80)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Não tens conta?{" "}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Regista-te
          </Link>
        </p>
      </div>
    </div>
  );
}
