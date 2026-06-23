"use client";

import { useState, useRef, useCallback } from "react";
import { AnnotationPin } from "./annotation-pin";
import { addAnnotation, getFileAnnotations } from "@/app/actions/annotations";

interface Annotation {
  id: string;
  taskId: string;
  content: string;
  x: number;
  y: number;
  pinNumber: number;
  user: { id: string; name: string; image: string | null };
  createdAt: Date;
}

interface ImageAnnotatorProps {
  src: string;
  fileId: string;
  taskId?: string;
  initialAnnotations?: Annotation[];
  onAnnotationAdded?: () => void;
}

export function ImageAnnotator({
  src,
  fileId,
  taskId,
  initialAnnotations = [],
  onAnnotationAdded,
}: ImageAnnotatorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [activePin, setActivePin] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load annotations on mount
  const loadAnnotations = useCallback(async () => {
    try {
      const data = await getFileAnnotations(fileId);
      setAnnotations(data as Annotation[]);
    } catch {
      // Silently fail — annotations are non-critical
    }
  }, [fileId]);

  // Handle click on image to place pin
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotateMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPendingPin({ x, y });
    setPendingText("");
  };

  // Submit annotation
  const handleSubmit = async () => {
    if (!pendingPin || !pendingText.trim() || !taskId) return;
    setSubmitting(true);

    try {
      await addAnnotation({
        taskId,
        fileId,
        x: pendingPin.x,
        y: pendingPin.y,
        content: pendingText.trim(),
      });

      setPendingPin(null);
      setPendingText("");
      setAnnotateMode(false);
      await loadAnnotations();
      onAnnotationAdded?.();
    } catch (err) {
      console.error("Failed to add annotation:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPendingPin(null);
    setPendingText("");
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => {
            setAnnotateMode(!annotateMode);
            if (annotateMode) {
              setPendingPin(null);
              setPendingText("");
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-headline text-[10px] uppercase tracking-widest transition-colors brutalist-border ${
            annotateMode
              ? "bg-primary text-on-primary"
              : "bg-card text-card-text hover:bg-card-muted"
          }`}
        >
          <span className="material-symbols-outlined text-sm">push_pin</span>
          {annotateMode ? "CANCEL" : "ANNOTATE"}
        </button>
        {annotations.length > 0 && (
          <span className="font-mono text-[11px] text-on-surface/50 uppercase">
            {annotations.length} pin{annotations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Image container with pins */}
      <div
        ref={containerRef}
        className={`relative inline-block ${annotateMode ? "cursor-crosshair" : ""}`}
        onClick={handleImageClick}
      >
        <img
          src={src}
          alt="Preview"
          className="max-w-full max-h-[60vh] object-contain"
          draggable={false}
        />

        {/* Existing pins */}
        {annotations.map((ann) => (
          <AnnotationPin
            key={ann.id}
            pinNumber={ann.pinNumber}
            x={ann.x}
            y={ann.y}
            content={ann.content}
            authorName={ann.user.name}
            isActive={activePin === ann.id}
            onClick={() => setActivePin(activePin === ann.id ? null : ann.id)}
          />
        ))}

        {/* Pending pin (not yet submitted) */}
        {pendingPin && (
          <div
            className="absolute z-20"
            style={{
              left: `${pendingPin.x}%`,
              top: `${pendingPin.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning text-on-primary text-[10px] font-headline font-bold brutalist-border animate-pulse">
              ?
            </div>
          </div>
        )}
      </div>

      {/* Annotation input popover */}
      {pendingPin && (
        <div className="mt-3 bg-card brutalist-border p-3">
          <p className="font-headline text-[11px] uppercase tracking-widest text-primary mb-2">
            ADD_ANNOTATION — Pin at ({Math.round(pendingPin.x)}%, {Math.round(pendingPin.y)}%)
          </p>
          <textarea
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            placeholder="Type your feedback..."
            className="w-full bg-surface-container-lowest brutalist-border px-3 py-2 text-xs text-on-surface placeholder:text-on-surface/30 resize-none h-16 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmit}
              disabled={!pendingText.trim() || submitting}
              className="flex-1 bg-primary text-on-primary py-1.5 font-headline text-[10px] uppercase tracking-widest hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "SAVING..." : "PIN_FEEDBACK"}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 brutalist-border text-card-text font-headline text-[10px] uppercase tracking-widest hover:bg-card-muted transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="mt-3 brutalist-border divide-y divide-outline-variant/20">
          <div className="px-3 py-2 bg-card-muted">
            <h4 className="font-headline text-[11px] uppercase tracking-widest text-card-text">
              ANNOTATIONS
            </h4>
          </div>
          {annotations.map((ann) => (
            <button
              key={ann.id}
              onClick={() => setActivePin(activePin === ann.id ? null : ann.id)}
              className={`w-full px-3 py-2 text-left transition-colors ${
                activePin === ann.id ? "bg-primary/10" : "hover:bg-card-muted"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary text-[11px] font-headline font-bold flex-shrink-0 mt-0.5">
                  {ann.pinNumber}
                </span>
                <div className="min-w-0">
                  <p className="font-headline text-[11px] uppercase tracking-widest text-primary">
                    {ann.user.name}
                  </p>
                  <p className="font-mono text-[10px] text-card-text leading-tight line-clamp-2">
                    {ann.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
