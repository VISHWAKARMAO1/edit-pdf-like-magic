import * as React from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

type TopNavProps = {
  variant?: "home" | "editor";
  rightSlot?: React.ReactNode;
};

export function TopNav({ variant = "home", rightSlot }: TopNavProps) {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95vw] max-w-6xl z-50 rounded-2xl border border-border/40 bg-background/35 backdrop-blur-xl shadow-2xl shadow-primary/10">
      <div className="container mx-auto flex h-20 items-center gap-4 px-4">
        <NavLink
          to="/"
          className="inline-flex items-center gap-3"
          activeClassName=""
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
            <span className="text-xl font-bold">D</span>
          </div>
          <div className="text-lg font-semibold tracking-tight">Dr. PDF Pro</div>
        </NavLink>

        <nav className="ml-6 hidden items-center gap-8 text-base text-muted-foreground md:flex">
          <NavLink to="/" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
            Home
          </NavLink>
          <NavLink to="/browse-tools" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
            Tools
          </NavLink>
          <NavLink to="/about" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
            About
          </NavLink>
          <NavLink to="/contact" className="hover:text-foreground transition-colors" activeClassName="text-foreground">
            Contact
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {rightSlot}
          <Button asChild className="hidden sm:inline-flex bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow">
            <NavLink to="/editor" activeClassName="">
              Get Started
            </NavLink>
          </Button>
        </div>
      </div>
    </header>
  );
}
