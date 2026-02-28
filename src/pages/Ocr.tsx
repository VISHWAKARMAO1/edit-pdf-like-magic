import { useMemo, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import Tesseract from "tesseract.js";

import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { downloadBlob } from "@/lib/blob";
import { FileDown, Upload } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type OcrSource =
  | { kind: "none" }
  | { kind: "image"; file: File }
  | { kind: "pdf"; file: File; bytes: Uint8Array };

export default function Ocr() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState<OcrSource>({ kind: "none" });
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string>("");

  const outputName = useMemo(() => {
    const base = source.kind === "none" ? "ocr" : source.file.name.replace(/\.[^/.]+$/i, "");
    return `${base}-ocr.txt`;
  }, [source]);

  const onUpload = async (f: File) => {
    setText("");
    setProgress(0);

    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      setSource({ kind: "pdf", file: f, bytes });
      return;
    }

    if (/image\/(png|jpeg)/i.test(f.type)) {
      setSource({ kind: "image", file: f });
      return;
    }

    toast({
      title: "Unsupported file",
      description: "Upload a PDF, PNG, or JPG.",
      variant: "destructive",
    });
  };

  const ocrImageBlob = async (blob: Blob, label: string) => {
    const { data } = await Tesseract.recognize(blob, "eng", {
      logger: (m) => {
        // m.progress is 0..1 but not always present
        const p = typeof (m as any).progress === "number" ? (m as any).progress : undefined;
        if (p != null) setProgress(Math.max(0, Math.min(1, p)));
      },
    });

    const cleaned = (data.text || "").trim();
    return `===== ${label} =====\n${cleaned}\n`;
  };

  const runOcr = async () => {
    if (source.kind === "none") return;
    try {
      setIsWorking(true);
      setProgress(0);
      setText("");

      if (source.kind === "image") {
        const out = await ocrImageBlob(source.file, source.file.name);
        setText(out);
        return;
      }

      // PDF: render each page to a canvas image and OCR
      const loadingTask = pdfjsLib.getDocument({ data: source.bytes.slice() });
      const pdf = await loadingTask.promise;
      const total = pdf.numPages;

      let output = "";
      for (let pageNum = 1; pageNum <= total; pageNum++) {
        // coarse progress based on pages
        setProgress((pageNum - 1) / total);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderTask = page.render({ canvasContext: ctx, viewport } as any);
        await renderTask.promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Failed to capture page image"))),
            "image/png",
            1
          );
        });

        output += await ocrImageBlob(blob, `Page ${pageNum}`);
        output += "\n";
      }

      setProgress(1);
      setText(output.trim() + "\n");
    } catch (e) {
      console.error(e);
      toast({ title: "OCR failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OCR</h1>
          <p className="mt-1 text-sm text-muted-foreground">Extract text from a scanned PDF or image and download as .txt.</p>
        </div>

        <Card className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.currentTarget.value = "";
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button className="gap-2" onClick={() => inputRef.current?.click()} disabled={isWorking}>
              <Upload className="h-4 w-4" />
              Upload PDF/Image
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSource({ kind: "none" });
                  setText("");
                  setProgress(0);
                }}
                disabled={source.kind === "none" || isWorking}
              >
                Clear
              </Button>
              <Button onClick={() => void runOcr()} disabled={source.kind === "none" || isWorking}>
                {isWorking ? `Running… ${(progress * 100).toFixed(0)}%` : "Run OCR"}
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => {
                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                  downloadBlob(blob, outputName);
                  toast({ title: "Downloaded", description: outputName });
                }}
                disabled={!text}
              >
                <FileDown className="h-4 w-4" />
                Download .txt
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-3">
            <div className="text-xs text-muted-foreground">
              File: {source.kind === "none" ? "(none)" : source.file.name}
            </div>
            <textarea
              className="min-h-[320px] w-full resize-y rounded-md border border-border bg-background p-3 text-sm outline-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="OCR output will appear here…"
            />
          </div>
        </Card>
      </main>
    </div>
  );
}
