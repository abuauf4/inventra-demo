'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Package, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useAppStore()

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Username dan password harus diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentUser(data.user)
        toast.success(`Selamat datang, ${data.user.name}!`)
      } else {
        toast.error(data.message || 'Login gagal')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 dark:from-[#0f1117] dark:via-[#111520] dark:to-[#0f1117] transition-colors duration-500">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,oklch(0.75_0.01_50)_0.5px,transparent_0.5px)] bg-[size:20px_20px] opacity-30 dark:opacity-[0.04]" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
            NAUKA INVENTRA
          </h1>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">
            Sistem Operasional Bisnis untuk UMKM
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-sm border border-stone-200/60 dark:border-white/[0.06] rounded-2xl p-7 shadow-xl shadow-stone-200/30 dark:shadow-none">
          <div className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Username
              </label>
              <Input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-11 bg-stone-50 dark:bg-white/[0.04] border-stone-200 dark:border-white/[0.08] text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="h-11 bg-stone-50 dark:bg-white/[0.04] border-stone-200 dark:border-white/[0.08] text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              className="w-full h-11 bg-gradient-to-r from-stone-800 to-stone-900 dark:from-amber-600 dark:to-amber-500 hover:from-stone-700 hover:to-stone-800 dark:hover:from-amber-500 dark:hover:to-amber-400 text-white rounded-xl font-medium shadow-lg shadow-stone-900/10 dark:shadow-amber-500/20 transition-all duration-300 ease-out group mt-2"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Masuk
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-stone-300 dark:text-stone-600 text-[11px] mt-6">
          Demo Environment
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
