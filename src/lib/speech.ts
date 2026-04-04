let currentAudio: HTMLAudioElement | null = null;
let ttsAbortController: AbortController | null = null;
let currentPlayToken = 0;

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export const speakText = async (
  text: string,
  language: "amharic" | "english",
  gender: "male" | "female" = "female"
): Promise<void> => {
  if (typeof window === "undefined") return;

  stopSpeaking();

  const abortCtrl = new AbortController();
  ttsAbortController = abortCtrl;
  const token = ++currentPlayToken;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, gender }),
      signal: abortCtrl.signal,
    });

    if (!res.ok) throw new Error("TTS failed");
    if (token !== currentPlayToken) return;

    const audioBlob = await res.blob();
    if (token !== currentPlayToken) return;

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

      if (token !== currentPlayToken) {
        URL.revokeObjectURL(audioUrl);
        resolve();
        return;
      }

      audio.play().catch(reject);
    });
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.error("TTS error:", error);
    }
  }
};

export const stopSpeaking = (): void => {
  currentPlayToken++;

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

  try {
    const recognition = new SpeechRecognitionAPI();

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
      const errorMap: Record<string, string> = {
        "no-speech": "No speech detected. Please speak louder.",
        aborted: "Microphone was stopped.",
        "audio-capture": "No microphone found.",
        "not-allowed": "Microphone permission denied. Check browser settings.",
        network: "Network error. Speech-to-text requires internet.",
      };
      
      if (event.error !== "aborted" && event.error !== "no-speech") {
        onError(errorMap[event.error] || `Mic error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      onEnd(); 
    };

    recognition.start();

    return () => {
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