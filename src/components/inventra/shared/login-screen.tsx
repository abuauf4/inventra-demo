'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package } from 'lucide-react'

function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useAppStore()

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Username dan password harus diisi'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (data.success) { setCurrentUser(data.user); toast.success(`Selamat datang, ${data.user.name}!`) }
      else { toast.error(data.message || 'Login gagal') }
    } catch { toast.error('Terjadi kesalahan') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">NAUKA INVENTRA</CardTitle>
          <CardDescription className="text-sm">Sistem Operasional Bisnis untuk UMKM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" type="text" placeholder="Bagas" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
          <Button className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white" onClick={handleLogin} disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</Button>
          <p className="text-xs text-center text-muted-foreground mt-4">Default: Bagas / 122333</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginScreen
