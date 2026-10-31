import { useState } from "preact/hooks";
import { api, href, type Link, type TagRef } from "../lib/api";
import { idFrom, useResource, useSubmit, useUnsavedChanges, useUrlParams } from "../lib/hooks";
import { TagPicker } from "./TagPicker";
import { FieldError, FormError, invalidProps, LoadError, LoadingPage, SubmitButton } from "./ui";

const LINKS = href("/links/");

/** Loads what the form needs. Pass `isNew` for /links/new/, otherwise ?id= picks the link. */
export function LinkEditorPage({ isNew = false }: { isNew?: boolean }) {
  const params = useUrlParams();
  const id = params ? idFrom(params, "id") : undefined;

  const { data, error } = useResource(params && (isNew || id) ? String(id ?? "new") : null, async () => {
    const [tags, link] = await Promise.all([api.tags(), id ? api.link(id) : undefined]);
    return { tags, link };
  });

  if (params && !isNew && !id) {
    return (
      <div class="card empty">
        <p>This link doesn't exist or was deleted.</p>
        <a href={LINKS} class="btn">
          Back to links
        </a>
      </div>
    );
  }
  if (error) return <LoadError problem={error} backHref={LINKS} backLabel="Back to links" />;
  if (!data) return <LoadingPage />;
  return <LinkForm link={data.link} allTags={data.tags} />;
}

function LinkForm({ link, allTags }: { link?: Link; allTags: TagRef[] }) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [tagIds, setTagIds] = useState(link?.tags.map((tag) => tag.id) ?? []);
  const [tagsChanged, setTagsChanged] = useState(false);
  const { pending, errors, submit } = useSubmit();

  const dirty =
    url !== (link?.url ?? "") ||
    title !== (link?.title ?? "") ||
    description !== (link?.description ?? "") ||
    tagsChanged;
  const release = useUnsavedChanges(dirty);

  function onSubmit(event: Event) {
    event.preventDefault();
    submit(async () => {
      const input = { url, title, description, tagIds };
      if (link) await api.updateLink(link.id, input);
      else await api.createLink(input);
      release();
      location.assign(`${LINKS}?saved=1`);
    });
  }

  function cancel() {
    if (dirty && !confirm("Discard your unsaved changes?")) return;
    release();
    location.assign(LINKS);
  }

  return (
    <form class="form card" onSubmit={onSubmit}>
      <FormError errors={errors} />
      <div class="field">
        <label for="link-url">URL</label>
        <input
          id="link-url"
          type="url"
          required
          maxLength={2048}
          placeholder="https://"
          value={url}
          onInput={(event) => setUrl(event.currentTarget.value)}
          {...invalidProps(errors, "url", "link-url-error")}
        />
        <FieldError errors={errors} name="url" id="link-url-error" />
      </div>
      <div class="field">
        <label for="link-title">Title (optional)</label>
        <input
          id="link-title"
          type="text"
          maxLength={200}
          value={title}
          onInput={(event) => setTitle(event.currentTarget.value)}
          {...invalidProps(errors, "title", "link-title-error")}
        />
        <p class="hint">Leave blank to use the URL.</p>
        <FieldError errors={errors} name="title" id="link-title-error" />
      </div>
      <div class="field">
        <label for="link-description">Description (optional)</label>
        <textarea
          id="link-description"
          rows={4}
          maxLength={1000}
          value={description}
          onInput={(event) => setDescription(event.currentTarget.value)}
          {...invalidProps(errors, "description", "link-description-error")}
        />
        <FieldError errors={errors} name="description" id="link-description-error" />
      </div>

      <TagPicker
        allTags={allTags}
        initialSelected={link?.tags ?? []}
        error={errors?.tagIds?.[0]}
        onChange={(ids) => {
          setTagIds(ids);
          setTagsChanged(true);
        }}
      />

      <div class="actions">
        <SubmitButton pending={pending} pendingText="Saving…">
          Save
        </SubmitButton>
        <button type="button" class="btn" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
