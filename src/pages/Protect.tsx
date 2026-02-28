import { TopNav } from "@/components/layout/TopNav";
import { Card } from "@/components/ui/card";

export default function Protect() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pt-28">
      <TopNav variant="editor" />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Protect</h1>
          <p className="mt-1 text-sm text-muted-foreground">Password-protect a PDF.</p>
        </div>
        <Card className="p-5">
          <div className="rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
            Coming soon: the current client-side PDF library in this project doesn’t support encryption yet.
          </div>
        </Card>
      </main>
    </div>
  );
}
