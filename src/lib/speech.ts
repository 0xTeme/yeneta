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

  // Split into sentence-like chunks with markers for pause types
  // Marker: @PAUSE for short pause (sentence end), @BREAK for longer pause (newline)
  const allChunks: { text: string; pause: number }[] = [];
  
  // Split on newlines first, then handle sentence endings
  const paragraphs = cleanText.split(/\n/);
  
  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p].trim();
    if (!para) continue;
    
    // Split paragraph by sentence endings: . ? ! ።
    const sentences = para.match(/[^.?!።]+[.?!።]*/g) || [para];
    
    for (let s = 0; s < sentences.length; s++) {
      const sentence = sentences[s].trim();
      if (!sentence) continue;
      
      // Determine pause type after this sentence
      const endsWithAmharicPeriod = /።$/.test(sentence);
      const isLastInParagraph = s === sentences.length - 1;
      const isLastParagraph = p === paragraphs.length - 1;
      const hasNewlineAfter = !isLastParagraph && paragraphs[p + 1]?.trim();
      
      let pauseMs = 0;
      if (endsWithAmharicPeriod) {
        pauseMs = 150; // Add pause for Amharic sentence ending TTS doesn't recognize
      } else if (hasNewlineAfter) {
        pauseMs = 100; // Brief pause before newline
      }
      
      // Combine short sentences into ~100 char chunks
      if (allChunks.length > 0 && allChunks[allChunks.length - 1].text.length + sentence.length < 100) {
        allChunks[allChunks.length - 1].text += " " + sentence;
      } else if (sentence) {
        allChunks.push({ text: sentence, pause: pauseMs });
      }
    }
  }
  
  if (allChunks.length === 0) allChunks.push({ text: cleanText.slice(0, 100), pause: 0 });

  try {
    for (let i = 0; i < allChunks.length; i++) {
      if (token !== currentPlayToken || !isPlayingQueue) break;

      const { text: chunk, pause } = allChunks[i];
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

      // Controlled pause based on sentence type
      if (pause > 0 && i < allChunks.length - 1 && token === currentPlayToken && isPlayingQueue) {
        await new Promise(resolve => setTimeout(resolve, pause));
      }
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