import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  HelpCircle,
  TrendingUp,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
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
  initialQuery?: string;
  query?: string;
  setQuery?: (q: string) => void;
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  autoVoiceStart = false,
  onVoiceStartHandled,
  initialQuery = "",
  query: externalQuery,
  setQuery: externalSetQuery,
}: GlobalSearchModalProps) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState("");
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = externalSetQuery || setInternalQuery;
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);

  // AI Voice Search & Vocal Response (TTS) State
  const [selectedLang, setSelectedLang] = useState("en-IN");
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
        try { recognitionRef.current.abort(); } catch (e) { }
      }
      setIsListening(false);
      setVocalSpeaking(false);
      setVocalText(null);
    }
  }, [isOpen]);

  // Speech Synthesis (TTS Vocal Replies)
  const [vocalEnabled, setVocalEnabled] = useState(true);
  const [vocalSpeaking, setVocalSpeaking] = useState(false);
  const [vocalText, setVocalText] = useState<string | null>(null);

  // Voice Selector for Speech Synthesis
  const getAssistantVoice = () => {
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
          utterance.pitch = 1.0; // Friendly natural pitch
          utterance.lang = "en-IN"; // Set locale

          const assistantVoice = getAssistantVoice();
          if (assistantVoice) {
            utterance.voice = assistantVoice;
          }

          utterance.onstart = () => {
            setVocalSpeaking(true);
            setVocalText(text);
            if (recognitionRef.current) {
              try { recognitionRef.current.abort(); } catch (e) { }
            }
          };

          utterance.onend = () => {
            setVocalSpeaking(false);
            setVocalText(null);
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

  const [assistantName, setAssistantName] = useState("AI Assistant");
  const [greetingText, setGreetingText] = useState("Haan ji! Main aapki kya help kar sakta hu?");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mabsol_voice_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assistantName) setAssistantName(parsed.assistantName);
        if (parsed.greetingText) setGreetingText(parsed.greetingText);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  // Auto Voice Start when opened via "Hey [Name]" wake-word
  useEffect(() => {
    if (isOpen && autoVoiceStart) {
      if (onVoiceStartHandled) onVoiceStartHandled();
      // Start microphone immediately
      const timer = setTimeout(() => {
        toggleVoiceSearch();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoVoiceStart, onVoiceStartHandled]);

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
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported in this browser. Use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { }
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
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          setTranscriptPreview(combined);
          setQuery(combined);
          setSelectedIndex(0);
        }
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech") {
          setVoiceError("No speech heard. Tap mic 🎙️ and speak again.");
          setTimeout(() => {
            setVoiceError((prev) => (prev?.includes("No speech heard") ? null : prev));
          }, 3500);
          return;
        }
        if (event.error === "aborted") return;

        console.warn("Voice search notice:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceError("Microphone access denied. Please click lock icon in address bar to allow mic permissions.");
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
        .catch(() => { });
    }
  }, [isOpen, query]);

  const stripEmojis = (str: string) => {
    if (!str) return "";
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  };

  const saveRecentSearch = (itemOrTerm: any) => {
    if (!itemOrTerm) return;
    let entry: { title: string; query: string; actionUrl?: string | null };

    if (typeof itemOrTerm === "string") {
      const clean = stripEmojis(itemOrTerm);
      entry = { title: itemOrTerm, query: clean || itemOrTerm };
    } else {
      const title = itemOrTerm.title || itemOrTerm.label || "";
      const clean = stripEmojis(title);
      entry = {
        title: title,
        query: clean || title,
        actionUrl: itemOrTerm.actionUrl || null,
      };
    }

    if (!entry.title || entry.title.trim().length < 2) return;

    try {
      const updated = [
        entry,
        ...recentSearches.filter((s: any) => {
          const sTitle = typeof s === "string" ? s : s.title;
          return sTitle !== entry.title;
        }),
      ].slice(0, 8);

      setRecentSearches(updated as any);
      localStorage.setItem("mabsol_recent_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving recent search:", e);
    }
  };

  const handleRecentClick = (item: any) => {
    if (item && typeof item === "object" && item.actionUrl) {
      onClose();
      router.push(item.actionUrl);
      return;
    }

    const rawStr = typeof item === "string" ? item : (item.query || item.title || "");
    const cleanStr = stripEmojis(rawStr);
    setQuery(cleanStr || rawStr);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const removeRecentSearch = (e: React.MouseEvent, targetItem: any) => {
    e.stopPropagation();
    const targetTitle = typeof targetItem === "string" ? targetItem : targetItem.title;
    const updated = recentSearches.filter((s: any) => {
      const sTitle = typeof s === "string" ? s : s.title;
      return sTitle !== targetTitle;
    });
    setRecentSearches(updated as any);
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
      if (initialQuery) {
        setQuery(initialQuery);
      }
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
  }, [isOpen, initialQuery]);

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
        assistantName: assistantName || "AI Assistant",
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
    saveRecentSearch(item);

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
    <div className="fixed inset-x-0 bottom-0 top-[52px] sm:top-[62px] z-[990] flex items-start justify-center pt-2 sm:pt-3 px-2 sm:px-4 bg-slate-950/40 backdrop-blur-sm transition-all animate-fadeIn">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Search Modal Container */}
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[82vh] z-10 transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >


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

        {/* E-Commerce Facets & Filters Toolbar */}
        {query.trim() && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs no-scrollbar">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filters:
              </span>

              {/* In-Stock Only Chip */}
              <button
                onClick={() => setInStockOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${inStockOnly
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
              >
                {inStockOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>In Stock Only</span>
              </button>

              {/* Near Expiry Filter Chip */}
              <button
                onClick={() => setNearExpiryOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${nearExpiryOnly
                    ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
              >
                {nearExpiryOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>Expiring Soon (&lt; 90 Days)</span>
              </button>

              {/* High Balance Filter Chip */}
              <button
                onClick={() => setHighBalanceOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shrink-0 cursor-pointer ${highBalanceOnly
                    ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
              >
                {highBalanceOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>Outstanding &gt; 0</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-full px-3 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="stockHigh">Stock (High to Low)</option>
                <option value="priceHigh">Price (High to Low)</option>
                <option value="priceLow">Price (Low to High)</option>
                <option value="name">Name (A to Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Typo Correction Banner ("Did You Mean?") */}
        {didYouMean && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-800 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
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

        {/* Modal Main Content */}
        <div className="flex-1 overflow-hidden min-h-[380px] flex flex-col">
          {/* Results / Content Area */}
          <div className="w-full overflow-y-auto p-3 sm:p-4 flex flex-col justify-between flex-1">
            {/* No Query State: Show Live Dynamic Trending Items from Database */}
            {!query.trim() && (
              <div className="space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((item: any, idx: number) => {
                        const displayTitle = typeof item === "string" ? item : item.title;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleRecentClick(item)}
                            className="group flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                          >
                            <span>{displayTitle}</span>
                            <X
                              className="w-3.5 h-3.5 text-slate-400 group-hover:text-white/80 hover:scale-125 transition-all shrink-0"
                              onClick={(e) => removeRecentSearch(e, item)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DYNAMIC LIVE DATABASE TRENDING ITEMS */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Database className="w-4 h-4 text-indigo-600" />
                      Quick Searches & Shortcuts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
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
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-2xs hover:shadow-xs transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === "product"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
                              : item.type === "customer"
                                ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900"
                                : "bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900"
                            }`}>
                            {item.type === "product" && <Package className="w-4 h-4" />}
                            {item.type === "customer" && <Users className="w-4 h-4" />}
                            {item.type !== "product" && item.type !== "customer" && <FileText className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 truncate block">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
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
                  <div className="p-10 text-center">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No matching records found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No records matched &quot;{query}&quot; with current filters. Try turning off &quot;In Stock Only&quot; or searching product name or customer code.
                    </p>
                  </div>
                );
              }
              if (flatList.length > 0) {
                return (
                  <div className="space-y-1.5">
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-800/40 rounded-xl">
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
                          className={`group relative flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${isSelected
                              ? "bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 shadow-2xs"
                              : "bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-800"
                            }`}
                        >
                          {/* Left Icon & Details */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5 shadow-2xs ${item.type === "kpi"
                                  ? "bg-gradient-to-br from-indigo-500 to-emerald-600 text-white shadow-xs"
                                  : item.type === "product"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900"
                                    : item.type === "customer"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-100 dark:border-amber-900"
                                      : item.type === "voucher"
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900"
                                        : item.type === "user"
                                          ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-100 dark:border-sky-900"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
                                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                  {item.category}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                                {item.subtitle}
                              </p>

                              {/* Badges */}
                              {item.badges && item.badges.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {item.badges.map((b: any, bIdx: number) => (
                                    <span
                                      key={bIdx}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${b.color === "emerald"
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                          : b.color === "rose"
                                            ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                                            : b.color === "amber"
                                              ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                              : b.color === "blue"
                                                ? "bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                                : b.color === "indigo"
                                                  ? "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                    >
                                      {b.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
          </div>

        {/* Footer info bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono shadow-2xs">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono shadow-2xs">↓</kbd>
            <span className="ml-1">Select:</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono shadow-2xs">↵ Enter</kbd>
            <span className="ml-1">Close:</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono shadow-2xs">Esc</kbd>
          </div>

          <div className="flex items-center gap-3">
            <span>Total Results: <strong className="text-slate-700 dark:text-slate-200">{totalResults}</strong></span>
            {query.trim() && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/search?q=${encodeURIComponent(query)}&category=${activeCategory}`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Full Search Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Object.entries(selectedItem.details || {}).map(([key, val]) => {
                    if (key === "batches") return null;
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center"
                      >
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
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
