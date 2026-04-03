"use client";

import Link from "next/link";
import { GraduationCap, BookOpen, BrainCircuit, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-noto">
      <header className="px-6 py-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#1a7a4c] p-2 rounded-lg">
            <GraduationCap className="text-white" size={28} />
          </div>
          <span className="text-2xl font-bold text-[#1a1a2e]">የኔታ <span className="text-gray-400 font-normal">| Yeneta</span></span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center mt-10 md:mt-0">
        <div className="inline-block px-4 py-1.5 bg-yellow-100 text-[#f0a500] font-semibold rounded-full text-sm mb-6 border border-yellow-200">
          AI-Powered Ethiopian Study Assistant
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-[#1a1a2e] mb-6 max-w-4xl leading-tight">
          Learn Smarter with <span className="text-[#1a7a4c]">የኔታ</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl">
          Upload your notes, PDFs, or slides. Get instant explanations, summaries, and personalized quizzes in both Amharic and English.
        </p>

        <Link
          href="/chat"
          className="bg-[#1a7a4c] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#135c39] hover:shadow-lg transition-all transform hover:-translate-y-1"
        >
          ጀምር / Get Started
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mt-24 mb-16 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <FileText className="text-[#1a7a4c]" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Document Analysis</h3>
            <p className="text-gray-500 text-sm">Upload PDFs, Word docs, or slides. Yeneta reads and understands your study materials instantly.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="bg-yellow-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="text-[#f0a500]" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Summaries</h3>
            <p className="text-gray-500 text-sm">Get clear, concise explanations and summaries in pure Amharic or English depending on your preference.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="bg-red-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <BrainCircuit className="text-[#e63946]" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Interactive Quizzes</h3>
            <p className="text-gray-500 text-sm">Test your knowledge. Generate multiple-choice quizzes directly from your uploaded materials.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
