import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

type OverlayId = string | null;

type OverlayRegistry = Map<string, HTMLElement | null>;

type OverlayContextType = {
  openId: OverlayId;
  setOpen: (id: OverlayId) => void;
  register: (id: string, el: HTMLElement | null) => void;
  isMobile: boolean;
};

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<OverlayId>(null);
  const [mobile, setMobile] = useState(isMobile());
  const registryRef = useRef<OverlayRegistry>(new Map());
  const isHandlingPopRef = useRef(false);

  useEffect(() => {
    const onResize = () => setMobile(isMobile());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Outside click handler (mobile only)
  useEffect(() => {
    if (!mobile) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!openId) return;
      const target = e.target as Node;
      const el = registryRef.current.get(openId);
      if (el && target && el.contains(target)) return; // inside
      setOpenId(null);
      // Step back history once when closing via outside click
      if (!isHandlingPopRef.current && history.state?.overlay) history.back();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobile, openId]);

  // Handle back button: close overlays step-by-step
  useEffect(() => {
    function onPopState(ev: PopStateEvent) {
      if (!mobile) return;
      if (ev.state && ev.state.overlay) {
        isHandlingPopRef.current = true;
        setOpenId(null);
        // Give time before next push
        setTimeout(() => (isHandlingPopRef.current = false), 0);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [mobile]);

  const setOpen = (id: OverlayId) => {
    if (!mobile) {
      setOpenId(id);
      return;
    }
    if (id === openId) {
      setOpenId(null);
      if (history.state?.overlay) history.back();
      return;
    }
    // Opening new overlay closes previous implicitly
    setOpenId(id);
    history.pushState({ overlay: id }, "");
  };

  const register = (id: string, el: HTMLElement | null) => {
    registryRef.current.set(id, el);
  };

  const value = useMemo<OverlayContextType>(() => ({ openId, setOpen, register, isMobile: mobile }), [openId, mobile]);

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayContext() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlayContext must be used within OverlayProvider");
  return ctx;
}

export function useOverlay(id: string) {
  const { openId, setOpen, register, isMobile } = useOverlayContext();
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    register(id, ref.current as HTMLElement | null);
  }, [id, register]);

  const open = openId === id;
  const toggle = () => setOpen(open ? null : id);
  const close = () => setOpen(null);
  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    register(id, el);
  };

  return { open, toggle, close, setRef, isMobile } as const;
}
