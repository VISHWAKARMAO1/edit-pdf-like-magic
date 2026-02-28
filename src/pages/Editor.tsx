import PdfEditor from "@/components/pdf/PdfEditor";
import { TopNav } from "@/components/layout/TopNav";

export default function Editor() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 min-h-0 overflow-hidden px-4 pb-6">
        <div className="flex flex-1 min-h-0 w-full">
          <PdfEditor />
        </div>
      </main>
    </div>
  );
}
