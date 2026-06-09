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
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,oklch(0.80_0.005_260)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            NAUKA INVENTRA
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Sistem Operasional Bisnis untuk UMKM
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-7 shadow-sm">
          <div className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Username
              </label>
              <Input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-11 bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-300 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="h-11 bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-300 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium shadow-sm transition-all group mt-2"
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
        <p className="text-center text-stone-300 text-[11px] mt-6">
          Demo Environment
        </p>
      </div>
    </div>
  )
}

export default LoginScreen
