import { useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

import { cn } from "@/lib/utils";
import type { PdfTextEdit } from "./pdfTypes";

// Ensure worker is configured (safe to run multiple times)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfExportPreviewProps = {
  bytes: Uint8Array;
  className?: string;
  scale?: number;
  highlights?: PdfTextEdit[];
};

function getPrimaryHsl(): string {
  // returns "H S% L%" (e.g. "160 78% 36%")
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  return v || "160 78% 36%";
}

export function PdfExportPreview({
  bytes,
  className,
  scale = 1.1,
  highlights = [],
}: PdfExportPreviewProps) {
  const [doc, setDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const stableBytes = useMemo(() => bytes, [bytes]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: stableBytes.slice() });
        const d = await loadingTask.promise;
        if (cancelled) return;
        setDoc(d);
        setNumPages(d.numPages);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stableBytes]);

  useEffect(() => {
    if (!doc || numPages <= 0) return;
    let cancelled = false;

    const primary = getPrimaryHsl();
    const fill = `hsl(${primary} / 0.20)`;
    const stroke = `hsl(${primary} / 0.95)`;

    (async () => {
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        const page = await doc.getPage(i);
        if (cancelled) return;
        const vp = page.getViewport({ scale });

        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);

        const renderTask = page.render({ canvasContext: ctx, viewport: vp } as any);
        await renderTask.promise;

        // Draw edit highlights on top of the rendered page.
        const pageEdits = highlights.filter((h) => h.pageNumber === i && h.newText !== h.originalText);
        if (pageEdits.length) {
          ctx.save();
          ctx.fillStyle = fill;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = Math.max(1, Math.round(1 * scale));
          for (const e of pageEdits) {
            const pad = e.padding ?? 2;
            const x = e.x - pad;
            const y = e.y - pad;
            const w = e.width + pad * 2;
            const h = e.height + pad * 2;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
          }
          ctx.restore();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, numPages, scale, highlights]);

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center text-sm text-muted-foreground", className)}>
        Generating preview…
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full overflow-auto bg-muted/30 p-4", className)}>
      <div className="mx-auto flex max-w-[980px] flex-col gap-6">
        {Array.from({ length: numPages }).map((_, idx) => (
          <div key={`pv-${idx}`} className="rounded-md border border-border bg-background p-3 shadow-sm">
            <div className="mb-2 text-xs text-muted-foreground">Page {idx + 1}</div>
            <canvas
              ref={(el) => {
                canvasRefs.current[idx] = el;
              }}
              className="block h-auto w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
