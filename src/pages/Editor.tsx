import PdfEditor from "@/components/pdf/PdfEditor";
import { TopNav } from "@/components/layout/TopNav";

export default function Editor() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNav variant="editor" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 min-h-0 px-4 py-6">
        <PdfEditor />
      </main>
    </div>
  );
}
