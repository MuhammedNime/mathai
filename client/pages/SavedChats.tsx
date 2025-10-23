import { useAuth } from "@/context/AuthContext";
import { loadThreads, deleteThread, renameThread } from "@/lib/chatStore";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function SavedChats() {
  const { user } = useAuth();
  const userId = user?.uid || "guest";
  const [refresh, setRefresh] = useState(0);

  const threads = useMemo(() => loadThreads(userId), [userId, refresh]);

  useEffect(() => {
    document.title = "الدردشات المحفوظة";
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">الدردشات المحفوظة</h1>
          <Link to="/" className="text-primary hover:underline">العودة للمحادثة</Link>
        </div>
        {threads.length === 0 ? (
          <p className="text-muted-foreground">لا توجد محادثات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {threads.map((t) => (
              <li key={t.id} className="bg-card border rounded-lg p-4 flex items-center gap-3">
                <div className="flex-1">
                  <input
                    defaultValue={t.title}
                    className="w-full bg-transparent outline-none font-medium"
                    onBlur={(e) => {
                      renameThread(userId, t.id, e.target.value || t.title);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">آخر تحديث: {new Date(t.updatedAt).toLocaleString()}</p>
                </div>
                <button
                  className="text-destructive hover:underline"
                  onClick={() => {
                    deleteThread(userId, t.id);
                    setRefresh((x) => x + 1);
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
