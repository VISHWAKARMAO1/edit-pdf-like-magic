import PdfEditor from "@/components/pdf/PdfEditor";
import { TopNav } from "@/components/layout/TopNav";

export default function Editor() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav variant="editor" />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
        <PdfEditor />
      </main>
    </div>
  );
}
