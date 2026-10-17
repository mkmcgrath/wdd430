"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notes", label: "Notes" },
  { href: "/links", label: "Links" },
  { href: "/tags", label: "Tags" },
  { href: "/profile", label: "Profile" },
];

/**
 * Main navigation, header search, and account controls. Below 640px they
 * collapse behind a Menu button (F11 FR-3): aria-expanded/aria-controls,
 * Escape closes it and returns focus to the button.
 */
export function NavMenu({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
  }

  // Escape closes the open menu from anywhere (focus may still be on the button).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn menu-button"
        aria-expanded={open}
        aria-controls="nav-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close menu" : "Menu"}
      </button>

      <div id="nav-panel" className="nav-panel" data-open={open}>
        <nav aria-label="Main">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} onClick={close}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* F9 FR-7: header search goes to /search?q=… */}
        <form role="search" action="/search" method="get" className="header-search" onSubmit={close}>
          <label htmlFor="header-search" className="visually-hidden">
            Search notes and links
          </label>
          <input id="header-search" type="search" name="q" maxLength={100} placeholder="Search notes and links" />
          <button type="submit" className="btn">
            Search
          </button>
        </form>

        <div className="account">
          <span className="account-name">{userName}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
