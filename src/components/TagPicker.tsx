import { useId, useRef, useState } from "preact/hooks";
import { api, ApiProblem, type TagRef } from "../lib/api";

const MAX_TAGS = 10;

type Option = { kind: "tag"; tag: TagRef } | { kind: "create"; name: string };

/**
 * Multi-select tag field following the WAI-ARIA combobox pattern. Type to
 * filter, arrow keys to move, Enter to pick, Backspace on an empty input
 * removes the last tag. Typing a new name offers "Create '…'".
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
  onChange: (tagIds: number[]) => void;
}) {
  const [tags, setTags] = useState(allTags);
  const [selected, setSelectedState] = useState(initialSelected);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [createError, setCreateError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;

  function setSelected(next: TagRef[]) {
    setSelectedState(next);
    onChange(next.map((tag) => tag.id));
  }

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

  async function pick(option: Option) {
    setCreateError(undefined);
    if (option.kind === "tag") {
      setSelected([...selected, option.tag]);
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
      return;
    }

    setCreating(true);
    try {
      const tag = await api.createTag(option.name);
      setTags([...tags, tag]);
      setSelected([...selected, tag]);
      setQuery("");
      setActive(0);
    } catch (problem) {
      setCreateError((problem as ApiProblem).message);
    } finally {
      setCreating(false);
      inputRef.current?.focus();
    }
  }

  function remove(tagId: number) {
    setSelected(selected.filter((tag) => tag.id !== tagId));
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive(Math.min(active + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(active - 1, 0));
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
    <div class="field tag-picker">
      <label for={`${id}-input`}>Tags</label>
      <div class="tag-picker-box">
        {selected.map((tag) => (
          <button
            key={tag.id}
            type="button"
            class="chip"
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
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" class="tag-options" aria-label="Tag suggestions">
          {tags.length === 0 && options.length === 0 ? (
            <li role="option" aria-selected={false} aria-disabled="true" class="muted">
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
        <p id={errorId} class="field-error">
          {message}
        </p>
      )}
    </div>
  );
}
