type TTSListener = (isPlaying: boolean) => void;
const ttsListeners = new Set<TTSListener>();
let isPlayingQueue = false;

export const subscribeToTTS = (listener: TTSListener) => {
  ttsListeners.add(listener);
  listener(isPlayingQueue);
  return () => ttsListeners.delete(listener);
};

const setTTSState = (state: boolean) => {
  isPlayingQueue = state;
  ttsListeners.forEach((l) => l(state));
};

let currentAudio: HTMLAudioElement | null = null;
let ttsAbortController: AbortController | null = null;
let currentPlayToken = 0;

export const speakText = async (text: string, language: "amharic" | "english", gender: "male" | "female" = "female"): Promise<void> => {
  if (typeof window === "undefined") return;

  const token = ++currentPlayToken;
  setTTSState(true);

  // Stop any current playback immediately without resetting the token
  if (ttsAbortController) { ttsAbortController.abort(); ttsAbortController = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "") 
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") 
    .replace(/[*_~`#]/g, "") 
    .replace(/^>+/gm, "") 
    .replace(/^[-+]\s/gm, "") 
    .replace(/^\d+\.\s/gm, "") 
    .trim();

  // Simple chunking: split by newlines, send to TTS as-is, let TTS handle prosody
  const lines = cleanText.split(/\n/).filter(l => l.trim());
  const chunks = lines.filter(l => l).slice(0, 10); // Limit chunks
  if (chunks.length === 0) chunks.push(cleanText.slice(0, 500));

  try {
    for (let i = 0; i < chunks.length; i++) {
      if (token !== currentPlayToken || !isPlayingQueue) break;

      const chunk = chunks[i];
      const abortCtrl = new AbortController();
      ttsAbortController = abortCtrl;

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
        audio.onended = () => { URL.revokeObjectURL(audioUrl); if (currentAudio === audio) currentAudio = null; resolve(); };
        audio.onpause = () => { URL.revokeObjectURL(audioUrl); if (currentAudio === audio) currentAudio = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(audioUrl); if (currentAudio === audio) currentAudio = null; reject(new Error("Playback failed")); };
        if (token !== currentPlayToken || !isPlayingQueue) { URL.revokeObjectURL(audioUrl); resolve(); return; }
        audio.play().catch(reject);
      });

    }
  } catch (error: any) {
    if (error.name !== "AbortError") console.error("TTS error:", error);
  } finally {
    if (token === currentPlayToken) setTTSState(false);
  }
};

export const stopSpeaking = (): void => {
  currentPlayToken++; 
  setTTSState(false);
  
  if (ttsAbortController) { ttsAbortController.abort(); ttsAbortController = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
};

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export const startRecordingAudio = async (
  onResult: (text: string) => void,
  onError: (error: string) => void,
  onStart: () => void
): Promise<() => void> => {
  if (typeof window === "undefined") return () => {};

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      try {
        const res = await fetch("/api/stt", { method: "POST", body: formData });
        const data = await res.json();
        if (data.text) onResult(data.text);
        else onError(data.error || "Could not understand audio.");
      } catch (err) {
        onError("Network error during transcription.");
      }
    };

    mediaRecorder.start();
    onStart();

    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    };
  } catch (err) {
    onError("Microphone permission denied.");
    return () => {};
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