"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { deleteNoteAction, saveNoteAction } from "@/app/actions/notes";
import { initialFormState } from "@/lib/formState";
import type { Note } from "@/lib/services/notes";
import type { TagRef } from "@/lib/services/tagging";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldError, FormError, invalidProps } from "./FieldError";
import { SubmitButton } from "./SubmitButton";
import { TagPicker } from "./TagPicker";
import { useUnsavedChanges } from "./useUnsavedChanges";

type Snapshot = { title: string; content: string; tagIds: string };

const tagKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");

/** F5 note editor (create when `note` is undefined), with the F8 tag picker. */
export function NoteEditor({ note, allTags, justSaved }: { note?: Note; allTags: TagRef[]; justSaved?: boolean }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveNoteAction.bind(null, note?.id ?? null), initialFormState);

  const initial: Snapshot = {
    title: note?.title ?? "",
    content: note?.content ?? "",
    tagIds: tagKey(note?.tags.map((tag) => tag.id) ?? []),
  };
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tagIds, setTagIds] = useState(initial.tagIds);
  const [clean, setClean] = useState(initial);
  const [lastSavedAt, setLastSavedAt] = useState<number>();

  // After a successful save, the current values become the new clean baseline.
  if (state.savedAt && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setClean({ title, content, tagIds });
  }

  const dirty = title !== clean.title || content !== clean.content || tagIds !== clean.tagIds;
  useUnsavedChanges(dirty);

  const errors = state.errors;
  const showSaved = !dirty && !errors && (state.ok || justSaved);

  function cancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    router.push("/notes");
  }

  return (
    <div className="stack editor">
      <div aria-live="polite">
        {showSaved && (
          <div className="alert alert-success" role="status">
            Saved.
          </div>
        )}
      </div>
      <FormError errors={errors} />

      <form action={formAction} className="form">
        <div className="field">
          <label htmlFor="note-title">Title</label>
          <input
            id="note-title"
            name="title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            {...invalidProps(errors, "title", "note-title-error")}
          />
          <FieldError errors={errors} name="title" id="note-title-error" />
        </div>

        <div className="field">
          <label htmlFor="note-content">Note content</label>
          <textarea
            id="note-content"
            name="content"
            maxLength={20000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            {...invalidProps(errors, "content", "note-content-error")}
          />
          <FieldError errors={errors} name="content" id="note-content-error" />
        </div>

        <TagPicker
          allTags={allTags}
          initialSelected={note?.tags ?? []}
          error={errors?.tagIds?.[0]}
          onChange={(ids) => setTagIds(tagKey(ids))}
        />

        <div className="actions sticky-actions">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      </form>

      {note && (
        <div className="actions">
          <ConfirmDialog
            triggerLabel="Delete note"
            title="Delete note"
            message="Delete this note? This can't be undone."
            action={deleteNoteAction.bind(null, note.id)}
          />
        </div>
      )}
    </div>
  );
}
