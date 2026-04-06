"use client";

import {
  Check,
  ChevronDown,
  Laptop,
  LogOut,
  Moon,
  Settings,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/presentation/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";

import { useAuth } from "../providers/auth-provider";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { setTheme, theme } = useTheme();

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.value[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-1.5 p-1 rounded-full transition-all duration-200 outline-none hover:bg-surface-hover/80 border border-transparent hover:border-border/10">
          <Avatar className="h-8 w-8 border border-border/10 shadow-sm">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} className="object-cover" />
            <AvatarFallback className="text-[11px] font-bold bg-surface text-muted border border-border/10">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown
            size={12}
            className="text-muted/30 group-hover:text-muted transition-colors mr-1"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[240px] rounded-2xl p-1.5 bg-surface border-border/50 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-3 py-4 mb-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/10 shadow-sm">
              <AvatarImage src={user.avatarUrl} alt={user.fullName} className="object-cover" />
              <AvatarFallback className="text-xs font-bold bg-background text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5 min-w-0">
              <p className="text-sm font-bold leading-normal truncate text-foreground tracking-tight">
                {user.fullName || "Usuario"}
              </p>
              <p className="text-[11px] font-medium leading-normal truncate text-muted/70">
                {user.email.value}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/20 mx-[-6px]" />

        <div className="p-1 space-y-0.5">
          <DropdownMenuItem className="flex items-center rounded-lg gap-3 cursor-pointer text-[13px] font-semibold py-2.5 px-3 transition-all duration-150 text-foreground/70 hover:bg-surface-hover hover:text-foreground focus:bg-surface-hover focus:text-foreground">
            <div className="bg-foreground/5 p-1.5 rounded-md group-hover:bg-foreground/10 transition-colors">
              <UserIcon size={14} className="text-foreground/60" />
            </div>
            Mi Perfil
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center rounded-lg gap-3 cursor-pointer text-[13px] font-semibold py-2.5 px-3 transition-all duration-150 text-foreground/70 hover:bg-surface-hover hover:text-foreground focus:bg-surface-hover focus:text-foreground">
            <div className="bg-foreground/5 p-1.5 rounded-md">
              <Settings size={14} className="text-foreground/60" />
            </div>
            Ajustes
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center rounded-lg gap-3 cursor-pointer text-[13px] font-semibold py-2.5 px-3 transition-all duration-150 text-foreground/70 hover:bg-surface-hover hover:text-foreground focus:bg-surface-hover focus:text-foreground">
              <div className="bg-foreground/5 h-7 w-7 rounded-md relative flex items-center justify-center shrink-0 overflow-hidden text-foreground/60">
                <Sun
                  size={14}
                  className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 "
                />
                <Moon
                  size={14}
                  className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                />
              </div>
              <span className="flex-1">Apariencia</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                sideOffset={8}
                className="bg-surface border-border/50 rounded-xl p-1.5 min-w-[130px] animate-in fade-in slide-in-from-right-1 duration-200"
              >
                {[
                  { id: "light", label: "Claro", icon: Sun },
                  { id: "dark", label: "Oscuro", icon: Moon },
                  { id: "system", label: "Sistema", icon: Laptop },
                ].map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`flex items-center rounded-lg gap-2.5 text-xs font-semibold py-2 px-2.5 transition-all duration-150 ${
                      theme === id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/65 hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                    {theme === id && <Check size={12} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </div>

        <DropdownMenuSeparator className="bg-border/20 mx-[-6px]" />

        <div className="p-1">
          <DropdownMenuItem
            onClick={() => signOut()}
            className="flex items-center rounded-lg gap-3 cursor-pointer text-[13px] font-bold py-2.5 px-3 transition-all duration-200 text-red-500/80 hover:bg-red-500/10 hover:text-red-500 focus:bg-red-500/10 focus:text-red-500 group"
          >
            <div className="bg-red-500/5 p-1.5 rounded-md group-hover:bg-red-500/10 transition-colors">
              <LogOut size={14} />
            </div>
            Cerrar Sesión
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
