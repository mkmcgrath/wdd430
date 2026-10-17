"use client";

import { useActionState, useRef, useState } from "react";
import { createTagAction, deleteTagAction, renameTagAction } from "@/app/actions/tags";
import { initialFormState } from "@/lib/formState";
import type { TagWithCounts } from "@/lib/services/tags";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldError, invalidProps } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** F7 Tags page: add, rename inline, delete with impact counts. */
export function TagManager({ tags }: { tags: TagWithCounts[] }) {
  return (
    <div className="stack">
      <AddTagForm />
      {tags.length === 0 ? (
        <div className="card empty">
          <p>No tags yet. Tags help you group notes and links — try one per class or project.</p>
        </div>
      ) : (
        <ul className="card-list">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTagForm() {
  const [state, formAction] = useActionState(createTagAction, initialFormState);
  const [name, setName] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear the field after each successful add; focus stays in it.
  if (state.savedAt && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setName("");
  }

  return (
    <form action={formAction} className="card form">
      <div className="field">
        <label htmlFor="new-tag">New tag</label>
        <div className="actions">
          <input
            ref={inputRef}
            id="new-tag"
            name="name"
            type="text"
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            {...invalidProps(state.errors, "name", "new-tag-error")}
            style={{ flex: 1 }}
          />
          <SubmitButton pendingText="Adding…">Add</SubmitButton>
        </div>
        <FieldError errors={state.errors} name="name" id="new-tag-error" />
      </div>
    </form>
  );
}

function TagRow({ tag }: { tag: TagWithCounts }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(renameTagAction.bind(null, tag.id), initialFormState);
  const [lastSavedAt, setLastSavedAt] = useState<number>();
  const renameButton = useRef<HTMLButtonElement>(null);

  if (state.savedAt && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setEditing(false);
  }

  const counts = `${plural(tag.noteCount, "note")}, ${plural(tag.linkCount, "link")}`;
  const errorId = `rename-${tag.id}-error`;

  function stopEditing() {
    setEditing(false);
    // Return focus to the Rename button once it's back on screen.
    setTimeout(() => renameButton.current?.focus(), 0);
  }

  return (
    <li className="card">
      {editing ? (
        <form action={formAction} className="stack-sm">
          <label htmlFor={`rename-${tag.id}`} className="visually-hidden">
            Rename {tag.name}
          </label>
          <input
            id={`rename-${tag.id}`}
            name="name"
            type="text"
            required
            maxLength={50}
            defaultValue={tag.name}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") stopEditing();
            }}
            {...invalidProps(state.errors, "name", errorId)}
          />
          <FieldError errors={state.errors} name="name" id={errorId} />
          <div className="actions">
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
            <button type="button" className="btn" onClick={stopEditing}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="item-row">
          <div className="stack-sm">
            <span className="item-title">{tag.name}</span>
            <span className="item-meta">{counts}</span>
          </div>
          <div className="item-actions">
            <button
              ref={renameButton}
              type="button"
              className="btn"
              aria-label={`Rename ${tag.name}`}
              onClick={() => setEditing(true)}
            >
              Rename
            </button>
            <ConfirmDialog
              triggerLabel="Delete"
              triggerAriaLabel={`Delete ${tag.name}`}
              title="Delete tag"
              message={`Delete tag '${tag.name}'? It will be removed from ${plural(tag.noteCount, "note")} and ${plural(tag.linkCount, "link")}. The notes and links themselves won't be deleted.`}
              action={deleteTagAction.bind(null, tag.id)}
            />
          </div>
        </div>
      )}
    </li>
  );
}
