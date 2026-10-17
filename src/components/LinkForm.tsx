"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { deleteLinkAction, saveLinkAction } from "@/app/actions/links";
import { initialFormState } from "@/lib/formState";
import type { Link } from "@/lib/services/links";
import type { TagRef } from "@/lib/services/tagging";
import { URL_HELP } from "@/lib/validation/schemas";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldError, FormError, invalidProps } from "./FieldError";
import { SubmitButton } from "./SubmitButton";
import { TagPicker } from "./TagPicker";
import { useUnsavedChanges } from "./useUnsavedChanges";

/** F6 link form (create when `link` is undefined), with the F8 tag picker. */
export function LinkForm({ link, allTags }: { link?: Link; allTags: TagRef[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveLinkAction.bind(null, link?.id ?? null), initialFormState);
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [tagsChanged, setTagsChanged] = useState(false);

  const dirty =
    url !== (link?.url ?? "") ||
    title !== (link?.title ?? "") ||
    description !== (link?.description ?? "") ||
    tagsChanged;
  useUnsavedChanges(dirty);
  const errors = state.errors;

  function cancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    router.push("/links");
  }

  return (
    <div className="stack">
      <FormError errors={errors} />
      <form action={formAction} className="form">
        <div className="field">
          <label htmlFor="link-url">URL</label>
          <input
            id="link-url"
            name="url"
            type="url"
            inputMode="url"
            required
            maxLength={2048}
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            {...invalidProps(errors, "url", "link-url-error")}
          />
          {errors?.url ? (
            <FieldError errors={errors} name="url" id="link-url-error" />
          ) : (
            <p className="hint">{URL_HELP}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="link-title">Title (optional)</label>
          <input
            id="link-title"
            name="title"
            type="text"
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            {...invalidProps(errors, "title", "link-title-error")}
          />
          <FieldError errors={errors} name="title" id="link-title-error" />
        </div>

        <div className="field">
          <label htmlFor="link-description">Description (optional)</label>
          <textarea
            id="link-description"
            name="description"
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            {...invalidProps(errors, "description", "link-description-error")}
          />
          <FieldError errors={errors} name="description" id="link-description-error" />
        </div>

        <TagPicker
          allTags={allTags}
          initialSelected={link?.tags ?? []}
          error={errors?.tagIds?.[0]}
          onChange={() => setTagsChanged(true)}
        />

        <div className="actions">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        </div>
      </form>

      {link && (
        <div className="actions">
          <ConfirmDialog
            triggerLabel="Delete link"
            title="Delete link"
            message="Delete this link? This can't be undone."
            action={deleteLinkAction.bind(null, link.id)}
          />
        </div>
      )}
    </div>
  );
}
