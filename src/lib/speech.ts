let currentAudio: HTMLAudioElement | null = null;
let ttsAbortController: AbortController | null = null;
let currentPlayToken = 0;
let isPlayingQueue = false;

interface SpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export const speakText = async (
  text: string,
  language: "amharic" | "english",
  gender: "male" | "female" = "female"
): Promise<void> => {
  if (typeof window === "undefined") return;

  stopSpeaking();

  const token = ++currentPlayToken;
  isPlayingQueue = true;

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_~`#]/g, "")
    .replace(/^>+/gm, "")
    .replace(/^[-+]\s/gm, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/\n+/g, " ")
    .trim();

  const rawChunks = cleanText.match(/[^.?!።]+[.?!።]*/g)?.map(s => s.trim()).filter(s => s) || [cleanText];
  
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const phrase of rawChunks) {
    currentChunk += (currentChunk ? " " : "") + phrase;
    if (currentChunk.length > 80) { 
      chunks.push(currentChunk);
      currentChunk = "";
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  for (let i = 0; i < chunks.length; i++) {
    if (token !== currentPlayToken || !isPlayingQueue) break;

    const chunk = chunks[i];
    const abortCtrl = new AbortController();
    ttsAbortController = abortCtrl;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, language, gender }),
        signal: abortCtrl.signal,
      });

      if (!res.ok) throw new Error("TTS failed");
      if (token !== currentPlayToken || !isPlayingQueue) break;

      const audioBlob = await res.blob();
      if (token !== currentPlayToken || !isPlayingQueue) break;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };

        audio.onpause = () => {
          URL.revokeObjectURL(audioUrl);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          if (currentAudio === audio) currentAudio = null;
          reject(new Error("Audio playback failed"));
        };

        if (token !== currentPlayToken || !isPlayingQueue) {
          URL.revokeObjectURL(audioUrl);
          resolve();
          return;
        }

        audio.play().catch(reject);
      });
      
    } catch (error: any) {
      if (error.name !== "AbortError") console.error("TTS chunk error:", error);
      break;
    }
  }
  
  isPlayingQueue = false;
};

export const stopSpeaking = (): void => {
  currentPlayToken++; 
  isPlayingQueue = false;
  
  if (ttsAbortController) {
    ttsAbortController.abort();
    ttsAbortController = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const startListening = (
  language: "amharic" | "english",
  onResult: (text: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
): (() => void) | null => {
  if (typeof window === "undefined") return null;

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    onError("Speech recognition is not supported. Please use Chrome or Edge.");
    onEnd();
    return null;
  }

  let isManuallyStopped = false;
  let recognition: any = null;

  try {
    recognition = new SpeechRecognitionAPI();
    recognition.lang = language === "amharic" ? "am-ET" : "en-US";
    
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return; 
      }

      const errorMap: Record<string, string> = {
        "audio-capture": "No microphone found.",
        "not-allowed": "Microphone permission denied. Check browser settings.",
        "network": "Network error. Speech-to-text requires internet.",
      };

      if (errorMap[event.error]) {
        isManuallyStopped = true;
        onError(errorMap[event.error]);
      }
    };

    recognition.onend = () => {
      if (!isManuallyStopped) {
        try {
          recognition.start();
        } catch {
          onEnd();
        }
      } else {
        onEnd();
      }
    };

    recognition.start();

    return () => {
      isManuallyStopped = true;
      try {
        recognition.stop();
      } catch {}
    };
  } catch (error) {
    onError("Failed to start microphone.");
    onEnd();
    return null;
  }
};