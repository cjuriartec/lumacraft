"use client";

import { Check, Laptop, LogOut, Moon, Settings, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/presentation/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 outline-none text-foreground/70 hover:bg-foreground/5">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
            <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left justify-center pl-1 gap-1">
            <p className="text-[13px] font-semibold leading-none text-foreground truncate max-w-[130px]">
              {user.fullName || "Usuario"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 mt-2 rounded-xl p-1.5 bg-sidebar border-border/10 shadow-2xl"
      >
        <DropdownMenuLabel className="font-normal p-3 pb-2 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
            <AvatarFallback className="text-[12px] font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5 min-w-0">
            <p className="text-sm font-semibold leading-none truncate text-foreground">
              {user.fullName || "Usuario"}
            </p>
            <p className="text-[11px] leading-none truncate text-foreground/50">
              {user.email.value}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-foreground/5 my-1 mt-2" />

        <DropdownMenuItem className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150 text-foreground/75 hover:bg-foreground/5 hover:text-foreground">
          <UserIcon size={14} />
          Mi Perfil
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150 text-foreground/75 hover:bg-foreground/5 hover:text-foreground">
          <Settings size={14} />
          Ajustes
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150 text-foreground/75 hover:bg-foreground/5 hover:text-foreground focus:bg-foreground/5">
            <Sun
              size={14}
              className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
            />
            <Moon
              size={14}
              className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            />
            Apariencia
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="bg-sidebar border-border/10">
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={`text-xs gap-2 ${theme === "light" ? "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary" : "text-foreground/75 hover:text-foreground focus:text-foreground hover:bg-foreground/5 focus:bg-foreground/5"}`}
              >
                <Sun size={14} />
                Claro
                {theme === "light" && <Check size={14} className="ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={`text-xs gap-2 ${theme === "dark" ? "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary" : "text-foreground/75 hover:text-foreground focus:text-foreground hover:bg-foreground/5 focus:bg-foreground/5"}`}
              >
                <Moon size={14} />
                Oscuro
                {theme === "dark" && <Check size={14} className="ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("system")}
                className={`text-xs gap-2 ${theme === "system" ? "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary" : "text-foreground/75 hover:text-foreground focus:text-foreground hover:bg-foreground/5 focus:bg-foreground/5"}`}
              >
                <Laptop size={14} />
                Sistema
                {theme === "system" && <Check size={14} className="ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="bg-foreground/5 my-1" />

        <DropdownMenuItem
          onClick={() => signOut()}
          className="rounded-lg gap-2.5 cursor-pointer text-sm py-2 px-2.5 transition-colors duration-150 text-red-500 hover:bg-red-500/10 hover:text-red-600 focus:bg-red-500/10 focus:text-red-500"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
