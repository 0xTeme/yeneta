let currentAudio: HTMLAudioElement | null = null;
let ttsAbortController: AbortController | null = null;

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
  
  const abortCtrl = new AbortController();
  ttsAbortController = abortCtrl;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, gender }),
      signal: abortCtrl.signal,
    });

    if (!res.ok) throw new Error("TTS failed");

    const audioBlob = await res.blob();
    
    if (abortCtrl.signal.aborted) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) currentAudio = null;
    };

    if (abortCtrl.signal.aborted) return;
    await audio.play();

  } catch (error: any) {
    if (error.name !== "AbortError") console.error("TTS error:", error);
  }
};

export const stopSpeaking = (): void => {
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
  onError: (error: string) => void
): (() => void) | null => {
  if (typeof window === "undefined") return null;

  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) {
    onError("Speech recognition not supported");
    return null;
  }

  const recognition = new SpeechRecognitionAPI();
  recognition.lang = language === "amharic" ? "am-ET" : "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    onResult(event.results[0][0].transcript);
  };
  recognition.onerror = (event: any) => onError(event.error);

  recognition.start();
  return () => recognition.stop();
};