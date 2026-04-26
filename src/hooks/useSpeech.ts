import { useState, useEffect, useRef } from "react";
import type { Language } from "@/types";

const LANG_MAP: Record<string, string> = {
  "Auto":    "en-US",
  "English": "en-US",
  "Nepali":  "ne-NP",
  "Tamang":  "ne-NP"
};

export function useSpeech(sourceLang: Language, _targetLang: Language) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [dictateError, setDictateError] = useState("");
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localRecognitionRef = useRef<any>(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    const interval = setInterval(loadVoices, 500);
    return () => clearInterval(interval);
  }, []);

  const stopAll = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeakingSource(false);
    setIsSpeakingTarget(false);
  };

  const speak = (text: string, lang: Language, onState: (val: boolean) => void) => {
    stopAll();
    const langCode = LANG_MAP[lang] || "ne-NP";
    const voice = availableVoices.find(v => v.lang.startsWith(langCode.split("-")[0]));
    
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = playbackSpeed;
      utterance.onstart = () => onState(true);
      utterance.onend = () => onState(false);
      window.speechSynthesis.speak(utterance);
    } else {
      const tl = lang === "English" ? "en" : "ne";
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;
      audio.onplay = () => onState(true);
      audio.onended = () => onState(false);
      audio.play().catch(() => onState(false));
    }
  };

  const toggleDictate = (onFinal: (text: string) => void) => {
    if (listening) {
      stopDictate();
      return;
    }
    startDictate(onFinal);
  };

  const startDictate = (onFinal: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    localRecognitionRef.current = recognition;
    recognition.lang = LANG_MAP[sourceLang];
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => { setListening(true); setDictateError(""); };
    recognition.onresult = (e: any) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) onFinal(final);
      setInterimText(interim);
    };
    recognition.onerror = (e: any) => setDictateError(e.error);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const stopDictate = () => {
    localRecognitionRef.current?.stop();
    setListening(false);
  };

  return {
    listening, interimText, dictateError, isSpeakingSource, isSpeakingTarget, playbackSpeed,
    setPlaybackSpeed, speak, stopAll, toggleDictate
  };
}
