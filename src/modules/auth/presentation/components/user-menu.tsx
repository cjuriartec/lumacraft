'use client'

import { useAuth } from '../providers/auth-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/presentation/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/presentation/components/ui/avatar'
import { LogOut, User as UserIcon, Settings } from 'lucide-react'

export default function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null

  const initials = user.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.value[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 outline-none"
          style={{ color: 'rgba(232,240,236,0.7)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,240,236,0.05)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
            <AvatarFallback
              className="text-[11px] font-bold"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p
              className="text-[13px] font-semibold leading-none"
              style={{ color: 'rgba(232,240,236,0.8)' }}
            >
              {user.fullName?.split(' ')[0] || 'Usuario'}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 mt-2 rounded-xl p-1.5"
        style={{
          background: '#030906',
          border: '1px solid rgba(232,240,236,0.07)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <DropdownMenuLabel className="font-normal p-2.5 pb-2">
          <div className="flex flex-col space-y-0.5">
            <p
              className="text-sm font-semibold leading-none"
              style={{ color: '#e8f0ec' }}
            >
              {user.fullName || 'Usuario'}
            </p>
            <p
              className="text-xs leading-none truncate"
              style={{ color: 'rgba(232,240,236,0.5)' }}
            >
              {user.email.value}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator
          style={{ background: 'rgba(232,240,236,0.06)', margin: '4px 0' }}
        />

        <DropdownMenuItem
          className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150"
          style={{ color: 'rgba(232,240,236,0.75)' }}
        >
          <UserIcon size={14} />
          Mi Perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150"
          style={{ color: 'rgba(232,240,236,0.75)' }}
        >
          <Settings size={14} />
          Ajustes
        </DropdownMenuItem>

        <DropdownMenuSeparator
          style={{ background: 'rgba(232,240,236,0.06)', margin: '4px 0' }}
        />

        <DropdownMenuItem
          onClick={() => signOut()}
          className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150"
          style={{ color: 'rgba(248,113,113)' }}
        >
          <LogOut size={14} />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
