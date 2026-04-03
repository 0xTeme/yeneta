"use client";

import { useState } from "react";
import { Quiz, Language } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  quiz: Quiz;
  language: Language;
}

export default function QuizCard({ quiz, language }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const question = quiz.questions[currentIndex];
  const isFinished = currentIndex >= quiz.questions.length;

  const handleSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option.startsWith(question.correct + ")")) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResult(true);
    }
  };

  if (isFinished || showResult) {
    return (
      <div className="bg-white border border-[#f0a500] p-6 rounded-xl shadow-sm text-center">
        <h3 className="text-xl font-bold mb-2 text-[#1a1a2e]">
          {language === "amharic" ? "ፈተና ተጠናቋል!" : "Quiz Completed!"}
        </h3>
        <p className="text-lg mb-4 text-[#1a7a4c] font-semibold">
          {language === "amharic" ? "ውጤት:" : "Score:"} {score} / {quiz.questions.length}
        </p>
      </div>
    );
  }

  const isAmharic = language === "amharic";

  return (
    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm w-full max-w-md my-2">
      <h4 className="font-bold text-[#1a7a4c] mb-1">{quiz.title}</h4>
      <p className="text-sm text-gray-500 mb-4">
        {isAmharic ? "ጥያቄ" : "Question"} {currentIndex + 1} {isAmharic ? "ከ" : "of"} {quiz.questions.length}
      </p>
      
      <p className="text-[#1a1a2e] mb-4 font-medium">{question.question}</p>

      <div className="flex flex-col gap-2 mb-4">
        {question.options.map((option, idx) => {
          const isSelected = selectedOption === option;
          const isCorrect = option.startsWith(question.correct + ")");
          const showColors = selectedOption !== null;

          let btnClass = "border-gray-200 hover:border-[#1a7a4c] bg-white";
          if (showColors) {
            if (isCorrect) btnClass = "border-[#1a7a4c] bg-green-50 text-[#1a7a4c]";
            else if (isSelected && !isCorrect) btnClass = "border-[#e63946] bg-red-50 text-[#e63946]";
            else btnClass = "border-gray-100 opacity-50";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={selectedOption !== null}
              className={`p-3 text-left border rounded-lg transition-all flex justify-between items-center ${btnClass}`}
            >
              <span>{option}</span>
              {showColors && isCorrect && <CheckCircle2 size={18} className="text-[#1a7a4c]" />}
              {showColors && isSelected && !isCorrect && <XCircle size={18} className="text-[#e63946]" />}
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm mb-4">
          <p><strong>{isAmharic ? "ማብራሪያ:" : "Explanation:"}</strong> {question.explanation}</p>
        </div>
      )}

      {selectedOption && (
        <button
          onClick={handleNext}
          className="w-full bg-[#1a7a4c] text-white font-medium py-2 rounded-lg hover:bg-[#135c39] transition-colors"
        >
          {isAmharic ? "ቀጣይ ጥያቄ" : "Next Question"}
        </button>
      )}
    </div>
  );
}
