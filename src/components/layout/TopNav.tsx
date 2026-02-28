import * as React from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopNavProps = {
  variant?: "home" | "editor";
  rightSlot?: React.ReactNode;
};

export function TopNav({ variant = "home", rightSlot }: TopNavProps) {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95vw] max-w-6xl z-50 glass rounded-2xl">
      <div className="container mx-auto flex h-20 items-center gap-4 px-4">
        <NavLink
          to="/home"
          className="inline-flex items-center gap-3"
          activeClassName=""
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
            <span className="text-xl font-bold">D</span>
          </div>
          <div className="text-lg font-semibold tracking-tight">Dr. PDF Pro</div>
        </NavLink>

        <nav
          className={cn(
            "ml-6 hidden items-center gap-8 text-base text-muted-foreground md:flex",
          )}
        >
          {variant === "home" ? (
            <>
              <NavLink to="/editor" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                Edit
              </NavLink>
              <NavLink to="/watermark" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                Watermark
              </NavLink>
              <NavLink to="/ocr" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                OCR
              </NavLink>
              <a className="hover:text-foreground transition-colors" href="#tools">
                All Tools
              </a>
              <a className="hover:text-foreground transition-colors" href="#popular">
                Most Popular
              </a>
              <NavLink to="/about" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                About Us
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/editor" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                PDF Editor
              </NavLink>
              <NavLink to="/browse-tools" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                Browse Tools
              </NavLink>
              <NavLink to="/home" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
                Home
              </NavLink>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {rightSlot}
          <Button asChild className="hidden sm:inline-flex bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
            <NavLink to="/editor" activeClassName="">
              Open editor
            </NavLink>
          </Button>
        </div>
      </div>
    </header>
  );
}
