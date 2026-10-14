// ./components/assistant/assistant-chat.tsx

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lightbulb,
  Compass,
  RefreshCw,
  Mountain,
  BookOpen,
  Volume2,
  Copy,
  Check,
  X,
  MapPin,
  Car,
  Tent,
  CloudSun,
  Trees,
} from "lucide-react";

import { DEFAULT_CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat/shared/limits";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import { getParkContactInfo } from "@/lib/data/park-addresses";

import {
  appendAssistantMessage,
  appendUserMessage,
  formatAssistantMessageContent,
  type ChatMessage,
} from "./chat-messages";
import { readAssistantV2Stream } from "./assistant-stream";
import { AiTripDraftPanel } from "./ai-trip-draft-panel";
import { NearbyAttribution } from "./nearby-attribution";
import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";

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

const CATEGORY_TABS: { key: CategoryTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "ทั้งหมด", icon: Sparkles },
  { key: "beginner", label: "มือใหม่เที่ยวง่าย", icon: Trees },
  { key: "camping", label: "แคมป์ปิ้ง & หมอก", icon: Tent },
  { key: "daytrip", label: "วันเดย์ทริป", icon: Car },
  { key: "province", label: "ตามจังหวัด", icon: MapPin },
];

const STARTER_PROMPTS: StarterCategory[] = [
  {
    id: "beg-1",
    category: "beginner",
    icon: "trees",
    badge: "กิ่วแม่ปาน",
    title: "อุทยานเดินทางสะดวก ไม่ต้องเดินไกล",
    prompt: "มีอุทยานแห่งชาติในเชียงใหม่ที่เที่ยวง่าย ขับรถเก๋งถึง และทางเดินสะดวกสำหรับมือใหม่ไหมครับ?",
    imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
    tags: ["เชียงใหม่", "เดินง่าย", "ขับรถเก๋งได้", "เหมาะมือใหม่"],
  },
  {
    id: "camp-1",
    category: "camping",
    icon: "tent",
    badge: "ดอยเสมอดาว",
    title: "จุดกางเต็นท์ชมวิวทะเลหมอกชิลๆ",
    prompt: "อยากกางเต็นท์ดูทะเลหมอกแบบชิลๆ ในภาคเหนือ มีสิ่งอำนวยความสะดวกครบ แนะนำที่ไหนดี?",
    imageUrl: "/images/attractions/doi-samer-dao-sea-of-mist.jpg",
    tags: ["น่าน", "กางเต็นท์", "ทะเลหมอก", "มีห้องน้ำ"],
  },
  {
    id: "day-1",
    category: "daytrip",
    icon: "car",
    badge: "มณฑาธาร",
    title: "ทริปสั้นไปเช้า-เย็นกลับจากตัวเมือง",
    prompt: "มีเวลา 1 วันจากตัวเมืองเชียงใหม่ สามารถไปเที่ยวอุทยานไหนได้บ้างที่ไม่เหนื่อยเกินไป?",
    imageUrl: "/images/attractions/mon-tha-than.jpg",
    tags: ["เชียงใหม่", "1 วัน", "ใกล้เมือง", "พักผ่อนสบาย"],
  },
  {
    id: "beg-2",
    category: "beginner",
    icon: "waves",
    badge: "วชิรธาร",
    title: "น้ำตกสวย บรรยากาศร่มรื่น ถ่ายรูปสวย",
    prompt: "อยากเที่ยวน้ำตกสวยๆ ในภาคเหนือ บรรยากาศร่มรื่น ถ่ายรูปสวย และเดินเข้าถึงง่าย",
    imageUrl: "/images/attractions/wachirathan-waterfall.jpg",
    tags: ["ดอยอินทนนท์", "น้ำตกสวย", "ถ่ายรูปเด่น", "เดินไม่ไกล"],
  },
  {
    id: "camp-2",
    category: "camping",
    icon: "moon",
    badge: "ลานดูดาวภูคา",
    title: "ดอยเสมอดาวและลานดูดาวภาคเหนือ",
    prompt: "แนะนำจุดกางเต็นท์ชมดาวสวยๆ เช่น ดอยเสมอดาว และสิ่งที่ต้องเตรียมตัวสำหรับมือใหม่",
    imageUrl: "/images/attractions/phu-kha-stargazing-camp.jpg",
    tags: ["น่าน", "ดูดาว", "บรรยากาศสงบ", "เตรียมเต็นท์"],
  },
  {
    id: "day-2",
    category: "daytrip",
    icon: "coffee",
    badge: "แจ้ซ้อน ลำปาง",
    title: "น้ำพุร้อนแจ้ซ้อนและธรรมชาติลำปาง",
    prompt: "แนะนำกิจกรรมเที่ยวอุทยานแห่งชาติแจ้ซ้อน ต้มไข่น้ำแร่ และแช่น้ำแร่ ควรจัดเวลายังไง?",
    imageUrl: "/images/attractions/chae-son-hotsprings.jpg",
    tags: ["ลำปาง", "น้ำพุร้อน", "ต้มไข่", "แช่น้ำแร่"],
  },
  {
    id: "beg-3",
    category: "beginner",
    icon: "train",
    badge: "ดอยขุนตาล",
    title: "อุทยานแห่งชาติดอยขุนตาล นั่งรถไฟเที่ยว",
    prompt: "อยากนั่งรถไฟไปเที่ยวดอยขุนตาล ลอดอุโมงค์รถไฟ ควรวางแผนเดินทางอย่างไรบ้าง?",
    imageUrl: "/images/attractions/khun-tan-tunnel.jpg",
    tags: ["ลำปาง/ลำพูน", "นั่งรถไฟ", "ธรรมชาติดี", "เดินป่าเบาๆ"],
  },
  {
    id: "camp-3",
    category: "camping",
    icon: "cloud",
    badge: "ห้วยน้ำดัง",
    title: "ห้วยน้ำดัง ทะเลหมอกและจุดกางเต็นท์ยอดฮิต",
    prompt: "แนะนำจุดกางเต็นท์และจุดชมทะเลหมอกที่อุทยานแห่งชาติห้วยน้ำดัง ช่วงไหนสวยที่สุด?",
    imageUrl: "/images/attractions/huai-nam-dang-viewpoint.jpg",
    tags: ["เชียงใหม่-แม่ฮ่องสอน", "กางเต็นท์", "ทะเลหมอก", "พระอาทิตย์ขึ้น"],
  },
  {
    id: "day-3",
    category: "daytrip",
    icon: "mountain",
    badge: "ผาช่อ แม่วาง",
    title: "ผาช่อ แกรนด์แคนยอนเมืองไทย ใกล้เชียงใหม่",
    prompt: "ผาช่อ อุทยานแห่งชาติแม่วาง เดินยากไหม ขับรถไปจากตัวเมืองเชียงใหม่กี่ชั่วโมง?",
    imageUrl: "/images/attractions/pha-chor.jpg",
    tags: ["เชียงใหม่", "ถ่ายรูปสวย", "ขับรถ 1 ชม.", "หน้าผาดินตะกอน"],
  },
  {
    id: "beg-4",
    category: "beginner",
    icon: "flower",
    badge: "ดอยแม่อูคอ",
    title: "ทุ่งบัวตองดอยแม่อูคอและน้ำตกแม่สุรินทร์",
    prompt: "แนะนำช่วงเวลาเที่ยวทุ่งบัวตองดอยแม่อูคอ และน้ำตกแม่สุรินทร์ จังหวัดแม่ฮ่องสอน",
    imageUrl: "/images/attractions/bua-tong-doi-mae-u-kho.jpg",
    tags: ["แม่ฮ่องสอน", "ทุ่งบัวตอง", "น้ำตกสูง", "วิวอลังการ"],
  },
  {
    id: "camp-4",
    category: "camping",
    icon: "tent",
    badge: "ภูสอยดาว",
    title: "ภูสอยดาว ทุ่งดอกไม้และลานสนสามใบ",
    prompt: "แนะนำการเตรียมตัวเดินป่าและกางเต็นท์ลานสนภูสอยดาว ต้องจองล่วงหน้าอย่างไร?",
    imageUrl: "/images/attractions/lan-son-phu-soi-dao.jpg",
    tags: ["อุตรดิตถ์", "ลานสน", "ดอกหงอนนาค", "สายลุย"],
  },
  {
    id: "day-4",
    category: "daytrip",
    icon: "compass",
    badge: "สกายวอล์กแม่งัด",
    title: "สกายวอล์กเขื่อนแม่งัด & ศรีลานนา",
    prompt: "แนะนำที่เที่ยววันเดย์ทริปเขื่อนแม่งัดสมบูรณ์ชล และจุดชมวิวสกายวอล์ก อุทยานแห่งชาติศรีลานนา",
    imageUrl: "/images/attractions/skywalk-mae-ngat.jpg",
    tags: ["เชียงใหม่", "ล่องเรือ", "สกายวอล์ก", "ทานอาหารแพ"],
  },
];

