"use client";

import { useMemo } from "react";
import { marked } from "marked";

interface Props {
  content: string;
  isStreaming?: boolean;
}

export default function StreamMarkdown({ content, isStreaming }: Props) {
  const html = useMemo(() => {
    if (!content) return "";
    
    let processedContent = content
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/<img[^>]*>/gi, "");
    
    const result = marked.parse(processedContent, { 
      async: false,
      gfm: true,
      breaks: true 
    });
    
    return typeof result === "string" ? result : "";
  }, [content]);

  if (isStreaming) {
    return (
      <div 
        className="font-body leading-relaxed text-sm [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:font-mono [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div 
      className="font-body leading-relaxed text-sm [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto [&_pre]:bg-[#0d1117] [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border-strong [&_pre]:my-4 [&_code]:font-mono [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_strong]:font-bold [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
