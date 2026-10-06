// ./components/assistant/assistant-chat.tsx

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { DEFAULT_CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat/shared/limits";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import { getParkContactInfo } from "@/lib/data/park-addresses";

import {
  appendAssistantMessage,
  appendUserMessage,
  type ChatMessage,
} from "./chat-messages";

/*
 * ต้องตรงกับ backend:
 *
 * ChatRequest
 * {
 *   message: string;
 *   conversationId?: string;
 * }
 */
type ChatRequest = {
  message: string;
  conversationId?: string;
};

type ChatErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type CategoryTab = "all" | "beginner" | "camping" | "daytrip" | "province";

type StarterCategory = {
  id: string;
  category: CategoryTab;
  icon: string;
  badge: string;
  title: string;
  prompt: string;
  imageUrl: string;
  tags: string[];
};

const CATEGORY_TABS: { key: CategoryTab; label: string; icon: string }[] = [
  { key: "all", label: "ทั้งหมด", icon: "✨" },
  { key: "beginner", label: "มือใหม่เที่ยวง่าย", icon: "🌲" },
  { key: "camping", label: "แคมป์ปิ้ง & หมอก", icon: "⛺" },
  { key: "daytrip", label: "วันเดย์ทริป", icon: "🚗" },
  { key: "province", label: "ตามจังหวัด", icon: "📍" },
];

const STARTER_PROMPTS: StarterCategory[] = [
  {
    id: "beg-1",
    category: "beginner",
    icon: "🌲",
    badge: "มีอุทยานน่าเที่ยว",
    title: "อุทยานเดินทางสะดวก ไม่ต้องเดินไกล",
    prompt: "มีอุทยานแห่งชาติในเชียงใหม่ที่เที่ยวง่าย ขับรถเก๋งถึง และทางเดินสะดวกสำหรับมือใหม่ไหมครับ?",
    imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
    tags: ["📍 เชียงใหม่", "🚶 เดินง่าย", "🚗 ขับรถเก๋งได้", "⭐ เหมาะมือใหม่"],
  },
  {
    id: "camp-1",
    category: "camping",
    icon: "⛺",
    badge: "ชมทะเลหมอก",
    title: "จุดกางเต็นท์ชมวิวทะเลหมอกชิลๆ",
    prompt: "อยากกางเต็นท์ดูทะเลหมอกแบบชิลๆ ในภาคเหนือ มีสิ่งอำนวยความสะดวกครบ แนะนำที่ไหนดี?",
    imageUrl: "/images/attractions/doi-samer-dao-sea-of-mist.jpg",
    tags: ["📍 น่าน/เชียงใหม่", "⛺ กางเต็นท์", "☁️ ทะเลหมอก", "🚿 มีห้องน้ำ"],
  },
  {
    id: "day-1",
    category: "daytrip",
    icon: "🚗",
    badge: "วันเดย์ทริป",
    title: "ทริปสั้นไปเช้า-เย็นกลับจากตัวเมือง",
    prompt: "มีเวลา 1 วันจากตัวเมืองเชียงใหม่ สามารถไปเที่ยวอุทยานไหนได้บ้างที่ไม่เหนื่อยเกินไป?",
    imageUrl: "/images/attractions/mon-tha-than.jpg",
    tags: ["📍 เชียงใหม่", "⏱️ 1 วัน", "🚗 ใกล้เมือง", "🌿 พักผ่อนสบาย"],
  },
  {
    id: "beg-2",
    category: "beginner",
    icon: "🌊",
    badge: "น้ำตกธรรมชาติ",
    title: "น้ำตกสวย บรรยากาศร่มรื่น ถ่ายรูปสวย",
    prompt: "อยากเที่ยวน้ำตกสวยๆ ในภาคเหนือ บรรยากาศร่มรื่น ถ่ายรูปสวย และเดินเข้าถึงง่าย",
    imageUrl: "/images/attractions/wachirathan-waterfall.jpg",
    tags: ["📍 ดอยอินทนนท์", "🌊 น้ำตกสวย", "📸 ถ่ายรูปเด่น", "🚶 เดินไม่ไกล"],
  },
  {
    id: "camp-2",
    category: "camping",
    icon: "🌌",
    badge: "ลานดูดาว & แคมป์",
    title: "ดอยเสมอดาวและลานดูดาวภาคเหนือ",
    prompt: "แนะนำจุดกางเต็นท์ชมดาวสวยๆ เช่น ดอยเสมอดาว และสิ่งที่ต้องเตรียมตัวสำหรับมือใหม่",
    imageUrl: "/images/attractions/phu-kha-stargazing-camp.jpg",
    tags: ["📍 น่าน", "🌌 ดูดาว", "⛺ บรรยากาศสงบ", "🎒 เตรียมเต็นท์"],
  },
  {
    id: "day-2",
    category: "daytrip",
    icon: "♨️",
    badge: "พักผ่อนเพื่อสุขภาพ",
    title: "น้ำพุร้อนแจ้ซ้อนและธรรมชาติลำปาง",
    prompt: "แนะนำกิจกรรมเที่ยวอุทยานแห่งชาติแจ้ซ้อน ต้มไข่น้ำแร่ และแช่น้ำแร่ ควรจัดเวลายังไง?",
    imageUrl: "/images/attractions/chae-son-hotsprings.jpg",
    tags: ["📍 ลำปาง", "♨️ น้ำพุร้อน", "🥚 ต้มไข่", "🛀 แช่น้ำแร่"],
  },
];

const PROVINCES = [
  { name: "เชียงใหม่", prompt: "แนะนำอุทยานแห่งชาติน่าเที่ยวในเชียงใหม่สำหรับมือใหม่ 3 แห่ง" },
  { name: "น่าน", prompt: "แนะนำอุทยานแห่งชาติในน่าน วิวสวย เดินทางง่าย เหมาะกับพักผ่อน" },
  { name: "เชียงราย", prompt: "มีอุทยานแห่งชาติอะไรน่าสนใจในเชียงรายบ้างครับ?" },
  { name: "ลำปาง", prompt: "แนะนำอุทยานในลำปาง เช่น แจ้ซ้อน หรือ ดอยขุนตาล เหมาะกับทริปแบบไหน?" },
  { name: "แม่ฮ่องสอน", prompt: "อุทยานในแม่ฮ่องสอนที่น่าแวะเที่ยว และช่วงเวลาที่เหมาะกับการไป" },
  { name: "เพชรบูรณ์", prompt: "แนะนำอุทยานในเพชรบูรณ์ เช่น น้ำหนาว หรือ ตาดหมอก สำหรับสายชิล" },
];

const SUGGESTED_FOLLOW_UPS = [
  "🚗 เส้นทางและข้อควรระวัง",
  "⛺ จุดกางเต็นท์และที่พัก",
  "💵 ค่าธรรมเนียมและเวลาเปิด",
  "🌤️ สภาพอากาศและการเตรียมตัว",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showQuickSheet, setShowQuickSheet] = useState(false);

  const busy = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);

  // Stop any ongoing speech synthesis
  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
  };

  // Clean Markdown formatting for clear Thai speech synthesis
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#+\s+/gm, "")
      .replace(/^[-*•>]\s+/gm, "")
      .replace(/[—–]/g, " ")
      .trim();
  };

  const toggleSpeak = (text: string, index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบอ่านออกเสียง");
      return;
    }

    if (speakingIndex === index) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "th-TH";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(
      (v) =>
        v.lang === "th-TH" ||
        v.lang.startsWith("th") ||
        v.name.toLowerCase().includes("thai") ||
        v.name.includes("Kanya") ||
        v.name.includes("Premwadee") ||
        v.name.includes("Niwat")
    );

    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    utterance.onstart = () => {
      setSpeakingIndex(index);
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!log.current) {
      return;
    }

    log.current.scrollTop = log.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      stopSpeech();
    };
  }, []);

  async function sendText(value: string) {
    const text = value.trim();

    if (!text || busy.current || expired) {
      return;
    }

    busy.current = true;

    setLoading(true);
    setError("");
    setInput("");
    setShowQuickSheet(false);

    setMessages((current) => appendUserMessage(current, text));

    const abort = new AbortController();
    controller.current = abort;

    const timer = setTimeout(() => abort.abort(), 115_000);

    let assistantStarted = false;

    try {
      const body: ChatRequest = {
        message: text,

        ...(conversationId
          ? {
              conversationId,
            }
          : {}),
      };

      const response = await fetch("/api/v2/assistant/chat/stream", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),

        signal: abort.signal,
      });

      if (!response.ok) {
        let errorResult: ChatErrorResponse = {};

        try {
          errorResult = (await response.json()) as ChatErrorResponse;
        } catch {
          // response body อาจไม่ใช่ JSON
        }

        const message =
          errorResult.error?.message ??
          "ผู้ช่วยยังไม่พร้อม กรุณาลองอีกครั้งครับ";

        const code = errorResult.error?.code;

        if (code === "conversation_expired" || code === "unauthorized") {
          setExpired(true);
        }

        throw new Error(message);
      }

      const nextConversationId = response.headers.get("X-Conversation-Id");

      if (!nextConversationId) {
        throw new Error("ไม่ได้รับ conversationId จากผู้ช่วย");
      }

      if (!response.body) {
        throw new Error("ไม่ได้รับข้อมูลตอบกลับจากผู้ช่วย");
      }

      setConversationId(nextConversationId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullText = "";
      let displayedText = "";
      let updateTimer: ReturnType<typeof setTimeout> | null = null;

      const flushAssistantText = () => {
        updateTimer = null;

        if (displayedText === fullText) {
          return;
        }

        displayedText = fullText;
        assistantStarted = true;

        setMessages((current) => {
          const next = [...current];
          const lastIndex = next.length - 1;
          const last = next[lastIndex];

          if (!last || last.role !== "assistant") {
            return appendAssistantMessage(current, displayedText);
          }

          next[lastIndex] = {
            ...last,
            content: displayedText,
          };

          return next;
        });
      };

      const scheduleFlush = () => {
        if (updateTimer) {
          return;
        }

        updateTimer = setTimeout(() => {
          flushAssistantText();
        }, 40);
      };

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) {
          continue;
        }

        fullText += chunk;
        scheduleFlush();
      }

      const tail = decoder.decode();

      if (tail) {
        fullText += tail;
      }

      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }

      flushAssistantText();

      if (!fullText.trim()) {
        throw new Error("ผู้ช่วยไม่ได้ส่งข้อความตอบกลับ");
      }
    } catch (failure) {
      setMessages((current) => {
        if (
          assistantStarted &&
          current[current.length - 1]?.role === "assistant"
        ) {
          return current.slice(0, -2);
        }

        return current.slice(0, -1);
      });

      setInput(text);

      if (failure instanceof Error && failure.name !== "AbortError") {
        setError(failure.message);
      } else {
        setError("รอคำตอบนานเกินไป กรุณาลองอีกครั้งครับ");
      }
    } finally {
      clearTimeout(timer);

      controller.current = null;
      busy.current = false;

      setLoading(false);
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();

    void sendText(input);
  }

  function startNewConversation() {
    controller.current?.abort();
    stopSpeech();

    setConversationId(undefined);
    setMessages([]);
    setInput("");
    setError("");
    setExpired(false);

    busy.current = false;

    setLoading(false);
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore
    }
  };

  const filteredPrompts =
    selectedTab === "all"
      ? STARTER_PROMPTS
      : STARTER_PROMPTS.filter((p) => p.category === selectedTab);

  return (
    <section
      className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden min-h-0"
      aria-labelledby="assistant-title"
    >
      {/* Header - Seamless and Borderless */}
      <header className="relative px-1 py-1 sm:px-2 sm:py-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* 3D-styled Glowing Compass Badge */}
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-[#07241b] p-0.5 shadow-sm ring-1 ring-emerald-400/30">
              <div className="relative flex h-full w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-400/20 via-[#0a271e] to-[#041712] overflow-hidden">
                <span className="text-xl sm:text-2xl drop-shadow-md">🧭</span>
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#071913]"></span>
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-emerald-400 text-xs sm:text-sm">▲</span>
                <h1
                  id="assistant-title"
                  className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate"
                >
                  NorthPark <span className="text-emerald-400">Assistant</span>
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/70 truncate max-w-[210px] sm:max-w-md mt-0.5">
                ตอบคำถาม แนะนำอุทยาน และจัดทริปภาคเหนือสำหรับมือใหม่
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status Pill Badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-emerald-300 border border-emerald-500/25 shadow-sm">
              <span>✨</span>
              <span className="hidden xs:inline">AI พร้อมใช้งาน</span>
              <span className="xs:hidden">AI พร้อม</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 ml-0.5" />
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={startNewConversation}
                className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-950/50 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 hover:text-white transition disabled:opacity-50"
                title="เริ่มบทสนทนาใหม่"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">เริ่มใหม่</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Message & Content Area */}
      <div
        ref={log}
        role="log"
        aria-label="บทสนทนา"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className="relative flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 min-h-0 space-y-4"
      >
        {!messages.length ? (
          <div className="flex flex-col gap-3 py-1">
            {/* Friendly Nature Greeting Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-r from-emerald-950/30 via-[#0a231b]/40 to-transparent p-4 sm:p-5 shadow-none text-white">
              {/* Mountain/Pine nature backdrop glow */}
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-2/3 opacity-25 bg-cover bg-right"
                style={{
                  backgroundImage: `radial-gradient(circle at 80% 50%, rgba(52, 211, 153, 0.25), transparent 70%)`,
                }}
              />

              <div className="relative z-10 flex items-start gap-3.5">
                <div className="text-3xl sm:text-4xl shrink-0">
                  👋
                </div>
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug tracking-tight">
                    สวัสดีครับ! ให้ <span className="text-emerald-400 font-extrabold">NorthPark</span> ช่วยคุณวางแผนเที่ยวดอย
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/75 leading-relaxed font-normal">
                    สำหรับมือใหม่ คลิกเลือกคำถามตัวอย่างที่สนใจด้านล่างเพื่อเริ่มคุยได้ทันทีครับ
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              {CATEGORY_TABS.map((tab) => {
                const active = selectedTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTab(tab.key)}
                    className={`group relative flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                      active
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-400/40"
                        : "bg-emerald-950/30 border border-emerald-500/15 text-emerald-100/80 hover:bg-emerald-900/30 hover:text-white"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className="text-[11px] opacity-70 group-hover:translate-x-0.5 transition-transform">›</span>
                  </button>
                );
              })}
            </div>

            {/* Province Specific Grid if Province Tab Selected */}
            {selectedTab === "province" ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>เลือกจังหวัดที่ต้องการค้นหา:</span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PROVINCES.map((prov) => (
                    <button
                      key={prov.name}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendText(prov.prompt)}
                      className="group flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-emerald-950/25 p-3 text-left transition hover:border-emerald-400/40 hover:bg-emerald-900/30 disabled:opacity-50 active:scale-95"
                    >
                      <span className="text-sm font-medium text-white group-hover:text-emerald-300">
                        🏞️ {prov.name}
                      </span>
                      <span className="text-xs text-emerald-400 group-hover:translate-x-1 transition-transform">›</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Starter Prompt Cards (Seamless Aesthetic Design) */
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredPrompts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendText(item.prompt)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-emerald-500/15 bg-emerald-950/20 p-3.5 sm:p-4 text-left transition hover:border-emerald-400/35 hover:bg-emerald-900/30 active:scale-[0.99] disabled:opacity-50"
                  >
                    {/* Top micro bar */}
                    <div className="flex w-full items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs">
                          {item.icon}
                        </span>
                        <span className="text-[12px] font-medium text-emerald-200/90">คำถามแนะนำ</span>
                      </div>

                      <span className="rounded-full bg-emerald-950/50 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 flex items-center gap-1">
                        <span>🍃</span>
                        <span>{item.badge}</span>
                      </span>
                    </div>

                    {/* Main Content: Image + Text */}
                    <div className="flex items-center gap-3 my-1">
                      <div className="relative h-18 w-18 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-emerald-500/20 shadow-sm">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                            {item.title}
                          </h3>
                          <span className="text-emerald-400 group-hover:translate-x-1 transition-transform text-sm shrink-0">
                            ›
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-emerald-200/70 line-clamp-2 leading-relaxed font-normal">
                          &ldquo;{item.prompt}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Bottom Tag Chips */}
                    <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-emerald-500/10">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-lg bg-emerald-950/40 border border-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Province Shortcut Bar when not in province tab - Seamless */}
            {selectedTab !== "province" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>หรือเลือกถามตามจังหวัด:</span>
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {PROVINCES.slice(0, 4).map((prov) => (
                    <button
                      key={prov.name}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendText(prov.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-950/30 px-3.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:text-white disabled:opacity-50 active:scale-95"
                    >
                      <span>🌲</span>
                      <span>{prov.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-2.5 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-950/50 border border-emerald-500/25 text-base shadow-sm">
                    🧭
                  </div>
                )}

                <div
                  className={`group relative max-w-[90%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed sm:max-w-[84%] sm:text-base ${
                    message.role === "user"
                      ? "rounded-tr-xs bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md border border-emerald-400/20"
                      : "rounded-tl-xs border border-emerald-500/15 bg-emerald-950/40 text-white shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-7">
                    {message.content}
                  </p>

                  {/* Sources List */}
                  {message.role === "assistant" && message.sources?.length ? (
                    <div className="mt-3.5 border-t border-emerald-500/15 pt-2.5">
                      <p className="text-xs font-semibold text-emerald-300">
                        📚 แหล่งข้อมูลอ้างอิง
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                        {message.sources.map((source) => (
                          <li key={source.id}>
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-2.5 py-1 font-medium text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                              >
                                {source.title} <span aria-hidden="true">↗</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-2.5 py-1 text-emerald-300/80">
                                {source.title}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Official Facebook Channels & Park Links for Mentioned Parks */}
                  {(() => {
                    const isComplete = !loading || index < messages.length - 1;
                    const mentionedParks =
                      message.role === "assistant" && isComplete
                        ? findMentionedParks(message.content)
                        : [];

                    if (mentionedParks.length === 0) return null;

                    return (
                      <div className="mt-3 space-y-1.5 border-t border-emerald-500/15 pt-2.5 animate-in fade-in duration-300">
                        <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-300">
                          <span>📘</span>
                          <span>เพจ Facebook ทางการและข้อมูลอุทยานที่กล่าวถึง:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {mentionedParks.map((p) => {
                            const contact = getParkContactInfo(
                              p.slug,
                              p.name,
                              p.provinces[0] || "",
                            );

                            return (
                              <div
                                key={p.slug}
                                className="flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-950/50 p-1 sm:p-1.5 text-xs text-white shadow-2xs"
                              >
                                <a
                                  href={contact.facebookUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white shadow-2xs transition active:scale-95"
                                  title={`เปิดเพจ Facebook ทางการของ ${p.name}`}
                                >
                                  <svg
                                    className="h-3.5 w-3.5 fill-current shrink-0"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                  </svg>
                                  <span>{p.name.replace(/^อุทยานแห่งชาติ/, "")}</span>
                                  <span className="text-[10px] opacity-80">↗</span>
                                </a>

                                <Link
                                  href={`/parks/${p.slug}`}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] sm:text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 hover:text-white transition"
                                  title={`ดูข้อมูลอุทยาน ${p.name} บน NorthPark`}
                                >
                                  <span>🏞️</span>
                                  <span>ดูข้อมูล</span>
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Assistant Message Actions: Speak & Copy Buttons (Appears only after message finishes streaming) */}
                  {message.role === "assistant" && (!loading || index < messages.length - 1) && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/15 pt-2 text-xs animate-in fade-in duration-300">
                      {/* Audio Read-Aloud Button */}
                      <button
                        type="button"
                        onClick={() => toggleSpeak(message.content, index)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          speakingIndex === index
                            ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm"
                            : "bg-emerald-950/40 text-emerald-300/90 border border-emerald-500/20 hover:bg-emerald-900/40 hover:text-white hover:border-emerald-400/30"
                        }`}
                        title={speakingIndex === index ? "แตะเพื่อหยุดอ่าน" : "ฟังเสียงตอบกลับภาษาไทย"}
                      >
                        {speakingIndex === index ? (
                          <>
                            <span className="flex items-center gap-0.5">
                              <span className="h-2 w-0.5 animate-bounce bg-emerald-300 [animation-delay:-0.3s]"></span>
                              <span className="h-3 w-0.5 animate-bounce bg-emerald-300 [animation-delay:-0.15s]"></span>
                              <span className="h-2 w-0.5 animate-bounce bg-emerald-300"></span>
                            </span>
                            <span className="font-semibold text-emerald-200">กำลังอ่าน... (แตะหยุด)</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">🔊</span>
                            <span>ฟังเสียง</span>
                          </>
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(message.content, index)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-emerald-300/80 hover:bg-white/10 hover:text-white transition"
                        title="คัดลอกข้อความนี้"
                      >
                        {copiedIndex === index ? (
                          <>
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span className="text-emerald-400 font-medium">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-500/25 text-xs font-bold text-emerald-200">
                    คุณ
                  </div>
                )}
              </div>
            ))}

            {/* Suggested Follow-up Prompts on the last Assistant message */}
            {!loading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
              <div className="pl-10 pt-2">
                <p className="mb-2 text-[11px] font-medium text-emerald-300">💡 ถามต่อยอด:</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {SUGGESTED_FOLLOW_UPS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={loading}
                      onClick={() => void sendText(prompt)}
                      className="shrink-0 rounded-full border border-emerald-500/15 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 whitespace-nowrap transition hover:border-emerald-400/40 hover:bg-emerald-500/20 hover:text-white disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-950/50 border border-emerald-500/25 text-base">
              🧭
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-emerald-500/15 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200 sm:text-sm shadow-sm">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400"></span>
              </span>
              <span>NorthPark กำลังคิดและค้นหาข้อมูลให้คุณ…</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Prompts Collapsible Sheet / Drawer (For mobile and active chat) */}
      {showQuickSheet && (
        <div className="border-t border-emerald-500/15 bg-[#061510]/98 p-3.5 transition-all">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">
              💡 ตัวอย่างคำถามยอดนิยม
            </span>
            <button
              type="button"
              onClick={() => setShowQuickSheet(false)}
              className="text-xs text-emerald-400 hover:text-white"
            >
              ✕ ปิด
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {STARTER_PROMPTS.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setInput(item.prompt);
                  setShowQuickSheet(false);
                }}
                className="rounded-xl border border-emerald-500/15 bg-emerald-950/30 p-2.5 text-left text-xs text-emerald-100 transition hover:border-emerald-400/40 hover:bg-emerald-500/15"
              >
                <div className="font-medium text-emerald-300">{item.icon} {item.title}</div>
                <div className="truncate text-[11px] text-emerald-200/70">{item.prompt}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Input Form - Seamless and floating */}
      <footer className="shrink-0 bg-transparent p-1.5 sm:p-2 z-10">
        {error ? (
          <div
            role="alert"
            className="mb-2 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs underline hover:no-underline"
            >
              ปิด
            </button>
          </div>
        ) : null}

        {expired ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-300">
            <span>บทสนทนาหมดอายุแล้ว กรุณาเริ่มใหม่ครับ</span>
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-xl bg-amber-500 px-3 py-1 font-medium text-xs text-black"
            >
              เริ่มใหม่
            </button>
          </div>
        ) : null}

        <form onSubmit={send} className="flex flex-col gap-1.5">
          <label htmlFor="assistant-message" className="sr-only">
            ข้อความถึง NorthPark Assistant
          </label>

          <div className="relative flex items-center gap-2.5">
            {/* Rounded Pill Capsule Input Container */}
            <div className="relative flex-1 flex items-center rounded-full bg-emerald-950/40 border border-emerald-500/25 px-4 py-1 shadow-inner backdrop-blur-md focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <span className="text-emerald-400/70 text-base shrink-0 mr-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
              </span>

              <textarea
                id="assistant-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();

                    if (!loading && !expired && input.trim()) {
                      void sendText(input);
                    }
                  }
                }}
                maxLength={DEFAULT_CHAT_MESSAGE_MAX_LENGTH}
                rows={1}
                placeholder="พิมพ์คำถามของคุณ..."
                disabled={loading || expired}
                className="w-full bg-transparent border-0 outline-none text-white text-sm placeholder:text-emerald-200/40 resize-none py-2.5 max-h-[100px] leading-normal"
              />

              {/* Clear Input Button */}
              {input && !loading && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="rounded-full p-1 text-xs text-emerald-400/60 hover:bg-white/10 hover:text-white shrink-0 ml-1"
                  title="ล้างข้อความที่พิมพ์"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Vibrant Green Circular Send Button */}
            <button
              type="submit"
              disabled={loading || expired || !input.trim()}
              className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 text-[#041a14] shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              aria-label="ส่งข้อความ"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 rotate-45 -mr-0.5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-emerald-200/60">
            <button
              type="button"
              onClick={() => setShowQuickSheet((prev) => !prev)}
              className="inline-flex items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <span>💡</span>
              <span>คำถามแนะนำ</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </button>
            <span>{input.length}/{DEFAULT_CHAT_MESSAGE_MAX_LENGTH}</span>
          </div>
        </form>
      </footer>
    </section>
  );
}

