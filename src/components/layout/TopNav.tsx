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
    <header className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4">
        <NavLink
          to="/home"
          className="inline-flex items-center gap-2"
          activeClassName=""
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">D</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">Dr. PDF Pro</div>
        </NavLink>

        <nav
          className={cn(
            "ml-2 hidden items-center gap-5 text-sm text-muted-foreground md:flex",
          )}
        >
          {variant === "home" ? (
            <>
              <NavLink to="/editor" className="hover:text-foreground" activeClassName="text-foreground">
                Edit
              </NavLink>
              <a className="hover:text-foreground" href="#tools">
                All Tools
              </a>
              <a className="hover:text-foreground" href="#popular">
                Most Popular
              </a>
            </>
          ) : (
            <>
              <NavLink to="/editor" className="hover:text-foreground" activeClassName="text-foreground">
                PDF Editor
              </NavLink>
              <NavLink to="/home" className="hover:text-foreground" activeClassName="text-foreground">
                Home
              </NavLink>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {rightSlot}
          <Button asChild variant="secondary" className="hidden sm:inline-flex">
            <NavLink to="/editor" activeClassName="">
              Open editor
            </NavLink>
          </Button>
        </div>
      </div>
    </header>
  );
}
