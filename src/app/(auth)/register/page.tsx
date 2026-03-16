"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Zap } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Erro ao criar conta.");
      return;
    }
    router.push("/login?registered=1");
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-brand"
          style={{ background: "linear-gradient(135deg, #2B8FBF, #E8177A)" }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-display text-2xl tracking-wider text-white">CYCLING SPIRIT</span>
      </div>

      <div className="glass border border-white/8 rounded-2xl p-8">
        <div className="h-0.5 w-full rounded-full mb-7"
          style={{ background: "linear-gradient(90deg, #E8177A, #2B8FBF)" }} />

        <h1 className="font-display text-3xl text-white mb-1 tracking-wide">CRIAR CONTA</h1>
        <p className="text-neutral-500 text-sm mb-8">Começa a tua jornada hoje.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {[
            { name: "name" as const,            label: "Nome",              type: "text",     placeholder: "João Silva" },
            { name: "email" as const,           label: "Email",             type: "email",    placeholder: "tu@exemplo.com" },
            { name: "password" as const,        label: "Password",          type: "password", placeholder: "••••••••" },
            { name: "confirmPassword" as const, label: "Confirmar Password",type: "password", placeholder: "••••••••" },
          ].map((field) => (
            <div key={field.name}>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">{field.label}</label>
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className="w-full bg-dark-800 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-brand-500 transition-colors text-sm"
              />
              {errors[field.name] && <p className="text-accent-400 text-xs mt-1">{errors[field.name]?.message}</p>}
            </div>
          ))}

          {error && (
            <div className="bg-accent-500/10 border border-accent-500/20 rounded-xl px-4 py-3 text-accent-300 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2B8FBF, #E8177A)" }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "A criar..." : "Criar Conta"}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Já tens conta?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