const PROVINCE_ITEMS: StarterCategory[] = [
  {
    id: "prov-cm",
    category: "province",
    icon: "pin",
    badge: "เชียงใหม่",
    title: "อุทยานยอดฮิตในเชียงใหม่",
    prompt: "แนะนำอุทยานแห่งชาติน่าเที่ยวในเชียงใหม่สำหรับมือใหม่ 3 แห่ง พร้อมจุดเด่นและเส้นทาง",
    imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
    tags: ["เชียงใหม่", "ดอยอินทนนท์", "ออบขาน", "ดอยสุเทพ-ปุย"],
  },
  {
    id: "prov-nan",
    category: "province",
    icon: "pin",
    badge: "น่าน",
    title: "อุทยานเมืองน่าน สายธรรมชาติและหมอก",
    prompt: "แนะนำอุทยานแห่งชาติในน่าน วิวสวย เดินทางง่าย เหมาะกับพักผ่อน เช่น ศรีน่าน หรือ ขุนสถาน",
    imageUrl: "/images/attractions/doi-samer-dao-campsite.jpg",
    tags: ["น่าน", "ดอยเสมอดาว", "ขุนน่าน", "ดอยภูคา"],
  },
  {
    id: "prov-mhs",
    category: "province",
    icon: "pin",
    badge: "แม่ฮ่องสอน",
    title: "อุทยานแม่ฮ่องสอน ดินแดนสามหมอก",
    prompt: "อุทยานในแม่ฮ่องสอนที่น่าแวะเที่ยว เช่น น้ำตกแม่สุรินทร์ ถ้ำปลา-ผาเสื่อ และช่วงเวลาที่ควรไป",
    imageUrl: "/images/attractions/namtok-mae-surin.jpg",
    tags: ["แม่ฮ่องสอน", "แม่สุรินทร์", "สาละวิน", "ถ้ำปลา"],
  },
  {
    id: "prov-lp",
    category: "province",
    icon: "pin",
    badge: "ลำปาง / ลำพูน",
    title: "อุทยานลำปาง-ลำพูน บ่อน้ำพุร้อน & ขุนตาล",
    prompt: "แนะนำอุทยานในลำปางและลำพูน เช่น แจ้ซ้อน ต้มไข่น้ำแร่ หรือ ขุนตาล เหมาะกับทริปแบบไหน?",
    imageUrl: "/images/attractions/chae-son-hotsprings.jpg",
    tags: ["ลำปาง/ลำพูน", "แจ้ซ้อน", "ดอยขุนตาล", "ดอยฟ้างาม"],
  },
  {
    id: "prov-cr",
    category: "province",
    icon: "pin",
    badge: "เชียงราย",
    title: "อุทยานเชียงราย ป่าเขาและน้ำตกชุ่มฉ่ำ",
    prompt: "มีอุทยานแห่งชาติอะไรน่าสนใจในเชียงรายบ้างครับ เช่น ดอยหลวง หรือ ลำน้ำกก?",
    imageUrl: "/images/attractions/pu-kaeng-waterfall.jpg",
    tags: ["เชียงราย", "ดอยหลวง", "ลำน้ำกก", "ภูชี้ฟ้า"],
  },
  {
    id: "prov-tak",
    category: "province",
    icon: "pin",
    badge: "ตาก",
    title: "อุทยานเมืองตาก ป่าดึกดำบรรพ์และต้นไม้ใหญ่",
    prompt: "แนะนำอุทยานแห่งชาติในตาก เช่น ตากสินมหาราช หรือ ลานสาง เหมาะกับแวะพักหรือกางเต็นท์ไหม?",
    imageUrl: "/images/attractions/taksin-maharat-krabak-tree.jpg",
    tags: ["ตาก", "ต้นกระบากใหญ่", "ลานสาง", "ดอยสอยมาลัย"],
  },
  {
    id: "prov-pb",
    category: "province",
    icon: "pin",
    badge: "เพชรบูรณ์ / พิษณุโลก",
    title: "อุทยานเพชรบูรณ์-พิษณุโลก ป่าสนและลมหนาว",
    prompt: "แนะนำอุทยานในเพชรบูรณ์และพิษณุโลก เช่น น้ำหนาว หรือ ภูหินร่องกล้า สำหรับสายชิล",
    imageUrl: "/images/attractions/nam-nao-campground.jpg",
    tags: ["เพชรบูรณ์", "น้ำหนาว", "ภูหินร่องกล้า", "ทุ่งแสลงหลวง"],
  },
  {
    id: "prov-ut",
    category: "province",
    icon: "pin",
    badge: "อุตรดิตถ์ / แพร่",
    title: "อุทยานอุตรดิตถ์-แพร่ ผจญภัยลานสน",
    prompt: "แนะนำอุทยานในอุตรดิตถ์และแพร่ เช่น ภูสอยดาว หรือ เวียงโกศัย บรรยากาศเป็นอย่างไร?",
    imageUrl: "/images/attractions/phu-soi-dao-waterfall.jpg",
    tags: ["อุตรดิตถ์/แพร่", "ภูสอยดาว", "เวียงโกศัย", "ลำน้ำน่าน"],
  },
];

