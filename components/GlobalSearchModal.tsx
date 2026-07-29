"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  Package,
  Users,
  FileText,
  UserCheck,
  Compass,
  ArrowRight,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Layers,
  Building,
  Tag,
  Boxes,
  Sparkles,
  ShieldCheck,
  Info,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  BookOpen,
  HelpCircle,
  Zap,
  Command,
  CornerDownLeft,
  Sliders,
  TrendingUp,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
  ShoppingBag,
  Share2,
  Trash2,
  AlertTriangle,
  Database,
  Mic,
  MicOff,
  Globe,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoVoiceStart?: boolean;
  onVoiceStartHandled?: () => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  autoVoiceStart = false,
  onVoiceStartHandled,
}: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Salim Voice Search & Vocal Response (TTS) State
  const [selectedLang] = useState("en-IN");
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isOpenRef = useRef(isOpen);

  // Sync isOpenRef & cancel active speech/recognition when modal closes
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      setIsListening(false);
      setVocalSpeaking(false);
      setVocalText(null);
    }
  }, [isOpen]);

  // Salim Speech Synthesis (TTS Vocal Replies)
  const [vocalEnabled, setVocalEnabled] = useState(true);
  const [vocalSpeaking, setVocalSpeaking] = useState(false);
  const [vocalText, setVocalText] = useState<string | null>(null);

  // Voice Selector for Salim Speech Synthesis (Prefers Male/Neutral Voices)
  const getSalimVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const maleKeywords = [
      "ravi", "karan", "hemant", "harish", "gautam", "neel", "george", "david", "mark",
      "microsoft ravi", "google hindi", "google english (india)", "male", "en-in", "hi-in"
    ];

    // 1. Try finding Indian male voice first
    let found = voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isIndian = lang.includes("en-in") || lang.includes("hi-in") || name.includes("india");
      const isMale = maleKeywords.some((m) => name.includes(m)) && !name.includes("female") && !name.includes("zira") && !name.includes("swara");
      return isIndian && isMale;
    });

    // 2. Fallback to any en-IN or hi-IN voice
    if (!found) {
      found = voices.find((v) => v.lang.toLowerCase().includes("en-in") || v.lang.toLowerCase().includes("hi-in"));
    }

    // 3. Fallback to general male voices
    if (!found) {
      found = voices.find((v) => {
        const name = v.name.toLowerCase();
        return maleKeywords.some((m) => name.includes(m));
      });
    }

    return found || voices.find((v) => v.lang.startsWith("en")) || voices[0];
  };

  const speakText = useCallback(
    (text: string) => {
      if (!vocalEnabled || !text || typeof window === "undefined") return;

      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95; // Natural cadence
          utterance.pitch = 1.0; // Friendly natural pitch for Salim
          utterance.lang = "en-IN"; // Set locale

          const salimVoice = getSalimVoice();
          if (salimVoice) {
            utterance.voice = salimVoice;
          }

          utterance.onstart = () => {
            setVocalSpeaking(true);
            setVocalText(text);
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (e) {}
            }
          };

          utterance.onend = () => {
            setVocalSpeaking(false);
            setVocalText(null);
            // Salim Dialogue Loop: Automatically turn on microphone AFTER assistant finishes speaking ONLY IF modal is still open!
            setTimeout(() => {
              if (isOpenRef.current) {
                toggleVoiceSearch();
              }
            }, 350);
          };

          utterance.onerror = () => {
            setVocalSpeaking(false);
            setVocalText(null);
          };

          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error("Speech synthesis error:", e);
      }
    },
    [vocalEnabled]
  );

  // Auto Voice Start when opened via "Hey Salim" wake-word
  useEffect(() => {
    if (isOpen && autoVoiceStart) {
      if (onVoiceStartHandled) onVoiceStartHandled();
      const timer = setTimeout(() => {
        speakText("Haan ji! Main aapki kya help kar sakta hu?");
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoVoiceStart, onVoiceStartHandled, speakText]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVocalSpeaking(false);
    setVocalText(null);
  };

  // E-Commerce style filters
  const [inStockOnly, setInStockOnly] = useState(false);
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);
  const [highBalanceOnly, setHighBalanceOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [dynamicTrending, setDynamicTrending] = useState<any[]>([]);

  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = selectedLang;

      rec.onstart = () => {
        setIsListening(true);
        setTranscriptPreview("");
      };

      rec.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscriptPreview(text);
        setQuery(text);
        setSelectedIndex(0);
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech" || event.error === "aborted") {
          setVoiceError("No speech heard. Tap mic 🎙️ and speak again.");
          setTimeout(() => {
            setVoiceError((prev) => (prev?.includes("No speech heard") ? null : prev));
          }, 4000);
          return;
        }

        console.warn("Voice search notice:", event.error);
        if (event.error === "not-allowed") {
          setVoiceError("Microphone access denied. Please allow mic permissions in browser.");
        } else {
          setVoiceError(`Voice notice: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("Failed voice search:", err);
      setIsListening(false);
      setVoiceError("Could not access microphone.");
    }
  };

  const [results, setResults] = useState<{
    products: any[];
    customers: any[];
    vouchers: any[];
    users: any[];
    navigation: any[];
  }>({
    products: [],
    customers: [],
    vouchers: [],
    users: [],
    navigation: [],
  });
  const [totalResults, setTotalResults] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mabsol_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch dynamic live trending items when modal opens or query is empty
  useEffect(() => {
    if (isOpen && !query.trim()) {
      fetch("/api/global-search?q=")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.trending)) {
            setDynamicTrending(data.trending);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, query]);

  const saveRecentSearch = (term: string) => {
    if (!term || term.trim().length < 2) return;
    try {
      const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem("mabsol_recent_searches", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem("mabsol_recent_searches", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("mabsol_recent_searches");
    } catch (e) {
      // ignore
    }
  };

  // Focus input & handle vocal speech cleanup when modal state changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      stopSpeaking();
      setQuery("");
      setSelectedItem(null);
      setSelectedIndex(0);
      setInStockOnly(false);
      setNearExpiryOnly(false);
      setHighBalanceOnly(false);
      setSortBy("relevance");
    }
  }, [isOpen]);

  // Debounced search API fetch with filters & Alexa Speech Synthesis trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        products: [],
        customers: [],
        vouchers: [],
        users: [],
        navigation: [],
      });
      setTotalResults(0);
      setDidYouMean(null);
      setLoading(false);
      stopSpeaking();
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        category: activeCategory,
        inStock: inStockOnly ? "true" : "false",
        nearExpiry: nearExpiryOnly ? "true" : "false",
        highBalance: highBalanceOnly ? "true" : "false",
        sortBy: sortBy,
      });

      fetch(`/api/global-search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setResults(data.results);
            setTotalResults(data.totalResults);
            setDidYouMean(data.didYouMean || null);
            if (data.vocalSummary && vocalEnabled) {
              speakText(data.vocalSummary);
            }
            // Execute Autonomous Voice Action Command
            if (data.actionCommand) {
              const cmd = data.actionCommand.command;
              if (cmd === "OPEN_RESULT_INDEX") {
                const targetIdx = data.actionCommand.index;
                setTimeout(() => {
                  const flat = getFlatResults();
                  if (flat[targetIdx]) {
                    handleItemClick(flat[targetIdx]);
                  }
                }, 900);
              } else if (cmd === "OPEN_RESULT_TITLE") {
                const targetTitle = (data.actionCommand.targetTitle || "").toLowerCase();
                setTimeout(() => {
                  const flat = getFlatResults();
                  const match = flat.find((item) =>
                    item.title.toLowerCase().includes(targetTitle)
                  );
                  if (match) {
                    handleItemClick(match);
                  }
                }, 900);
              } else if (cmd === "NAVIGATE_CREATE_BILL") {
                setTimeout(() => {
                  onClose();
                  router.push("/dashboard/sales/invoice/create");
                }, 1600);
              } else if (cmd === "TOGGLE_IN_STOCK") {
                setInStockOnly(true);
              } else if (cmd === "TOGGLE_NEAR_EXPIRY") {
                setNearExpiryOnly(true);
              }
            }
          }
        })
        .catch((err) => {
          console.error("Global search error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [query, activeCategory, inStockOnly, nearExpiryOnly, highBalanceOnly, sortBy, vocalEnabled, speakText, onClose, router]);

  // Flatten active results for keyboard navigation
  const getFlatResults = useCallback(() => {
    const flat: any[] = [];
    if (activeCategory === "all" || activeCategory === "products") flat.push(...results.products);
    if (activeCategory === "all" || activeCategory === "customers") flat.push(...results.customers);
    if (activeCategory === "all" || activeCategory === "vouchers") flat.push(...results.vouchers);
    if (activeCategory === "all" || activeCategory === "users") flat.push(...results.users);
    if (activeCategory === "all" || activeCategory === "navigation") flat.push(...results.navigation);
    return flat;
  }, [results, activeCategory]);

  // Global Escape key listener to close modal instantly
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedItem) {
          setSelectedItem(null);
        } else {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          setVocalSpeaking(false);
          setVocalText(null);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, selectedItem, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (selectedItem) {
        setSelectedItem(null);
      } else {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setVocalSpeaking(false);
        setVocalText(null);
        onClose();
      }
      return;
    }

    const flat = getFlatResults();
    if (flat.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flat.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flat.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[selectedIndex]) {
        handleItemClick(flat[selectedIndex]);
      }
    }
  };

  const handleItemClick = (item: any) => {
    saveRecentSearch(item.title);

    if (item.actionUrl) {
      onClose();
      router.push(item.actionUrl);
    }
  };

  const copyDetailsToClipboard = (item: any) => {
    try {
      const formatted = `${item.title}\nCategory: ${item.category}\nSubtitle: ${item.subtitle}\nDetails: ${JSON.stringify(item.details, null, 2)}`;
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-2 sm:pt-8 px-2 sm:px-4 bg-slate-950/75 backdrop-blur-md transition-all animate-fadeIn">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Search Modal Container */}
      <div
        className={`relative w-full ${
          showGuide ? "max-w-6xl" : "max-w-4xl"
        } bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 transition-all duration-300 transform scale-100`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 gap-3">
          <div className="flex items-center justify-center text-indigo-600 shrink-0">
            {loading ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-indigo-600" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search sidebar links, file names, products, stock, customers, vouchers, reports..."
            className="w-full text-base sm:text-lg font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Voice Search Mic & Alexa Vocal Response Controls */}
          <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-200 pl-2">
            {/* Vocal Toggle (TTS) */}
            <button
              onClick={() => {
                if (vocalSpeaking) stopSpeaking();
                setVocalEnabled((v) => !v);
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                vocalEnabled
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100"
                  : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
              title={vocalEnabled ? "Salim Vocal Answers Enabled (Click to Mute)" : "Salim Vocal Answers Muted (Click to Enable)"}
            >
              {vocalEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Microphone Button */}
            <button
              onClick={toggleVoiceSearch}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-600 text-white shadow-lg scale-105 animate-pulse"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80"
              }`}
              title={isListening ? "Stop Voice Search" : "Speak to Search (Salim Voice AI)"}
            >
              {isListening ? (
                <>
                  <span className="absolute inset-0 rounded-xl bg-rose-500 animate-ping opacity-75" />
                  <MicOff className="w-4 h-4 relative z-10" />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Toggle Guide Sidebar Button */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
              showGuide
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
            title="Toggle Search Capabilities Guide"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Search Guide</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 shrink-0 pl-1">
            <kbd className="px-2 py-1 text-[11px] font-semibold text-slate-500 bg-slate-200/70 rounded-md border border-slate-300 shadow-2xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Holographic Salim Liquid Orb & Conversational State Banner */}
        {(vocalSpeaking || isListening) && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 text-white text-xs font-semibold border-b border-indigo-800/80 shadow-2xl animate-fadeIn relative overflow-hidden">
            {/* Ambient Liquid Gradient Orb Glow Background */}
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl animate-pulse" />

            <div className="flex items-center gap-3.5 min-w-0 relative z-10">
              {/* Salim Voice Orb */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                  isListening
                    ? "bg-gradient-to-tr from-rose-500 via-purple-500 to-cyan-400 animate-pulse scale-110 shadow-rose-500/50"
                    : "bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 animate-spin [animation-duration:4s] shadow-indigo-500/50"
                } shadow-lg p-0.5 shrink-0`}
              >
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                  {isListening ? (
                    <Mic className="w-4 h-4 text-rose-400 animate-pulse" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-pink-300 uppercase tracking-widest text-[10px]">
                    {vocalSpeaking ? "Salim AI Speaking 🔊" : "Salim Listening... Speak your request 🎙️"}
                  </span>
                  <span className="flex items-center gap-0.5 h-3">
                    <span className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                    <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms] h-full" />
                    <span className="w-1 bg-pink-400 rounded-full animate-bounce [animation-delay:300ms] h-full" />
                  </span>
                </div>
                <p className="truncate text-indigo-100 font-semibold italic text-xs mt-0.5">
                  {vocalSpeaking
                    ? `"${vocalText}"`
                    : transcriptPreview
                    ? `Hearing: "${transcriptPreview}"`
                    : `Listening... Speak request or say "Pehla kholo"`}
                </p>
              </div>
            </div>

            {vocalSpeaking ? (
              <button
                onClick={stopSpeaking}
                className="px-3 py-1.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 font-extrabold text-[11px] shrink-0 cursor-pointer shadow-md border border-indigo-600/50 transition-all relative z-10"
              >
                Mute 🔇
              </button>
            ) : (
              <button
                onClick={toggleVoiceSearch}
                className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-extrabold text-[11px] shrink-0 cursor-pointer shadow-md border border-rose-700/50 transition-all relative z-10"
              >
                Stop ⏹️
              </button>
            )}
          </div>
        )}

        {/* Voice Error Notice */}
        {voiceError && !isListening && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              onClick={() => setVoiceError(null)}
              className="text-rose-600 hover:underline text-[11px] font-extrabold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Category Tabs Filter */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-100/90 border-b border-slate-200 overflow-x-auto text-xs font-semibold no-scrollbar">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "All Data ⚡", icon: Sparkles },
              { id: "products", label: "Products & Stock 📦", icon: Package },
              { id: "customers", label: "Customers & Parties 👥", icon: Users },
              { id: "vouchers", label: "Invoices & Vouchers 🧾", icon: FileText },
              { id: "users", label: "Sales Team & MR 👔", icon: UserCheck },
              { id: "navigation", label: "Navigation 🧭", icon: Compass },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedIndex(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm font-bold"
                      : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amazon/Flipkart Style E-Commerce Facets & Filters Toolbar */}
        {query.trim() && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200/80 overflow-x-auto text-xs no-scrollbar">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filters:
              </span>

              {/* In-Stock Only Chip */}
              <button
                onClick={() => setInStockOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  inStockOnly
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {inStockOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>In Stock Only 📦</span>
              </button>

              {/* Near Expiry Filter Chip */}
              <button
                onClick={() => setNearExpiryOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  nearExpiryOnly
                    ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {nearExpiryOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>Expiring Soon (&lt; 90 Days) ⏳</span>
              </button>

              {/* High Balance Filter Chip */}
              <button
                onClick={() => setHighBalanceOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  highBalanceOnly
                    ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {highBalanceOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>Outstanding &gt; 0 💰</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="stockHigh">Sort: Stock (High to Low)</option>
                <option value="priceHigh">Sort: Price (High to Low)</option>
                <option value="priceLow">Sort: Price (Low to High)</option>
                <option value="name">Sort: Name (A to Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Typo Correction Banner ("Did You Mean?") */}
        {didYouMean && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs font-semibold text-indigo-900">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Did you mean:</span>
            <button
              onClick={() => setQuery(didYouMean)}
              className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
            >
              {didYouMean}
            </button>
          </div>
        )}

        {/* Modal Main Content Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[380px]">
          {/* Left Column: Results List */}
          <div className={`${showGuide ? "md:col-span-8 lg:col-span-8" : "md:col-span-12"} overflow-y-auto p-3 flex flex-col justify-between`}>
            {/* No Query State: Show Live Dynamic Trending Items from Database */}
            {!query.trim() && (
              <div className="p-4 space-y-6">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Recent Searches
                      </span>
                      <button
                        onClick={clearAllRecent}
                        className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => setQuery(term)}
                          className="group flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-medium rounded-lg cursor-pointer transition-all border border-slate-200/60"
                        >
                          <span>{term}</span>
                          <X
                            className="w-3 h-3 text-slate-400 hover:text-rose-600 transition-colors"
                            onClick={(e) => removeRecentSearch(e, term)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DYNAMIC LIVE DATABASE TRENDING ITEMS */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Database className="w-4 h-4 text-indigo-600" />
                      Live Database Trending & Quick Searches
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Live Mongo Data
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dynamicTrending.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.actionUrl) {
                            onClose();
                            window.location.href = item.actionUrl;
                          } else {
                            setQuery(item.query || item.label);
                          }
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-200 transition-all text-left group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {item.category}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {(() => {
              const flatList = getFlatResults();
              if (loading && query.trim() && flatList.length === 0) {
                return (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">Searching database across all tables...</p>
                  </div>
                );
              }
              if (!loading && query.trim() && flatList.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">No matching records found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No records matched &quot;{query}&quot; with current filters. Try turning off &quot;In Stock Only&quot; or searching product name or customer code.
                    </p>
                  </div>
                );
              }
              if (flatList.length > 0) {
                return (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 rounded-md">
                      <span>Results ({flatList.length})</span>
                      <span>Use ↑ ↓ to navigate, Enter to open</span>
                    </div>

                    {flatList.map((item: any, index: number) => {
                      const isSelected = selectedIndex === index;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-indigo-50/90 border-indigo-200 shadow-sm"
                              : "bg-white hover:bg-slate-50 border-transparent"
                          }`}
                        >
                          {/* Left Icon & Details */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5 shadow-2xs ${
                                item.type === "kpi"
                                  ? "bg-gradient-to-br from-indigo-500 to-emerald-600 text-white shadow-sm"
                                  : item.type === "product"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.type === "customer"
                                  ? "bg-amber-100 text-amber-700"
                                  : item.type === "voucher"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : item.type === "user"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.type === "kpi" && <TrendingUp className="w-4 h-4 text-white" />}
                              {item.type === "product" && <Package className="w-4 h-4" />}
                              {item.type === "customer" && <Users className="w-4 h-4" />}
                              {item.type === "voucher" && <FileText className="w-4 h-4" />}
                              {item.type === "user" && <UserCheck className="w-4 h-4" />}
                              {item.type === "navigation" && <Compass className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                                  {item.category}
                                </span>
                                {index < 5 && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-900 text-indigo-100 border border-indigo-700 shadow-2xs flex items-center gap-1">
                                    <span>#{index + 1}</span>
                                    <span className="text-[9px] text-indigo-300 font-medium hidden sm:inline">
                                      🎙️ Say &quot;{index === 0 ? "Pehla" : index === 1 ? "Dusra" : index === 2 ? "Teesra" : index === 3 ? "Chautha" : "Paanchwa"}&quot;
                                    </span>
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">
                                {item.subtitle}
                              </p>

                              {/* Badges */}
                              {item.badges && item.badges.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {item.badges.map((b: any, bIdx: number) => (
                                    <span
                                      key={bIdx}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        b.color === "emerald"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : b.color === "rose"
                                          ? "bg-rose-100 text-rose-800"
                                          : b.color === "amber"
                                          ? "bg-amber-100 text-amber-800"
                                          : b.color === "blue"
                                          ? "bg-blue-100 text-blue-800"
                                          : b.color === "indigo"
                                          ? "bg-indigo-100 text-indigo-800"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {b.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Quick E-Commerce Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Read Aloud Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                speakText(`${item.title}. ${item.subtitle || ""}`);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all shadow-2xs cursor-pointer"
                              title="Read Aloud with Salim Voice AI"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="View Full Details"
                            >
                              <Info className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="hidden sm:inline">Details</span>
                            </button>

                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Right Column: Global Search Guide & Amazon/Flipkart Capabilities Sidebar */}
          {showGuide && (
            <div className="hidden md:block md:col-span-4 lg:col-span-4 bg-slate-900 text-slate-100 p-4 overflow-y-auto space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-extrabold uppercase text-[11px] tracking-wider">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Search Guide & Features</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  Enterprise AI Search
                </span>
              </div>

              {/* What Global Search Can Do Section */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  What You Can Search Across Database
                </h4>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <Package className="w-3.5 h-3.5" />
                      <span>Products, Batches & Stock</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Search by Product Name, Code, Pack, Brand/Group, Composition formula or Rack No. See live stock, MRP, rates, and expiry dates.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>Customers, Parties & Ledgers</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Search by Party Name, Customer Code, City/Station, Phone number, or GSTIN. Displays Outstanding Balance (Dr/Cr) & Credit Limit.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-indigo-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoices, Vouchers & Bills</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Search by Invoice / Voucher number (<code className="text-indigo-300">VCN</code>), Date, Party Code or Particulars. Displays Net Bill amount (₹).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sky-400">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sales Hierarchy & MR Team</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Search by MR / Employee name, Email, HQ City, Territory or Role (MR, ASM, RSM, ZSM, Admin).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <Mic className="w-3.5 h-3.5" />
                      <span>Salim Voice AI & Wake-Word (&quot;Hey Salim&quot;) 🎙️</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Say <strong>&quot;Hey Salim&quot;</strong> or <strong>&quot;Salim&quot;</strong> anytime anywhere on the dashboard to automatically wake up Salim Voice Assistant! Speaks and responds in <strong>Hindi, English & Urdu</strong> like Alexa or Siri.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Sidebar Links & File Names Search</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Type any sidebar link, route or file name (e.g. <code className="text-cyan-300">Sidebar.tsx</code>, <code className="text-cyan-300">Topbar.tsx</code>, <code className="text-cyan-300">accounting-group-master</code>, <code className="text-cyan-300">voucher-series</code>, <code className="text-cyan-300">sale-return</code>, <code className="text-cyan-300">mabsolcrmsync</code>) to jump instantly to that module.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amazon / Flipkart Features List */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h4 className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                  Amazon & Flipkart Search Features
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Dynamic Live Trending</strong>: Fetches real database products, parties & reports live.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>In-Stock & Expiry Filters</strong>: Filter available items or near-expiry batches instantly.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Typo Correction</strong>: Auto detects typos (&quot;Did you mean...&quot;).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Smart Sorting</strong>: Sort by stock level, price/rate, or relevance.</span>
                  </li>
                </ul>
              </div>

              {/* Keyboard Shortcuts Guide */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Pro Keyboard Shortcuts
                </h4>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Open / Toggle Search</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 text-indigo-300 rounded font-mono text-[10px] font-bold">
                      Ctrl + K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Navigate Results List</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 text-indigo-300 rounded font-mono text-[10px] font-bold">
                      ↑  ↓  Arrows
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Open Highlighted Record</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 text-indigo-300 rounded font-mono text-[10px] font-bold">
                      Enter ↵
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Close Search Modal</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 text-indigo-300 rounded font-mono text-[10px] font-bold">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Mabsol Pharma CRM Live Global Search</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Total Results: <strong>{totalResults}</strong></span>
          </div>
        </div>
      </div>

      {/* Deep Detail Slide-Over Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {selectedItem.category} Full Detail View
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 max-h-[70vh]">
              {/* Formatted Key Details Grid */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                  Summary & Metrics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedItem.details || {}).map(([key, val]) => {
                    if (key === "batches") return null;
                    return (
                      <div
                        key={key}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center"
                      >
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 mt-0.5 truncate">
                          {String(val || "N/A")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product Batches Table if Product */}
              {selectedItem.type === "product" &&
                selectedItem.details?.batches &&
                selectedItem.details.batches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Batch-wise Stock Breakdown ({selectedItem.details.batches.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Batch No</th>
                            <th className="p-2.5">Expiry</th>
                            <th className="p-2.5">Available Qty</th>
                            <th className="p-2.5">MRP</th>
                            <th className="p-2.5">Sale Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {selectedItem.details.batches.map((b: any, bIdx: number) => (
                            <tr key={bIdx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-indigo-700">{b.batchNo}</td>
                              <td className="p-2.5 text-slate-600">{b.exp}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  {b.qty}
                                </span>
                              </td>
                              <td className="p-2.5">{b.mrp}</td>
                              <td className="p-2.5">{b.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Full Raw Object Dump */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Full Database Record JSON
                </h4>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(selectedItem.raw, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => copyDetailsToClipboard(selectedItem)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Record Data"}</span>
              </button>

              <button
                onClick={() => handleItemClick(selectedItem)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Navigate to Record Page</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Router hook fallback
function RouterHook() {
  try {
    return useRouter();
  } catch (e) {
    return null;
  }
}
