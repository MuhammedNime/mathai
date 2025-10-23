export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const PREFIX = "math-assistant";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function key(userId: string) {
  return `${PREFIX}:threads:${userId || "guest"}`;
}

export function loadThreads(userId: string): ChatThread[] {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as ChatThread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(userId: string, threads: ChatThread[]) {
  localStorage.setItem(key(userId), JSON.stringify(threads));
}

export function createThread(
  userId: string,
  title = "محادثة جديدة",
): ChatThread {
  const thread: ChatThread = {
    id: uid(),
    title,
    updatedAt: Date.now(),
    messages: [],
  };
  const all = loadThreads(userId);
  all.unshift(thread);
  saveThreads(userId, all);
  return thread;
}

export function addMessage(
  userId: string,
  threadId: string,
  msg: Omit<ChatMessage, "id" | "createdAt">,
) {
  const all = loadThreads(userId);
  const th = all.find((t) => t.id === threadId);
  if (!th) return;
  th.messages.push({ id: uid(), createdAt: Date.now(), ...msg });
  th.updatedAt = Date.now();
  saveThreads(userId, all);
}

export function renameThread(userId: string, threadId: string, title: string) {
  const all = loadThreads(userId);
  const th = all.find((t) => t.id === threadId);
  if (th) th.title = title;
  saveThreads(userId, all);
}

export function deleteThread(userId: string, threadId: string) {
  const all = loadThreads(userId).filter((t) => t.id !== threadId);
  saveThreads(userId, all);
}
