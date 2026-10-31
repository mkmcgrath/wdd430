import { useRef, useState } from "preact/hooks";
import { api, type TagWithCounts } from "../lib/api";
import { useResource, useSubmit } from "../lib/hooks";
import { ConfirmDialog, FieldError, invalidProps, LoadError, LoadingCards, plural, SubmitButton } from "./ui";

/** Tags page: add, rename inline, delete with impact counts. */
export function TagManager() {
  const { data: tags, error, reload } = useResource("tags", api.tags);

  return (
    <div class="stack">
      <AddTagForm onAdded={reload} />
      {error ? (
        <LoadError problem={error} />
      ) : !tags ? (
        <LoadingCards />
      ) : tags.length === 0 ? (
        <div class="card empty">
          <p>No tags yet. Tags help you group notes and links — try one per class or project.</p>
        </div>
      ) : (
        <ul class="card-list">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTagForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const { pending, errors, submit } = useSubmit();

  function onSubmit(event: Event) {
    event.preventDefault();
    submit(async () => {
      await api.createTag(name);
      setName("");
      onAdded();
    });
  }

  return (
    <form class="card form" onSubmit={onSubmit}>
      <div class="field">
        <label for="new-tag">New tag</label>
        <div class="actions">
          <input
            id="new-tag"
            type="text"
            required
            maxLength={50}
            value={name}
            onInput={(event) => setName(event.currentTarget.value)}
            {...invalidProps(errors, "name", "new-tag-error")}
            style={{ flex: 1 }}
          />
          <SubmitButton pending={pending} pendingText="Adding…">
            Add
          </SubmitButton>
        </div>
        <FieldError errors={errors} name="name" id="new-tag-error" />
      </div>
    </form>
  );
}

function TagRow({ tag, onChanged }: { tag: TagWithCounts; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const { pending, errors, setErrors, submit } = useSubmit();
  const renameButton = useRef<HTMLButtonElement>(null);
  const errorId = `rename-${tag.id}-error`;

  function stopEditing() {
    setEditing(false);
    setErrors(undefined);
    setName(tag.name);
    // Return focus to the Rename button once it's back on screen.
    setTimeout(() => renameButton.current?.focus(), 0);
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    submit(async () => {
      await api.renameTag(tag.id, name);
      setEditing(false);
      onChanged();
    });
  }

  return (
    <li class="card">
      {editing ? (
        <form class="stack-sm" onSubmit={onSubmit}>
          <label for={`rename-${tag.id}`} class="visually-hidden">
            Rename {tag.name}
          </label>
          <input
            id={`rename-${tag.id}`}
            type="text"
            required
            maxLength={50}
            value={name}
            autoFocus
            onInput={(event) => setName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") stopEditing();
            }}
            {...invalidProps(errors, "name", errorId)}
          />
          <FieldError errors={errors} name="name" id={errorId} />
          <div class="actions">
            <SubmitButton pending={pending} pendingText="Saving…">
              Save
            </SubmitButton>
            <button type="button" class="btn" onClick={stopEditing}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div class="item-row">
          <div class="stack-sm">
            <span class="item-title">{tag.name}</span>
            <span class="item-meta">
              {plural(tag.noteCount, "note")}, {plural(tag.linkCount, "link")}
            </span>
          </div>
          <div class="item-actions">
            <button
              ref={renameButton}
              type="button"
              class="btn"
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
              onConfirm={async () => {
                await api.deleteTag(tag.id);
                onChanged();
              }}
            />
          </div>
        </div>
      )}
    </li>
  );
}
