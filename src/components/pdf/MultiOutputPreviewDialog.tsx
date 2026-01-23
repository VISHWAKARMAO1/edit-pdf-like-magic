import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PdfExportPreview } from "@/components/pdf/PdfExportPreview";
import { toast } from "@/hooks/use-toast";

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type MultiOutputFile = {
  name: string;
  bytes: Uint8Array;
};

export function MultiOutputPreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  files: MultiOutputFile[];
}) {
  const { open, onOpenChange, title, description, files } = props;
  const [activeIdx, setActiveIdx] = useState(0);

  const blobs = useMemo(() => {
    return files.map((f) => ({
      ...f,
      blob: new Blob([u8ToArrayBuffer(f.bytes)], { type: "application/pdf" }),
    }));
  }, [files]);

  const active = blobs[clamp(activeIdx, 0, Math.max(0, blobs.length - 1))];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setActiveIdx(0);
      }}
    >
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Preview the result(s), then download."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-md border border-border bg-background">
            <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              Output files ({blobs.length})
            </div>
            <div className="max-h-[70vh] overflow-auto p-2">
              {blobs.map((f, idx) => (
                <button
                  key={`${f.name}-${idx}`}
                  type="button"
                  className={
                    "w-full rounded-md border px-3 py-2 text-left text-sm transition " +
                    (idx === activeIdx
                      ? "border-ring bg-muted/30"
                      : "border-transparent hover:border-border hover:bg-muted/20")
                  }
                  onClick={() => setActiveIdx(idx)}
                >
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatMB(f.blob.size)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-[70vh] overflow-hidden rounded-md border border-border">
            {active ? <PdfExportPreview bytes={active.bytes} scale={1.1} /> : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (!active) return;
              downloadBlob(active.blob, active.name);
              toast({ title: "Downloaded", description: active.name });
            }}
            disabled={!active}
          >
            Download selected
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              blobs.forEach((f) => downloadBlob(f.blob, f.name));
              toast({ title: "Downloads started", description: `${blobs.length} files` });
            }}
            disabled={blobs.length === 0}
          >
            Download all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