const SUGGESTED_FOLLOW_UPS = [
  "เส้นทางและข้อควรระวัง",
  "จุดกางเต็นท์และที่พัก",
  "ค่าธรรมเนียมและเวลาเปิด",
  "สภาพอากาศและการเตรียมตัว",
];

export function AssistantChat() {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [draftTrip, setDraftTrip] = useState<AssistantV2DraftTrip | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showQuickSheet, setShowQuickSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const busy = useRef(false);
  const requestVersion = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height when typing long text
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 24), 120)}px`;
    }
  }, [input]);

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
        v.name.includes("Niwat"),
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

  // Web Speech API Voice Input
  const startVoiceInput = () => {
    if (typeof window === "undefined") return;

    interface IWindowWithSpeech extends Window {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    }

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecClass) {
      alert("เบราว์เซอร์หรืออุปกรณ์นี้ยังไม่รองรับระบบรับเสียงพูด กรุณาพิมพ์ข้อความแทนครับ");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecClass as any)();
      recognition.lang = "th-TH";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
        }
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (!log.current) {
      return;
    }

    if (messages.length === 0) {
      log.current.scrollTop = 0;
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
    const thisRequest = ++requestVersion.current;

    setLoading(true);
    setError("");
    setInput("");
    setShowQuickSheet(false);
    setShowMenu(false);

    setMessages((current) => appendUserMessage(current, text));

    const abort = new AbortController();
    controller.current = abort;

    const timer = setTimeout(() => abort.abort(), 115_000);

    let assistantStarted = false;
    let updateTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const body: ChatRequest = {
        message: text,
        ...(conversationId ? { conversationId } : {}),
      };

      const response = await fetch("/api/v2/assistant/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: abort.signal,
      });

      if (thisRequest !== requestVersion.current) return;

      if (!response.ok) {
        let errorResult: ChatErrorResponse = {};

        try {
          errorResult = (await response.json()) as ChatErrorResponse;
        } catch {
          // ignore non-json error
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

      let fullText = "";
      let displayedText = "";
      let nearbySource: ChatMessage["nearbySource"];

      const flushAssistantText = () => {
        updateTimer = null;

        if (thisRequest !== requestVersion.current || displayedText === fullText) {
          return;
        }

        displayedText = fullText;
        assistantStarted = true;

        setMessages((current) => {
          if (thisRequest !== requestVersion.current) return current;
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

      fullText = await readAssistantV2Stream(response.body, (nextText) => {
        if (thisRequest !== requestVersion.current) return;
        fullText = nextText;
        scheduleFlush();
      }, (source) => {
        nearbySource = source;
      });

      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }

      flushAssistantText();

      if (nearbySource) {
        setMessages((current) => current.map((message, index) =>
          index === current.length - 1 && message.role === "assistant"
            ? { ...message, nearbySource }
            : message));
      }

      if (!fullText.trim()) {
        throw new Error("ผู้ช่วยไม่ได้ส่งข้อความตอบกลับ");
      }
      try {
        const draftResponse = await fetch(`/api/v2/assistant/trip-draft?conversationId=${encodeURIComponent(nextConversationId)}`, { signal: abort.signal });
        if (draftResponse.ok && thisRequest === requestVersion.current) {
          const body = await draftResponse.json();
          setDraftTrip(body.data ?? null);
        }
      } catch {
        // Chat response remains usable if the draft panel cannot refresh.
      }
    } catch (failure) {
      if (thisRequest !== requestVersion.current) return;
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
      if (updateTimer) clearTimeout(updateTimer);
      if (thisRequest === requestVersion.current) {
        controller.current = null;
        busy.current = false;
        setLoading(false);
      }
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    void sendText(input);
  }

  function startNewConversation() {
    if (draftTrip && !draftTrip.savedTripId && !window.confirm("มีแผนฉบับร่างที่ยังไม่บันทึก เริ่มบทสนทนาใหม่และออกจากแผนนี้หรือไม่?")) return;
    requestVersion.current += 1;
    controller.current?.abort();
    stopSpeech();

    setConversationId(undefined);
    setDraftTrip(null);
    setMessages([]);
    setInput("");
    setError("");
    setExpired(false);
    setShowMenu(false);

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

  const allPrompts = [...STARTER_PROMPTS, ...PROVINCE_ITEMS];

  const displayedPrompts =
    selectedTab === "all"
      ? allPrompts
      : selectedTab === "province"
      ? PROVINCE_ITEMS
      : STARTER_PROMPTS.filter((p) => p.category === selectedTab);

  return (
    <section
      className="relative flex flex-col w-full h-full max-w-md sm:max-w-xl mx-auto overflow-hidden bg-[#03140e] text-white"
      aria-labelledby="assistant-title"
    >
      {/* Ambient Radial Spotlight Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_25%,_rgba(16,185,129,0.18)_0%,_rgba(6,30,22,0.85)_55%,_#020d08_100%)]"
        aria-hidden="true"
      />

      {showQuickSheet ? (
        /* ==============================================================
           RECOMMENDATIONS FULL VIEW (Matches Reference Mobile Card List)
           - Keeps mobile bottom navigation bar 100% visible
           - No clipping / cut-off cards
           - Clean thumbnail + title + tags + chevron
           ============================================================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-150">
          {/* Header matching mobile top bar */}
          <header className="relative flex items-center justify-between px-4 pt-3 pb-2 z-30 shrink-0 border-b border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowQuickSheet(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white shadow-sm backdrop-blur-md active:scale-95 transition cursor-pointer"
                title="ย้อนกลับไปหน้าแชท"
                aria-label="ย้อนกลับไปหน้าแชท"
              >
                <svg
                  className="w-5 h-5 -ml-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 leading-tight font-heading">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span>คำถามและหัวข้อแนะนำ</span>
                </h1>
                <p className="text-[11px] text-emerald-300/70">
                  แตะที่การ์ดเพื่อเริ่มคุยกับ NorthPark AI ทันที
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQuickSheet(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition active:scale-95 cursor-pointer text-sm"
              title="ปิด"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Category Tabs (Horizontal Scrollable Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 no-scrollbar shrink-0">
            {CATEGORY_TABS.map((tab) => {
              const active = selectedTab === tab.key;
              const TabIcon = tab.icon;
              const count =
                tab.key === "all"
                  ? allPrompts.length
                  : tab.key === "province"
                  ? PROVINCE_ITEMS.length
                  : STARTER_PROMPTS.filter((p) => p.category === tab.key).length;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold shrink-0 transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-950/40"
                      : "bg-[#062118]/80 border border-emerald-500/25 text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      active ? "bg-white/25 text-white" : "bg-emerald-950/80 text-emerald-300/80"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prompt Cards List matching Reference Image 2 Style */}
          <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2.5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] overscroll-contain no-scrollbar">
            {displayedPrompts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  void sendText(item.prompt);
                }}
                className="group w-full rounded-2xl border border-emerald-500/20 bg-[#061d16]/90 hover:bg-[#092b21] hover:border-emerald-400/50 p-2.5 sm:p-3 text-left transition active:scale-[0.99] flex items-center gap-3 shadow-lg shadow-black/40 cursor-pointer"
              >
                {/* Image Thumbnail with Overlay Badge like Reference Image 2 */}
                <div className="relative h-20 w-20 sm:h-22 sm:w-22 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30 bg-emerald-950">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200 backdrop-blur-xs">
                    {item.badge}
                  </div>
                </div>

                {/* Card Title & Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300 transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-emerald-200/75 line-clamp-2 mt-1 leading-relaxed">
                    &ldquo;{item.prompt}&rdquo;
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300/90 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Arrow Chevron */}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-emerald-400 group-hover:text-emerald-200 group-hover:bg-white/10 shrink-0 transition">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Top Bar matching Lumi header layout: [ < ] [ Talking to NorthPark ] [ ... ] */}
          <header className="relative flex items-center justify-between px-4 pt-3 pb-2 z-30 shrink-0">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white shadow-sm backdrop-blur-md active:scale-95 transition cursor-pointer"
          title="ย้อนกลับ"
          aria-label="ย้อนกลับ"
        >
          <svg
            className="w-5 h-5 -ml-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center Pill: สนทนากับ NorthPark AI */}
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/25 via-teal-600/30 to-emerald-700/25 border border-emerald-400/35 px-4 py-1.5 shadow-md shadow-emerald-950/40 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-2 ring-emerald-300/40"></span>
          </span>
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-white drop-shadow-xs">
            คุยกับ NorthPark AI
          </span>
        </div>

        {/* Right More Button (...) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white shadow-sm backdrop-blur-md active:scale-95 transition cursor-pointer"
            title="ตัวเลือกเพิ่มเติม"
            aria-label="ตัวเลือกเพิ่มเติม"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {/* More Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-emerald-500/30 bg-[#07241b]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={startNewConversation}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 transition text-left cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-300" />
                <span>เริ่มบทสนทนาใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowQuickSheet(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 transition text-left cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span>หัวข้อแนะนำ</span>
              </button>
              <Link
                href="/parks"
                onClick={() => setShowMenu(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 transition text-left"
              >
                <Mountain className="h-3.5 w-3.5 text-emerald-400" />
                <span>ดูอุทยานทั้งหมด</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Screen Content */}
      <div
        ref={log}
        role="log"
        aria-label="บทสนทนา"
        className="relative flex-1 flex flex-col overflow-y-auto overscroll-contain min-h-0 no-scrollbar"
      >
        {messages.length === 0 ? (
          /* ==============================================================
             HERO STATE (100% THAI & MOBILE-FIRST)
             ============================================================== */
          <div className="flex-1 flex flex-col justify-between items-center px-4 py-3 sm:py-6 text-center">
            <div className="my-auto flex flex-col items-center w-full max-w-sm sm:max-w-md">
              {/* Central Glowing AI Voice Wave Orb */}
              <div className="relative my-2 sm:my-4 flex items-center justify-center">
                {/* Radiant GPU-accelerated aura behind orb */}
                <div
                  className={`absolute h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-emerald-300/15 blur-xl pointer-events-none ${
                    loading ? "lumi-aura-active" : "lumi-aura"
                  }`}
                />

                {/* The 3D Glass Sphere */}
                <div
                  onClick={() =>
                    void sendText("แนะนำอุทยานแห่งชาติภาคเหนือยอดนิยมช่วงนี้ให้หน่อย")
                  }
                  className={`relative flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full border border-emerald-300/40 cursor-pointer active:scale-95 transition-transform ${
                    loading ? "lumi-orb-active" : "lumi-orb"
                  }`}
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(52, 211, 153, 0.25) 25%, rgba(6, 40, 30, 0.9) 70%, rgba(2, 18, 13, 0.98) 100%)",
                  }}
                  title="แตะเพื่อคุยกับ NorthPark"
                >
                  {/* Specular glass reflection shine */}
                  <div className="pointer-events-none absolute top-2.5 left-5 h-4 w-10 rounded-[50%] bg-gradient-to-r from-white/60 to-white/10 blur-[1px] rotate-[-25deg]" />

                  {/* Inside Glowing Voice Waveform */}
                  <svg
                    className="w-20 h-16 sm:w-24 sm:h-18 text-emerald-300"
                    viewBox="0 0 100 40"
                    fill="none"
                  >
                    <path
                      d="M5 20 Q 20 6, 35 20 T 65 20 T 95 20"
                      stroke="url(#orbWaveGradient)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10 20 Q 30 34, 50 20 T 90 20"
                      stroke="rgba(255,255,255,0.75)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient
                        id="orbWaveGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Greeting Headline & Subtitle in Thai */}
              <div className="mt-1 space-y-1">
                <h1
                  id="assistant-title"
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm font-heading"
                >
                  สวัสดี! ฉันคือ NorthPark
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200/80 font-normal max-w-xs mx-auto leading-relaxed">
                  ผู้ช่วยอัจฉริยะ วางแผนเที่ยวอุทยานแห่งชาติภาคเหนือ
                </p>
                <p className="text-[11px] text-emerald-300/60">
                  พร้อมแนะนำเส้นทาง จุดกางเต็นท์ และจัดทริปเที่ยวดอย
                </p>
              </div>

              {/* Quick Prompt Chips (Pill Bubbles in Thai) */}
              <div className="mt-5 w-full flex flex-col items-center gap-2">
                {/* Row 1 */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void sendText(
                        "คุณทำอะไรได้บ้าง แนะนำฟังก์ชันของ NorthPark ให้หน่อย",
                      )
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#08221a]/85 border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 active:scale-95 transition shadow-xs cursor-pointer"
                  >
                    ทำอะไรได้บ้าง?
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void sendText(
                        "อุทยานแห่งชาติภาคเหนือยอดนิยมที่คนชอบไปช่วงนี้มีที่ไหนบ้าง",
                      )
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#08221a]/85 border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 active:scale-95 transition shadow-xs cursor-pointer"
                  >
                    อุทยานยอดนิยม
                  </button>
                </div>

                {/* Row 2 */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void sendText(
                        "ดอยอินทนนท์ตอนนี้เปิดไหม และช่วงนี้สภาพอากาศเป็นอย่างไร",
                      )
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#08221a]/85 border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 active:scale-95 transition shadow-xs cursor-pointer"
                  >
                    ดอยอินทนนท์เปิดไหม?
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void sendText(
                        "ช่วยจัดทริปเที่ยวอุทยาน 2 วัน 1 คืน สำหรับมือใหม่ในเชียงใหม่",
                      )
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#08221a]/85 border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 active:scale-95 transition shadow-xs cursor-pointer"
                  >
                    จัดทริป 2 วัน 1 คืน
                  </button>
                </div>

                {/* Row 3 */}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void sendText(
                        "แนะนำเส้นทางขับรถเที่ยวอุทยานที่ขับง่าย ไม่ชันมาก สำหรับมือใหม่",
                      )
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-100 bg-[#08221a]/85 border border-emerald-500/25 hover:border-emerald-400/60 hover:bg-emerald-900/40 active:scale-95 transition shadow-xs cursor-pointer"
                  >
                    เส้นทางขับรถง่ายๆ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickSheet(true)}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-300 bg-[#061e16]/85 border border-emerald-400/35 hover:bg-emerald-800/40 active:scale-95 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>ดูเพิ่มเติม</span>
                    <Sparkles className="h-3 w-3 text-emerald-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==============================================================
             CONVERSATION MESSAGES STREAM
             ============================================================== */
          <div className="px-4 py-3 space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-2.5 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-800 border border-emerald-400/30 text-xs shadow-md shadow-emerald-950/40">
                    <Compass className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[82%] sm:text-base ${
                    message.role === "user"
                      ? "rounded-tr-xs bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-md border border-emerald-400/30"
                      : "rounded-tl-xs border border-emerald-500/20 bg-[#08231b]/90 text-white shadow-sm backdrop-blur-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-7 font-normal">
                    {message.role === "assistant"
                      ? formatAssistantMessageContent(message.content)
                      : message.content}
                  </p>

                  {message.role === "assistant" && message.nearbySource && (
                    <NearbyAttribution source={message.nearbySource} />
                  )}

                  {/* Sources List */}
                  {message.role === "assistant" && message.sources?.length ? (
                    <div className="mt-3.5 border-t border-emerald-500/15 pt-2.5">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>แหล่งข้อมูลอ้างอิง</span>
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
                          <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
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
                                  <Mountain className="h-3 w-3" />
                                  <span>ดูข้อมูล</span>
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions: Speak & Copy Buttons */}
                  {message.role === "assistant" &&
                    (!loading || index < messages.length - 1) && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/15 pt-2 text-xs animate-in fade-in duration-300">
                        <button
                          type="button"
                          onClick={() => toggleSpeak(message.content, index)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            speakingIndex === index
                              ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm"
                              : "bg-emerald-950/40 text-emerald-300/90 border border-emerald-500/20 hover:bg-emerald-900/40 hover:text-white hover:border-emerald-400/30"
                          }`}
                          title={
                            speakingIndex === index
                              ? "แตะเพื่อหยุดอ่าน"
                              : "ฟังเสียงตอบกลับภาษาไทย"
                          }
                        >
                          {speakingIndex === index ? (
                            <>
                              <span className="flex items-center gap-0.5">
                                <span className="h-2 w-0.5 animate-bounce bg-emerald-300 [animation-delay:-0.3s]"></span>
                                <span className="h-3 w-0.5 animate-bounce bg-emerald-300 [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-0.5 animate-bounce bg-emerald-300"></span>
                              </span>
                              <span className="font-semibold text-emerald-200">
                                กำลังอ่าน... (แตะหยุด)
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>ฟังเสียง</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(message.content, index)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300/90 hover:bg-emerald-900/40 hover:text-white transition"
                          title="คัดลอกข้อความ"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedIndex === index ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start animate-in fade-in duration-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800/80 border border-emerald-400/30 text-xs shadow-md">
                  <Compass className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-emerald-500/20 bg-[#08231b]/90 px-4 py-3 text-xs text-emerald-200 shadow-sm backdrop-blur-md">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </span>
                  <span>NorthPark กำลังคิดคำตอบ...</span>
                </div>
              </div>
            )}

            {/* Follow-up Suggestions at bottom of chat */}
            {!loading && messages.length > 0 && (
              <div className="pt-2 pb-1 space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300/80">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  <span>ถามต่อยอดจากบทสนทนา:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_FOLLOW_UPS.map((followUp) => (
                    <button
                      key={followUp}
                      type="button"
                      onClick={() => void sendText(followUp)}
                      className="rounded-full px-3 py-1 text-xs font-medium text-emerald-200 bg-[#09261d]/80 border border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-900/50 backdrop-blur-md active:scale-95 transition"
                    >
                      {followUp}
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
        {conversationId && draftTrip && (
          <AiTripDraftPanel conversationId={conversationId} draft={draftTrip} onChange={setDraftTrip} />
        )}
      </div>

      {/* Quick Category Action Row - 4 columns fitting 100% on mobile without scroll cutoff */}
      <div className="px-3 sm:px-4 py-1.5 w-full shrink-0 z-20">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-md sm:max-w-xl mx-auto">
          <button
            type="button"
            onClick={() =>
              void sendText("แนะนำอุทยานแห่งชาติภาคเหนือยอดนิยมที่น่าไป")
            }
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-center bg-[#08261e]/90 border border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-900/40 text-emerald-100 transition active:scale-95 shadow-xs cursor-pointer"
            title="อุทยานแนะนำ"
          >
            <Mountain className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight tracking-tight">
              อุทยานเด่น
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              void sendText("ช่วยวางแผนทริปขับรถเที่ยวอุทยานภาคเหนือ 2 วัน 1 คืน")
            }
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-center bg-[#08261e]/90 border border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-900/40 text-emerald-100 transition active:scale-95 shadow-xs cursor-pointer"
            title="แผนเดินทาง"
          >
            <Car className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight tracking-tight">
              แผนเดินทาง
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              void sendText("แนะนำจุดกางเต็นท์ดูดาวและทะเลหมอกในอุทยานแห่งชาติภาคเหนือ")
            }
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-center bg-[#08261e]/90 border border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-900/40 text-emerald-100 transition active:scale-95 shadow-xs cursor-pointer"
            title="จุดกางเต็นท์"
          >
            <Tent className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight tracking-tight">
              จุดกางเต็นท์
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              void sendText("เช็คสภาพอากาศและข้อควรระวังในการเที่ยวดอยช่วงนี้")
            }
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-2xl py-2 px-1 text-center bg-[#08261e]/90 border border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-900/40 text-emerald-100 transition active:scale-95 shadow-xs cursor-pointer"
            title="สภาพอากาศ"
          >
            <CloudSun className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight tracking-tight">
              สภาพอากาศ
            </span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Input Capsule (Elevated cleanly above mobile bottom navigation bar) */}
      <footer className="p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-3 shrink-0 w-full z-30">
        {/* Error Alert */}
        {error ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/15 p-2.5 text-xs text-red-200 backdrop-blur-md">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-full px-2 py-0.5 text-xs font-bold text-red-300 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Expired Alert */}
        {expired ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/15 p-2.5 text-xs text-amber-200 backdrop-blur-md">
            <span>บทสนทนาหมดอายุแล้ว กรุณาเริ่มใหม่ครับ</span>
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-xl bg-amber-400 px-3 py-1 font-semibold text-xs text-black"
            >
              เริ่มใหม่
            </button>
          </div>
        ) : null}

        <form onSubmit={send} className="relative">
          <label htmlFor="assistant-message" className="sr-only">
            พิมพ์ข้อความถึง NorthPark Assistant
          </label>

          {/* The Rounded Capsule Bar - expands vertically when typing multi-line messages */}
          <div className="relative flex items-end rounded-[26px] bg-gradient-to-r from-[#062118]/95 via-[#092b21]/95 to-[#051c14]/95 border border-emerald-500/35 shadow-2xl backdrop-blur-2xl p-1.5 gap-2 transition-all">
            {/* Plus Button (+) with explicit SVG */}
            <button
              type="button"
              onClick={() => setShowQuickSheet((prev) => !prev)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-emerald-300 border border-white/10 transition active:scale-95 cursor-pointer mb-0.5"
              title="หัวข้อและคำถามแนะนำ"
              aria-label="หัวข้อและคำถามแนะนำ"
            >
              <svg
                className="w-4 h-4 text-emerald-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Auto-growing Textarea: wraps and expands lines so all typed text is visible */}
            <textarea
              ref={textareaRef}
              id="assistant-message"
              rows={1}
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
              placeholder="พิมพ์ข้อความของคุณ..."
              disabled={loading || expired}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-emerald-200/40 outline-none px-2 min-w-0 resize-none leading-relaxed py-1.5 max-h-[120px] overflow-y-auto no-scrollbar"
            />

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pr-1 mb-0.5">
              {input.trim() ? (
                /* Send Button (when input has text) */
                <button
                  type="submit"
                  disabled={loading || expired}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  aria-label="ส่งข้อความ"
                >
                  <svg
                    className="h-4 w-4 rotate-45 -mr-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              ) : (
                /* Voice Mic + Waveform Button (when input empty) */
                <>
                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95 cursor-pointer ${
                      isListening
                        ? "bg-red-500/25 text-red-300 border border-red-500/50 animate-pulse"
                        : "text-emerald-200/75 hover:text-white hover:bg-white/10"
                    }`}
                    title={
                      isListening
                        ? "กำลังฟังเสียงพูด..."
                        : "แตะเพื่อพูดด้วยเสียง (Web Speech API)"
                    }
                    aria-label="สั่งการด้วยเสียง"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z"
                      />
                    </svg>
                  </button>

                  {/* Sound Waveform Pill Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const lastAssistant = [...messages]
                        .reverse()
                        .find((m) => m.role === "assistant");
                      if (lastAssistant) {
                        toggleSpeak(
                          lastAssistant.content,
                          messages.lastIndexOf(lastAssistant),
                        );
                      } else {
                        void sendText("สวัสดี แนะนำตัวเองให้ฟังหน่อย");
                      }
                    }}
                    className={`flex h-8 w-9 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 transition active:scale-95 cursor-pointer ${
                      speakingIndex !== null
                        ? "bg-emerald-500/35 text-white animate-pulse"
                        : "hover:bg-emerald-500/30 hover:text-white"
                    }`}
                    title="เปิดเสียงอ่าน / จำลองคำพูด"
                    aria-label="เปิดเสียงอ่าน"
                  >
                    <div className="flex items-center gap-0.5 h-3">
                      <span className="w-0.5 h-3 bg-current rounded-full" />
                      <span className="w-0.5 h-2 bg-current rounded-full" />
                      <span className="w-0.5 h-4 bg-current rounded-full" />
                      <span className="w-0.5 h-1.5 bg-current rounded-full" />
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
          </footer>
        </>
      )}
    </section>
  );
}
