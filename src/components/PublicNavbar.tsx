"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import { GraduationCap, ArrowRight, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function PublicNavbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="px-4 py-4 md:px-12 md:py-6 relative z-50 w-full max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        
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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className={`text-sm font-semibold transition-colors ${pathname === '/' ? 'text-primary' : 'text-content-muted hover:text-content'}`}>Home</Link>
          <Link href="/pricing" className={`text-sm font-semibold transition-colors ${pathname === '/pricing' ? 'text-primary' : 'text-content-muted hover:text-content'}`}>Pricing</Link>
          <Link href="/about" className={`text-sm font-semibold transition-colors ${pathname === '/about' ? 'text-primary' : 'text-content-muted hover:text-content'}`}>About</Link>
          
          <div className="h-4 w-px bg-border-strong mx-2" />

          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center gap-1 p-1 rounded-full bg-surface-glass backdrop-blur-md border border-border-subtle hover:bg-surface-hover transition-all duration-200 group shrink-0 shadow-sm"
              aria-label="Toggle theme"
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${resolvedTheme !== 'dark' ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
                <Sun size={14} />
              </div>
              <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-primary text-content-inverse shadow-sm' : 'text-content-muted group-hover:text-content'}`}>
                <Moon size={14} />
              </div>
            </button>
          )}

          {status === "loading" ? (
            <div className="h-10 w-28 bg-surface rounded-full animate-pulse border border-border-subtle shrink-0" />
          ) : status === "authenticated" ? (
            <Link href="/chat" className="text-sm font-bold text-content-inverse bg-primary px-5 py-2.5 rounded-full hover:bg-primary-hover transition-all shadow-sm flex items-center gap-2 group shrink-0">
              Go to Chat <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button onClick={() => signIn("google")} className="text-sm font-bold text-content bg-surface px-5 py-2.5 rounded-full hover:bg-surface-hover transition-all border border-border-strong shadow-sm flex items-center gap-2 shrink-0">
              Sign In
            </button>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-content-muted bg-surface hover:bg-surface-hover border border-border-subtle transition-colors"
            >
              {resolvedTheme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-content-muted bg-surface hover:bg-surface-hover border border-border-subtle transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 bg-surface/95 backdrop-blur-xl border border-border-subtle rounded-2xl p-4 flex flex-col gap-2 shadow-xl md:hidden animate-in fade-in slide-in-from-top-2">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`p-3.5 rounded-xl font-bold text-sm ${pathname === '/' ? 'bg-primary/10 text-primary' : 'text-content hover:bg-surface-hover'}`}>Home</Link>
          <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className={`p-3.5 rounded-xl font-bold text-sm ${pathname === '/pricing' ? 'bg-primary/10 text-primary' : 'text-content hover:bg-surface-hover'}`}>Pricing</Link>
          <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className={`p-3.5 rounded-xl font-bold text-sm ${pathname === '/about' ? 'bg-primary/10 text-primary' : 'text-content hover:bg-surface-hover'}`}>About</Link>
          
          <div className="h-px bg-border-subtle w-full my-2" />
          
          {status === "authenticated" ? (
            <Link href="/chat" className="w-full text-center p-3.5 bg-primary text-content-inverse rounded-xl font-bold text-sm shadow-sm">
              Go to Chat
            </Link>
          ) : (
            <button onClick={() => signIn("google")} className="w-full p-3.5 bg-surface border border-border-strong text-content rounded-xl font-bold text-sm shadow-sm">
              Sign In
            </button>
          )}
        </div>
      )}
    </header>
  );
}
