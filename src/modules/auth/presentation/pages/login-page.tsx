'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../providers/auth-provider'
import { Database, ShieldCheck, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/presentation/components/ui/button'

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues by only rendering client-specific parts after mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-[#040705]" />

  return (
    <div className="min-h-screen flex bg-background overflow-hidden relative font-sans selection:bg-emerald-500/30">

      {/* Left Panel — BRANDING (Forced Noir Dark) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-20 relative bg-[#040705]">
        {/* Decorative background elements — noise and grids */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(#10b981 1px, transparent 1px),
              linear-gradient(90deg, #10b981 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-emerald-500/10">
              <Database size={22} className="text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-sm font-bold uppercase tracking-[0.3em]">Lumacraft</span>
          </div>
        </div>

        <div className="relative z-10 space-y-16">
          <div className="space-y-4">
            <h1 className="text-9xl font-black leading-[0.8] text-white tracking-tighter mix-blend-difference">
              Luma<br />craft
            </h1>
            <p className="text-xl text-emerald-50/30 font-light leading-relaxed max-w-sm tracking-wide">
              Motor dinámico de datos con inteligencia artificial integrada.
            </p>
          </div>

          <div className="space-y-6">
            <Feature icon={<ShieldCheck size={20} />} text="Aislamiento total con RLS nativo" />
            <Feature icon={<Zap size={20} />} text="Colecciones dinámicas sin migraciones" />
            <Feature icon={<Database size={20} />} text="Generación de documentos con IA" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-emerald-500/20 text-[10px] font-bold uppercase tracking-widest">
          <span>v0.1.0</span>
          <span className="w-1 h-1 rounded-full bg-emerald-500/20" />
          <span>Sprint 1</span>
        </div>
      </div>

      {/* Right Panel — AUTH (Adaptive Noir) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Subtle grid for right side in light mode — very faint */}
        <div className="absolute inset-0 dark:hidden opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)]" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile Logo Visibility */}
          <div className="flex lg:hidden items-center gap-3 mb-16 justify-center">
            <Database size={28} className="text-emerald-500" />
            <span className="text-foreground text-xl font-black uppercase tracking-tighter">Lumacraft</span>
          </div>

          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-5xl font-black text-foreground tracking-tighter mb-4 leading-none">
              Inicia Sesión
            </h2>
            <p className="text-muted text-lg font-light tracking-tight">
              Ingresa a tu ecosistema de datos.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="group relative w-full flex items-center gap-4 py-5 px-8 rounded-2xl font-bold text-sm bg-foreground text-background transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-2xl shadow-foreground/10"
            >
              <GoogleIcon />
              <span className="flex-1 text-left tracking-wide">Continuar con Google</span>
              <ArrowRight size={18} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <div className="pt-12 space-y-6">
              <div className="w-12 bg-border mx-auto lg:mx-0" />
              <div className="flex flex-col gap-4 text-center lg:text-left">
                <p className="text-[#000000]/30 dark:text-white/20 text-[10px] font-bold uppercase tracking-[0.25em]">
                  Copyright © 2024 Lumacraft
                </p>
                <nav className="flex gap-6 justify-center lg:justify-start text-[11px] font-bold text-foreground/40 uppercase tracking-widest">
                  <span className="hover:text-emerald-500 cursor-pointer transition-colors">Legal</span>
                  <span className="hover:text-emerald-500 cursor-pointer transition-colors">Privacidad</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-5 group">
      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 transition-all duration-500 group-hover:bg-emerald-500/20 group-hover:scale-110 group-hover:border-emerald-500/40">
        {icon}
      </div>
      <span className="text-sm font-medium tracking-wide text-emerald-50/40 group-hover:text-white transition-colors duration-500">
        {text}
      </span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

