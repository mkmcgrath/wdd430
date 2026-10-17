"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TagRef } from "@/lib/services/tagging";

/**
 * Search box and tag filter for the Notes and Links lists (F8 FR-11, F9 FR-9).
 * Both live in the URL (?q=…&tag=…) so refresh and back/forward keep them.
 * Typing is debounced ~300ms; the router discards superseded navigations, so
 * older results never replace newer ones.
 */
export function ListFilters({
  tags,
  q,
  tagId,
  searchLabel,
}: {
  tags: TagRef[];
  q: string;
  tagId?: number;
  searchLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: { q?: string; tag?: number }) {
    const params = new URLSearchParams();
    if (next.q?.trim()) params.set("q", next.q.trim());
    if (next.tag) params.set("tag", String(next.tag));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function onText(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: value, tag: tagId }), 300);
  }

  const activeTag = tags.find((tag) => tag.id === tagId);

  return (
    <>
      <div className="filter-bar" role="search">
        <div className="field">
          <label htmlFor="list-search">{searchLabel}</label>
          <input
            id="list-search"
            type="search"
            value={text}
            maxLength={100}
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                clearTimeout(timer.current);
                go({ q: text, tag: tagId });
              }
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="tag-filter">Filter by tag</label>
          <select
            id="tag-filter"
            value={tagId ?? ""}
            onChange={(event) => go({ q: text, tag: Number(event.target.value) || undefined })}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div aria-live="polite">
        {tagId && (
          <div className="filter-banner">
            <span>
              Filtered by: <strong>{activeTag?.name ?? "unknown tag"}</strong>
            </span>
            <Link
              className="btn btn-ghost"
              href={text.trim() ? `${pathname}?q=${encodeURIComponent(text.trim())}` : pathname}
              aria-label="Clear filter"
            >
              ✕ Clear filter
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
