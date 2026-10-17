"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createTagInline } from "@/app/actions/tags";
import type { TagRef } from "@/lib/services/tagging";

const MAX_TAGS = 10;

type Option = { kind: "tag"; tag: TagRef } | { kind: "create"; name: string };

/**
 * Multi-select tag field (F8 FR-8/FR-9) following the WAI-ARIA combobox
 * pattern. Type to filter, arrow keys to move, Enter to pick, Backspace on an
 * empty input removes the last tag. Typing a new name offers "Create '…'".
 * Selected tags are submitted as hidden `tagIds` inputs.
 */
export function TagPicker({
  allTags,
  initialSelected,
  error,
  onChange,
}: {
  allTags: TagRef[];
  initialSelected: TagRef[];
  error?: string;
  /** Called with the selected tag IDs whenever the selection changes. */
  onChange?: (tagIds: number[]) => void;
}) {
  const [tags, setTags] = useState(allTags);
  const [selected, setSelectedState] = useState(initialSelected);

  function setSelected(update: (current: TagRef[]) => TagRef[]) {
    const next = update(selected);
    setSelectedState(next);
    onChange?.(next.map((tag) => tag.id));
  }
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [createError, setCreateError] = useState<string>();
  const [creating, startCreate] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;

  const trimmed = query.trim();
  const selectedIds = new Set(selected.map((tag) => tag.id));
  const matches = tags.filter(
    (tag) => !selectedIds.has(tag.id) && tag.name.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const exact = tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
  const options: Option[] = matches.map((tag) => ({ kind: "tag", tag }));
  if (trimmed && !exact && !trimmed.includes(",")) options.push({ kind: "create", name: trimmed });
  const full = selected.length >= MAX_TAGS;
  const showList = open && !full && (options.length > 0 || tags.length === 0);

  function pick(option: Option) {
    setCreateError(undefined);
    if (option.kind === "tag") {
      setSelected((current) => [...current, option.tag]);
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
      return;
    }
    startCreate(async () => {
      const result = await createTagInline(option.name);
      if (result.tag) {
        const tag = result.tag;
        setTags((current) => [...current, tag]);
        setSelected((current) => [...current, tag]);
        setQuery("");
        setActive(0);
      } else {
        setCreateError(result.error ?? "Couldn't create that tag.");
      }
      inputRef.current?.focus();
    });
  }

  function remove(tagId: number) {
    setSelected((current) => current.filter((tag) => tag.id !== tagId));
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Never submit the surrounding form from inside the picker.
      event.preventDefault();
      if (showList && options[active]) pick(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  }

  const message = createError ?? error;

  return (
    <div className="field tag-picker">
      <label htmlFor={`${id}-input`}>Tags</label>
      {selected.map((tag) => (
        <input key={tag.id} type="hidden" name="tagIds" value={tag.id} />
      ))}
      <div className="tag-picker-box">
        {selected.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className="chip"
            aria-label={`Remove tag ${tag.name}`}
            onClick={() => remove(tag.id)}
          >
            {tag.name} <span aria-hidden="true">✕</span>
          </button>
        ))}
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          placeholder={full ? `Up to ${MAX_TAGS} tags` : "Add tags…"}
          disabled={full || creating}
          value={query}
          maxLength={50}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="tag-options" aria-label="Tag suggestions">
          {tags.length === 0 && options.length === 0 ? (
            <li role="option" aria-selected={false} aria-disabled="true" className="muted">
              No tags yet — type a name to create one.
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.kind === "tag" ? option.tag.id : "create"}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown (not click) so the input's blur doesn't close the list first
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
              >
                {option.kind === "tag" ? option.tag.name : `Create '${option.name}'`}
              </li>
            ))
          )}
        </ul>
      )}
      {message && (
        <p id={errorId} className="field-error">
          {message}
        </p>
      )}
    </div>
  );
}
