import { useState } from "preact/hooks";
import { api, href, type Note, type TagRef } from "../lib/api";
import { idFrom, useResource, useSubmit, useUnsavedChanges, useUrlParams } from "../lib/hooks";
import { TagPicker } from "./TagPicker";
import { ConfirmDialog, FieldError, Flash, FormError, invalidProps, LoadError, LoadingPage, SubmitButton } from "./ui";

const NOTES = href("/notes/");

/** Loads what the editor needs. Pass `isNew` for /notes/new/, otherwise ?id= picks the note. */
export function NoteEditorPage({ isNew = false }: { isNew?: boolean }) {
  const params = useUrlParams();
  const id = params ? idFrom(params, "id") : undefined;

  const { data, error } = useResource(params && (isNew || id) ? String(id ?? "new") : null, async () => {
    const [tags, note] = await Promise.all([api.tags(), id ? api.note(id) : undefined]);
    return { tags, note };
  });

  if (params && !isNew && !id) {
    return (
      <div class="card empty">
        <p>This note doesn't exist or was deleted.</p>
        <a href={NOTES} class="btn">
          Back to notes
        </a>
      </div>
    );
  }
  if (error) return <LoadError problem={error} backHref={NOTES} backLabel="Back to notes" />;
  if (!data) return <LoadingPage />;
  return <NoteEditor note={data.note} allTags={data.tags} justSaved={params?.has("saved")} />;
}

type Snapshot = { title: string; content: string; tagIds: string };

const tagKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(",");

function NoteEditor({ note, allTags, justSaved }: { note?: Note; allTags: TagRef[]; justSaved?: boolean }) {
  const initial: Snapshot = {
    title: note?.title ?? "",
    content: note?.content ?? "",
    tagIds: tagKey(note?.tags.map((tag) => tag.id) ?? []),
  };
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tagIds, setTagIds] = useState(note?.tags.map((tag) => tag.id) ?? []);
  const [clean, setClean] = useState(initial);
  const [saved, setSaved] = useState(Boolean(justSaved));
  const { pending, errors, submit } = useSubmit();

  const dirty = title !== clean.title || content !== clean.content || tagKey(tagIds) !== clean.tagIds;
  const release = useUnsavedChanges(dirty);

  function onSubmit(event: Event) {
    event.preventDefault();
    setSaved(false);
    submit(async () => {
      const input = { title, content, tagIds };
      if (note) {
        await api.updateNote(note.id, input);
        setClean({ title, content, tagIds: tagKey(tagIds) });
        setSaved(true);
      } else {
        const created = await api.createNote(input);
        release();
        location.replace(`${href("/notes/view/")}?id=${created.id}&saved=1`);
      }
    });
  }

  function cancel() {
    if (dirty && !confirm("Discard your unsaved changes?")) return;
    release();
    location.assign(NOTES);
  }

  return (
    <div class="stack editor">
      <div aria-live="polite">{saved && !dirty && !errors && <Flash message="Saved." />}</div>
      <FormError errors={errors} />

      <form class="form" onSubmit={onSubmit}>
        <div class="field">
          <label for="note-title">Title</label>
          <input
            id="note-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onInput={(event) => setTitle(event.currentTarget.value)}
            {...invalidProps(errors, "title", "note-title-error")}
          />
          <FieldError errors={errors} name="title" id="note-title-error" />
        </div>

        <div class="field">
          <label for="note-content">Note content</label>
          <textarea
            id="note-content"
            maxLength={20000}
            value={content}
            onInput={(event) => setContent(event.currentTarget.value)}
            {...invalidProps(errors, "content", "note-content-error")}
          />
          <FieldError errors={errors} name="content" id="note-content-error" />
        </div>

        <TagPicker
          allTags={allTags}
          initialSelected={note?.tags ?? []}
          error={errors?.tagIds?.[0]}
          onChange={setTagIds}
        />

        <div class="actions sticky-actions">
          <SubmitButton pending={pending} pendingText="Saving…">
            Save
          </SubmitButton>
          <button type="button" class="btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      </form>

      {note && (
        <div class="actions">
          <ConfirmDialog
            triggerLabel="Delete note"
            title="Delete note"
            message="Delete this note? This can't be undone."
            onConfirm={async () => {
              await api.deleteNote(note.id);
              release();
              location.assign(`${NOTES}?deleted=1`);
            }}
          />
        </div>
      )}
    </div>
  );
}
