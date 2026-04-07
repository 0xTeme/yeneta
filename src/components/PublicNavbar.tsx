"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { GraduationCap, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function PublicNavbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true),[]);

  return (
    <header className="px-6 py-6 md:px-12 flex items-center justify-between relative z-50 w-full max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl shadow-sm border border-primary/20 group-hover:brightness-110 transition-all shrink-0">
            <GraduationCap className="text-content-inverse" size={24} />
          </div>
          <div className="flex flex-col justify-center truncate">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-content leading-none font-headline truncate">Yeneta</h1>
            <span className="hidden md:block text-[0.55rem] font-bold text-primary tracking-[0.2em] uppercase mt-0.5 font-label opacity-80 truncate">የኔታ</span>
          </div>
        </Link>
      </div>

      <nav className="flex items-center gap-4 sm:gap-6">
        <Link 
          href="/" 
          className={`text-sm font-semibold transition-colors hidden md:block ${pathname === '/' ? 'text-primary' : 'text-content-muted hover:text-content'}`}
        >
          Home
        </Link>
        <Link 
          href="/pricing" 
          className={`text-sm font-semibold transition-colors hidden md:block ${pathname === '/pricing' ? 'text-primary' : 'text-content-muted hover:text-content'}`}
        >
          Pricing
        </Link>
        <Link 
          href="/about" 
          className={`text-sm font-semibold transition-colors hidden md:block ${pathname === '/about' ? 'text-primary' : 'text-content-muted hover:text-content'}`}
        >
          About
        </Link>
        
        <div className="h-4 w-px bg-border-strong hidden md:block mx-2" />

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-1 p-1 rounded-full bg-surface-glass backdrop-blur-md border border-border-subtle hover:bg-surface-hover transition-all duration-200 group shrink-0 shadow-sm"
            aria-label="Toggle theme"
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${theme !== 'dark' ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
              <Sun size={14} />
            </div>
            <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
              <Moon size={14} />
            </div>
          </button>
        )}

        {/* Auth CTA */}
        {status === "loading" ? (
          <div className="h-10 w-28 bg-surface rounded-full animate-pulse border border-border-subtle shrink-0" />
        ) : status === "authenticated" ? (
          <Link
            href="/chat"
            className="text-sm font-bold text-content-inverse bg-primary px-5 py-2.5 rounded-full hover:bg-primary-hover transition-all shadow-sm flex items-center gap-2 group shrink-0"
          >
            Go to Chat <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="text-sm font-bold text-content bg-surface px-5 py-2.5 rounded-full hover:bg-surface-hover transition-all border border-border-strong shadow-sm flex items-center gap-2 shrink-0"
          >
            Sign In
          </button>
        )}
      </nav>
    </header>
  );
}
