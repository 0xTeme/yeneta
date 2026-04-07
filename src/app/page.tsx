"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { BookOpen, BrainCircuit, FileText, ArrowRight, Sparkles, Globe, Mic, ShieldCheck } from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";

export default function LandingPage() {
  const { status } = useSession();

  return (
    <div className="min-h-screen bg-background flex flex-col font-body text-content relative overflow-hidden">
      
      {/* Background Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-12 md:mt-0 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-muted text-primary font-bold rounded-full text-[0.8125rem] mb-8 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500 font-label tracking-wide uppercase">
          <Sparkles size={14} />
          AI-Powered Ethiopian Study Assistant
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 mb-4 max-w-4xl leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 font-headline">
          የኔታ | Yeneta
        </h1>

        <p className="text-2xl md:text-3xl font-bold text-content mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 font-headline tracking-tight">
          Your Language. Your Learning.
        </p>
        
        {/* Trust / Value Strip */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-10 opacity-80 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="flex items-center gap-2 text-content-muted text-sm font-semibold"><Globe size={18} className="text-primary" /> Bilingual (Am & En)</div>
          <div className="flex items-center gap-2 text-content-muted text-sm font-semibold"><ShieldCheck size={18} className="text-primary" /> Personalized AI</div>
          <div className="flex items-center gap-2 text-content-muted text-sm font-semibold"><FileText size={18} className="text-primary" /> Document-Based</div>
          <div className="flex items-center gap-2 text-content-muted text-sm font-semibold"><Mic size={18} className="text-primary" /> Voice Enabled</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          {status === "authenticated" ? (
            <Link
              href="/chat"
              className="bg-primary text-content-inverse px-8 py-4 rounded-xl text-base font-bold hover:bg-primary-hover shadow-[0_0_30px_rgba(26,122,76,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2 group"
            >
              ወደ ቻት ይግቡ <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="bg-primary text-content-inverse px-8 py-4 rounded-xl text-base font-bold hover:bg-primary-hover shadow-[0_0_30px_rgba(26,122,76,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center gap-3"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Sign in with Google / ግባ
            </button>
          )}
          <Link
            href="/about"
            className="bg-surface text-content px-8 py-4 rounded-xl text-base font-bold hover:bg-surface-hover border border-border-strong transition-all flex items-center gap-2"
          >
            Learn More
          </Link>
        </div>

        <p className="text-lg md:text-xl text-content-muted mt-20 max-w-2xl leading-relaxed animate-in fade-in duration-1000 delay-500">
          Upload your notes, PDFs, or slides. Get instant explanations, 
          summaries, and personalized quizzes in both Amharic and English.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mt-16 mb-24 text-left animate-in fade-in slide-in-from-bottom-12 duration-700 delay-700">
          
          <div className="bg-surface-glass backdrop-blur-md p-8 rounded-3xl shadow-sm border border-border-subtle hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
            <div className="bg-primary-muted w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="text-primary" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-content font-headline">Document Analysis</h3>
            <p className="text-content-muted text-sm leading-relaxed">
              Upload PDFs, Word docs, or slides. Yeneta reads and understands your study materials instantly, turning static files into interactive tutors.
            </p>
          </div>

          <div className="bg-surface-glass backdrop-blur-md p-8 rounded-3xl shadow-sm border border-border-subtle hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg group">
            <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="text-blue-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-content font-headline">Smart Summaries</h3>
            <p className="text-content-muted text-sm leading-relaxed">
              Get clear, concise explanations and summaries in pure Amharic or English. Break down complex topics into simple, digestible bullet points.
            </p>
          </div>

          <div className="bg-surface-glass backdrop-blur-md p-8 rounded-3xl shadow-sm border border-border-subtle hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg group">
            <div className="bg-orange-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BrainCircuit className="text-orange-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-content font-headline">Interactive Quizzes</h3>
            <p className="text-content-muted text-sm leading-relaxed">
              Test your knowledge instantly. Generate multiple-choice quizzes directly from your uploaded materials to reinforce what you've learned.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
