import { useEffect, useRef, useState } from "preact/hooks";
import { api, ApiProblem, href, type User } from "../lib/api";

const NAV = [
  { label: "Dashboard", path: "/dashboard/" },
  { label: "Notes", path: "/notes/" },
  { label: "Links", path: "/links/" },
  { label: "Tags", path: "/tags/" },
  { label: "Profile", path: "/profile/" },
];

/** App header. Also checks the session, so every private page redirects when signed out. */
export function AppHeader({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User>();
  const [search, setSearch] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The page body reports load failures, so the header only needs the success case.
    api.me().then(setUser, () => {});
    setSearch(new URLSearchParams(location.search).get("q") ?? "");

    const onUserChange = (event: Event) => setUser((event as CustomEvent<User>).detail);
    addEventListener("vault:user", onUserChange);
    return () => removeEventListener("vault:user", onUserChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  async function signOut() {
    try {
      await api.logout();
      location.assign(href("/login/"));
    } catch (problem) {
      alert((problem as ApiProblem).message);
    }
  }

  return (
    <header class="app-header">
      <div class="app-header-inner">
        <a href={href("/dashboard/")} class="brand">
          Knowledge Vault
        </a>
        <button
          ref={menuButton}
          type="button"
          class="btn menu-button"
          aria-expanded={open}
          aria-controls="nav-panel"
          onClick={() => setOpen(!open)}
        >
          Menu
        </button>
        <div id="nav-panel" class="nav-panel" data-open={String(open)}>
          <nav aria-label="Main">
            <ul class="nav-list">
              {NAV.map((item) => (
                <li key={item.path}>
                  <a href={href(item.path)} aria-current={current.startsWith(item.path) ? "page" : undefined}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <form class="header-search" role="search" action={href("/search/")} method="get">
            <label for="header-search" class="visually-hidden">
              Search your vault
            </label>
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder="Search"
              maxLength={100}
              value={search}
              onInput={(event) => setSearch(event.currentTarget.value)}
            />
            <button type="submit" class="btn">
              Search
            </button>
          </form>
          <div class="account">
            {user && <span class="account-name">{user.name}</span>}
            <button type="button" class="btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
