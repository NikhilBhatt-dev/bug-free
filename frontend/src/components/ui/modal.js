"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, title, description, onClose, children, size = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[90vh] w-full ${size} overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
