import { api, href, type Link, type NoteSummary } from "../lib/api";
import { ConfirmDialog, domainOf, LocalTime, TagChips } from "./ui";

/** All user text is rendered as text, never HTML. */
export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <li class="card stack-sm">
      <h2 class="item-title">
        <a href={`${href("/notes/view/")}?id=${note.id}`}>{note.title}</a>
      </h2>
      {note.contentPreview && <p class="clamp-2 wrap-anywhere muted">{note.contentPreview}</p>}
      <div class="item-meta">
        <span>
          Updated <LocalTime date={note.updatedAt} withTime />
        </span>
      </div>
      <TagChips tags={note.tags} basePath="/notes/" />
    </li>
  );
}

/** A saved link. Opens in a new tab without giving it control of this one. */
export function LinkCard({ link, onDeleted }: { link: Link; onDeleted: () => void }) {
  return (
    <li class="card">
      <div class="item-row">
        <div class="stack-sm" style={{ minWidth: 0 }}>
          <h2 class="item-title">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.title}
              <span class="visually-hidden"> (opens in new tab)</span>
            </a>
          </h2>
          <div class="item-meta">
            <span class="wrap-anywhere">{domainOf(link.url)}</span>
            <span>
              Saved <LocalTime date={link.createdAt} />
            </span>
          </div>
          {link.description && <p class="clamp-2 wrap-anywhere">{link.description}</p>}
          <TagChips tags={link.tags} basePath="/links/" />
        </div>
        <div class="item-actions">
          <a href={`${href("/links/edit/")}?id=${link.id}`} class="btn" aria-label={`Edit ${link.title}`}>
            Edit
          </a>
          <ConfirmDialog
            triggerLabel="Delete"
            triggerAriaLabel={`Delete ${link.title}`}
            title="Delete link"
            message="Delete this link? This can't be undone."
            onConfirm={async () => {
              await api.deleteLink(link.id);
              onDeleted();
            }}
          />
        </div>
      </div>
    </li>
  );
}
