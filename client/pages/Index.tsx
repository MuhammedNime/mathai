import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { OverlayProvider, useOverlay } from "@/context/OverlayContext";
import { addMessage, createThread, loadThreads, type ChatMessage, type ChatThread } from "@/lib/chatStore";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function DarkToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);
  return (
    <Button
      variant="secondary"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
      }}
    >
      {dark ? "🌙" : "☀️"}
    </Button>
  );
}

function StageMenu({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { open, toggle, close, setRef, isMobile } = useOverlay("stage");
  const btnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isMobile) return;
    return () => close();
  }, [isMobile, close]);
  const mapping: Record<string, string> = {
    elementary: "ابتدائي",
    preparatory: "إعدادي",
    secondary: "ثانوي",
    higher_ed: "جامعي",
  };
  return (
    <div className="relative" ref={(el) => setRef(el as any)}>
      <Button ref={btnRef} variant="secondary" onClick={toggle}>
        🎓 المرحلة: {mapping[value] ?? "ثانوي"}
      </Button>
      {open && (
        <div className="absolute z-50 mt-2 w-48 rounded-md border bg-popover text-right shadow">
          {Object.entries(mapping).map(([k, v]) => (
            <button
              key={k}
              className={cn("w-full px-3 py-2 text-sm hover:bg-accent", value === k && "text-primary")}
              onClick={() => {
                onChange(k);
                close();
                localStorage.setItem("ai_stage", k);
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportMenu({ onPdf }: { onPdf: () => void }) {
  const { open, toggle, close, setRef } = useOverlay("export");
  return (
    <div className="relative" ref={(el) => setRef(el as any)}>
      <Button variant="secondary" onClick={toggle}>📤 تصدير</Button>
      {open && (
        <div className="absolute z-50 mt-2 w-44 rounded-md border bg-popover text-right shadow">
          <button className="w-full px-3 py-2 text-sm hover:bg-accent" onClick={() => { onPdf(); close(); }}>📄 PDF</button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNewChat }: { onNewChat: () => void }) {
  const { open, toggle, close, setRef } = useOverlay("sidebar");
  const { user, logout, isConfigured, sendVerification } = useAuth();
  return (
    <>
      <Button variant="secondary" onClick={toggle}>☰</Button>
      <div
        ref={(el) => setRef(el as any)}
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-72 bg-sidebar text-sidebar-foreground border-l shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between bg-sidebar-primary text-sidebar-primary-foreground px-4 py-3">
          <h2 className="font-bold">المستشار الرياضي</h2>
          <button onClick={close} className="text-xl">×</button>
        </div>
        <div className="p-4 space-y-3">
          <AuthSection />
          <Button className="w-full" onClick={() => { onNewChat(); close(); }}>بدء محادثة جديدة</Button>
          <Link className="block text-primary hover:underline" to="/saved">الدردشات المحفوظة</Link>
          {!isConfigured && (
            <p className="text-xs text-muted-foreground">
              للتفعيل الكامل للبريد (تأ��يد/استعادة)، أضف إعدادات Firebase في VITE_FIREBASE_*. سنستخدمها تلقائياً.
            </p>
          )}
        </div>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/30" onClick={close} />}
    </>
  );
}

function AuthSection() {
  const { user, logout, sendVerification } = useAuth();
  const [showAuth, setShowAuth] = useState<"login" | "signup" | null>(null);
  if (!user) {
    return (
      <div className="space-y-2">
        <Button className="w-full" variant="secondary" onClick={() => setShowAuth("login")}>سجل الدخول</Button>
        <Button className="w-full" onClick={() => setShowAuth("signup")}>إنشاء حساب</Button>
        {showAuth && <AuthModal mode={showAuth} onClose={() => setShowAuth(null)} />}
      </div>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p>مرحباً، {user.displayName || user.email}</p>
      <p className="text-xs">حالة البريد: {user.emailVerified ? "مؤكد" : "غير مؤكد"}</p>
      {!user.emailVerified && (
        <Button className="w-full" variant="secondary" onClick={() => sendVerification()}>إرسال رسالة تأكيد</Button>
      )}
      <Button className="w-full" variant="destructive" onClick={() => logout()}>تسجيل الخروج</Button>
    </div>
  );
}

function AuthModal({ mode, onClose }: { mode: "login" | "signup"; onClose: () => void }) {
  const { signup, login, resetPassword, deleteAccount } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    try {
      setErr(null);
      if (mode === "signup") await signup(email, password, name);
      else await login(email, password);
      onClose();
    } catch (e: any) {
      setErr(e.message || "خطأ غير معروف");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 text-right shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{mode === "signup" ? "سجل اشتراك جديد" : "سجل الدخول"}</h3>
          <button onClick={onClose} className="text-xl">×</button>
        </div>
        {mode === "signup" && (
          <div className="mb-3">
            <label className="mb-1 block text-sm">الاسم</label>
            <input className="w-full rounded-md border bg-background p-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="mb-3">
          <label className="mb-1 block text-sm">البريد الإلكتروني</label>
          <input className="w-full rounded-md border bg-background p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm">كلمة المرور</label>
          <input type="password" className="w-full rounded-md border bg-background p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
        <div className="flex items-center gap-2">
          <Button className="flex-1" onClick={submit}>{mode === "signup" ? "إنشاء حساب" : "سجل الدخول"}</Button>
          <Button className="flex-1" variant="secondary" onClick={onClose}>إلغاء</Button>
        </div>
        {mode === "login" && (
          <div className="mt-3 text-sm">
            <button className="text-primary hover:underline" onClick={() => email && resetPassword(email)}>نسيت كلمة المرور؟</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolsSheet({ onOpenCamera, onOpenFiles, onOpenDraw }: { onOpenCamera: () => void; onOpenFiles: () => void; onOpenDraw: () => void }) {
  const { open, toggle, close, setRef } = useOverlay("tools");
  return (
    <div className="relative" ref={(el) => setRef(el as any)}>
      <Button className="rounded-full w-12 h-12 text-xl" onClick={toggle}>＋</Button>
      <div className={cn("fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl rounded-t-2xl border bg-card p-4 shadow-2xl transition-transform", open ? "translate-y-0" : "translate-y-full")}> 
        <div className="mx-auto grid max-w-md grid-cols-3 gap-3 text-center">
          <button className="rounded-lg border p-3 hover:bg-accent" onClick={() => { onOpenDraw(); close(); }}>✏️ رسم</button>
          <button className="rounded-lg border p-3 hover:bg-accent" onClick={() => { onOpenFiles(); close(); }}>📄 ملفات</button>
          <button className="rounded-lg border p-3 hover:bg-accent" onClick={() => { onOpenCamera(); close(); }}>📷 كاميرا</button>
        </div>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/20" onClick={close} />}
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={cn("mb-2 max-w-[85%] rounded-xl px-3 py-2 shadow", isUser ? "ml-auto bg-primary text-primary-foreground rounded-tr-none" : "mr-auto bg-secondary rounded-tl-none")}> 
      <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
    </div>
  );
}

function ChatPageInner() {
  const { user } = useAuth();
  const userId = user?.uid || "guest";

  // Stage state
  const [stage, setStage] = useState(() => localStorage.getItem("ai_stage") || "secondary");

  // Threads
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [input, setInput] = useState("");
  const [threadsVersion, setThreadsVersion] = useState(0);

  // Bootstrap first thread
  useEffect(() => {
    const list = loadThreads(userId);
    if (list.length === 0) {
      const t = createThread(userId, "محادثة جديدة");
      setThread(t);
    } else {
      setThread(list[0]);
    }
  }, [userId]);

  const messages = useMemo(() => thread?.messages ?? [], [thread]);

  function refreshThread() {
    if (!thread) return;
    const updated = loadThreads(userId).find((t) => t.id === thread.id);
    if (updated) setThread(updated);
    setThreadsVersion((v) => v + 1);
  }

  function onSend() {
    if (!input.trim() || !thread) return;
    addMessage(userId, thread.id, { role: "user", text: input.trim() });
    // Optional assistant echo to keep UI alive
    addMessage(userId, thread.id, { role: "assistant", text: "تم الاستلام ✅" });
    setInput("");
    refreshThread();
    // Scroll to bottom
    setTimeout(() => {
      document.getElementById("messages-end")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--sidebar-background))]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 bg-primary px-3 py-2 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sidebar onNewChat={() => { const t = createThread(userId); setThread(t); }} />
          <h1 className="text-base font-bold">المستشار الرياضي</h1>
        </div>
        <div className="flex items-center gap-2">
          <StageMenu value={stage} onChange={setStage} />
          <ExportMenu onPdf={() => window.print()} />
          <DarkToggle />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_0798fd8b7050013ca6d8e82a939bc984.png')] p-3 dark:bg-[url('')]">
        <div className="mx-auto flex max-w-2xl flex-col">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          <div id="messages-end" />
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 z-10 bg-secondary/30 px-3 py-2">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <ToolsSheet onOpenCamera={() => alert("الكاميرا لاحقاً")} onOpenFiles={() => alert("الملفات لاحقاً")} onOpenDraw={() => alert("الرسم لاحقاً")} />
          <div className="flex-1 rounded-full border bg-background px-3 py-2">
            <textarea
              dir="rtl"
              className="h-10 w-full resize-none bg-transparent outline-none"
              placeholder="اسأل المستشار..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </div>
          <Button className="h-12 w-12 rounded-full" onClick={onSend}>✅</Button>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  useEffect(() => {
    document.documentElement.setAttribute("lang", "ar");
    document.documentElement.setAttribute("dir", "rtl");
  }, []);
  return (
    <OverlayProvider>
      <ChatPageInner />
    </OverlayProvider>
  );
}
