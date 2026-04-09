import { useEffect, useRef, useState, useCallback } from "react";
import { X, GripHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: "auto" | "half" | "full";
}

const HEIGHT_MAP = {
  auto: "auto",
  half: "50vh",
  full: "90vh",
} as const;

export function BottomSheet({ open, onClose, title, children, height = "auto" }: BottomSheetProps) {
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setTranslateY(0);
      setIsClosing(false);
    }
  }, [open]);

  /* Lock body scroll when open on mobile */
  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open, isMobile]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* Drag handlers for mobile */
  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
  }, []);

  const onDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    const delta = clientY - dragStartY.current;
    if (delta > 0) {
      setTranslateY(delta);
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragStartY.current = null;
    if (translateY > 100) {
      setIsClosing(true);
      setTimeout(onClose, 300);
    } else {
      setTranslateY(0);
    }
  }, [translateY, onClose]);

  if (!open) return null;

  /* Desktop: centered modal */
  if (!isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-xl w-full max-w-lg mx-4"
          style={{
            maxHeight: height === "full" ? "85vh" : height === "half" ? "50vh" : "70vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
              <h3 className="font-editorial text-[20px] font-medium text-[var(--text-primary)]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="overflow-auto flex-1 px-6 py-4">{children}</div>
        </div>
      </div>
    );
  }

  /* Mobile: bottom sheet */
  const maxH = HEIGHT_MAP[height];
  const sheetTransform = isClosing ? "translateY(100%)" : `translateY(${translateY}px)`;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: isClosing ? 0 : Math.max(0, 1 - translateY / 300),
          transition: isClosing ? "opacity 300ms" : "none",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[var(--surface)] rounded-t-2xl border-t border-[var(--border)] shadow-xl"
        style={{
          maxHeight: maxH,
          transform: sheetTransform,
          transition: dragStartY.current !== null ? "none" : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle area (60px) */}
        <div
          className="flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
          style={{ height: "60px", touchAction: "none" }}
          onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientY)}
          onTouchEnd={onDragEnd}
          onMouseDown={(e) => {
            onDragStart(e.clientY);
            const moveHandler = (ev: MouseEvent) => onDragMove(ev.clientY);
            const upHandler = () => {
              onDragEnd();
              document.removeEventListener("mousemove", moveHandler);
              document.removeEventListener("mouseup", upHandler);
            };
            document.addEventListener("mousemove", moveHandler);
            document.addEventListener("mouseup", upHandler);
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <GripHorizontal className="h-5 w-5 text-[var(--text-muted)]" />
            {title && (
              <span className="text-body-sm font-medium text-[var(--text-primary)]">{title}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 px-4 pb-6" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
