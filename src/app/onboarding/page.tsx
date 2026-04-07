"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, GraduationCap, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function OnboardingPage() {
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    role: "student",
    level: "high_school",
    gender: "female",
    aiVoice: "female"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await update();
        window.location.href = "/chat";
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || "Failed to save profile.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setErrorMsg("A network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-body text-content">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md bg-surface-glass backdrop-blur-md shadow-2xl border border-border-subtle rounded-3xl p-8 md:p-10 z-10 animate-in fade-in slide-in-from-bottom-8">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-3 rounded-2xl shadow-sm border border-primary/20">
            <GraduationCap className="text-content-inverse" size={32} />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline mb-2">Welcome to Yeneta</h1>
          <p className="text-content-muted text-sm">Please complete your profile to continue.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-error-muted border border-error-base/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-error-text shrink-0" size={18} />
            <p className="text-sm font-medium text-error-text">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-content uppercase tracking-wider font-label">I am a...</label>
            <div className="relative">
              <select 
                className="appearance-none bg-background border border-border-strong rounded-xl py-3.5 pl-4 pr-10 text-sm font-medium text-content focus:ring-2 focus:ring-primary/40 focus:border-primary w-full outline-none transition-all cursor-pointer"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-content uppercase tracking-wider font-label">Education Level</label>
            <div className="relative">
              <select 
                className="appearance-none bg-background border border-border-strong rounded-xl py-3.5 pl-4 pr-10 text-sm font-medium text-content focus:ring-2 focus:ring-primary/40 focus:border-primary w-full outline-none transition-all cursor-pointer"
                value={formData.level}
                onChange={e => setFormData({...formData, level: e.target.value})}
              >
                <option value="primary">Primary School</option>
                <option value="high_school">High School</option>
                <option value="university">University / College</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-content uppercase tracking-wider font-label">Gender <span className="text-content-muted font-normal lowercase">(For Amharic grammar)</span></label>
            <div className="relative">
              <select 
                className="appearance-none bg-background border border-border-strong rounded-xl py-3.5 pl-4 pr-10 text-sm font-medium text-content focus:ring-2 focus:ring-primary/40 focus:border-primary w-full outline-none transition-all cursor-pointer"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="female">Female (ሴት)</option>
                <option value="male">Male (ወንድ)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={16} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2 shadow-sm mt-8 disabled:opacity-70"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Complete Profile"}
            {!isLoading && <ArrowRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}