import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { api, type ListFilters } from "../lib/api";
import { idFrom, useResource, useUrlParams } from "../lib/hooks";
import { Flash, LoadError, LoadingCards } from "./ui";

export type ListHelpers = {
  /** Drops a deleted item from the list and shows a message. */
  removed: (id: number, message: string) => void;
};

/**
 * Search box, tag filter, and result list shared by Notes and Links. Filters
 * live in the URL (?q=…&tag=…), so refresh and links to a filtered list work.
 */
export function ListView<T extends { id: number }>({
  load,
  noun,
  newHref,
  newLabel,
  flashes,
  renderItem,
}: {
  load: (filters: ListFilters) => Promise<T[]>;
  noun: string;
  newHref: string;
  newLabel: string;
  flashes: Record<string, string>;
  renderItem: (item: T, helpers: ListHelpers) => ComponentChildren;
}) {
  const params = useUrlParams();
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<{ q: string; tagId?: number }>();
  const [flash, setFlash] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!params) return;
    const q = params.get("q")?.trim() ?? "";
    setText(q);
    setFilters({ q, tagId: idFrom(params, "tag") });
    const key = Object.keys(flashes).find((name) => params.has(name));
    if (key) setFlash(flashes[key]);
    return () => clearTimeout(timer.current);
  }, [params]);

  const tags = useResource(filters ? "tags" : null, api.tags);
  const items = useResource<T[]>(filters ? JSON.stringify(filters) : null, () => load(filters!));

  function apply(next: { q: string; tagId?: number }) {
    clearTimeout(timer.current);
    setFilters(next);
    const query = new URLSearchParams();
    if (next.q) query.set("q", next.q);
    if (next.tagId) query.set("tag", String(next.tagId));
    const search = query.toString();
    history.replaceState(null, "", search ? `?${search}` : location.pathname);
  }

  function onText(value: string) {
    setText(value);
    setFlash(undefined);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value.trim(), tagId: filters?.tagId }), 300);
  }

  const helpers: ListHelpers = {
    removed: (id, message) => {
      items.setData((current) => current.filter((item) => item.id !== id));
      setFlash(message);
    },
  };

  const q = filters?.q ?? "";
  const tagId = filters?.tagId;
  const tagName = tags.data?.find((tag) => tag.id === tagId)?.name;

  return (
    <>
      {flash && <div class="stack-sm" style={{ marginBottom: "var(--space-4)" }}><Flash message={flash} /></div>}
      <div class="filter-bar" role="search">
        <div class="field">
          <label for="list-search">Search {noun}s</label>
          <input
            id="list-search"
            type="search"
            value={text}
            maxLength={100}
            onInput={(event) => onText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply({ q: text.trim(), tagId });
            }}
          />
        </div>
        <div class="field">
          <label for="tag-filter">Filter by tag</label>
          <select
            id="tag-filter"
            value={tagId ?? ""}
            onChange={(event) => apply({ q: text.trim(), tagId: Number(event.currentTarget.value) || undefined })}
          >
            <option value="">All tags</option>
            {tags.data?.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite">
        {tagId && (
          <div class="filter-banner">
            <span>
              Filtered by: <strong>{tagName ?? "unknown tag"}</strong>
            </span>
            <button type="button" class="btn btn-ghost" onClick={() => apply({ q, tagId: undefined })}>
              ✕ Clear filter
            </button>
          </div>
        )}
      </div>

      {items.error ? (
        <LoadError problem={items.error} />
      ) : !items.data ? (
        <LoadingCards />
      ) : items.data.length > 0 ? (
        <ul class="card-list" aria-label={`${items.data.length} ${noun}s`}>
          {items.data.map((item) => renderItem(item, helpers))}
        </ul>
      ) : !q && !tagId ? (
        <div class="card empty">
          <p>No {noun}s yet</p>
          <a href={newHref} class="btn btn-primary">
            {newLabel}
          </a>
        </div>
      ) : (
        <div class="card empty">
          <p class="wrap-anywhere">
            {q ? `No results for '${q}'.` : `No ${noun}s tagged '${tagName ?? "this tag"}'.`}
          </p>
          <button
            type="button"
            class="btn"
            onClick={() => {
              setText("");
              apply({ q: "", tagId: undefined });
            }}
          >
            {q ? "Clear search" : "Clear filter"}
          </button>
        </div>
      )}
    </>
  );
}
