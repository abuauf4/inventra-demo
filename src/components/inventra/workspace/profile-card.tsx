'use client'

import React from 'react'
import { Briefcase, UserCog, PenLine, Warehouse } from 'lucide-react'
import { roleLabels, roleColors } from '@/components/inventra/shared/constants'

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Briefcase className="w-4 h-4" />,
  admin: <UserCog className="w-4 h-4" />,
  staff: <PenLine className="w-4 h-4" />,
  warehouse: <Warehouse className="w-4 h-4" />,
}

interface ProfileCardProps {
  user: { name: string; role: string }
  quote: string
}

export default function ProfileCard({ user, quote }: ProfileCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-rose-500/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-amber-500/15 to-transparent rounded-tr-full" />
      <div className="relative flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleColors[user.role] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl font-bold shadow-lg ring-2 ring-white/20`}>
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold truncate">{user.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 backdrop-blur-sm">
              {roleIcons[user.role]}{roleLabels[user.role] || user.role}
            </span>
            <span className="text-xs text-white/60">Northline Apparel</span>
          </div>
        </div>
      </div>
      <p className="relative mt-4 text-sm text-white/50 italic leading-relaxed">{quote}</p>
    </div>
  )
}
