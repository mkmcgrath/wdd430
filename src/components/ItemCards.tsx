import Link from "next/link";
import { deleteLinkAction } from "@/app/actions/links";
import type { Link as SavedLink } from "@/lib/services/links";
import type { NoteSummary } from "@/lib/services/notes";
import { domainOf } from "@/lib/params";
import { ConfirmDialog } from "./ConfirmDialog";
import { LocalTime } from "./LocalTime";
import { TagChips } from "./TagChips";

/** A note in a list (F5). All user text is rendered as text, never HTML (C5). */
export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <li className="card stack-sm">
      <h2 className="item-title">
        <Link href={`/notes/${note.id}`}>{note.title}</Link>
      </h2>
      {note.contentPreview && <p className="clamp-2 wrap-anywhere muted">{note.contentPreview}</p>}
      <div className="item-meta">
        <span>
          Updated <LocalTime date={note.updatedAt} withTime />
        </span>
      </div>
      <TagChips tags={note.tags} basePath="/notes" />
    </li>
  );
}

/** A saved link in a list (F6). Opens in a new tab without giving it control of this one. */
export function LinkCard({ link }: { link: SavedLink }) {
  return (
    <li className="card">
      <div className="item-row">
        <div className="stack-sm" style={{ minWidth: 0 }}>
          <h2 className="item-title">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.title}
              <span className="visually-hidden"> (opens in new tab)</span>
            </a>
          </h2>
          <div className="item-meta">
            <span className="wrap-anywhere">{domainOf(link.url)}</span>
            <span>
              Saved <LocalTime date={link.createdAt} />
            </span>
          </div>
          {link.description && <p className="clamp-2 wrap-anywhere">{link.description}</p>}
          <TagChips tags={link.tags} basePath="/links" />
        </div>
        <div className="item-actions">
          <Link href={`/links/${link.id}/edit`} className="btn" aria-label={`Edit ${link.title}`}>
            Edit
          </Link>
          <ConfirmDialog
            triggerLabel="Delete"
            triggerAriaLabel={`Delete ${link.title}`}
            title="Delete link"
            message="Delete this link? This can't be undone."
            action={deleteLinkAction.bind(null, link.id)}
          />
        </div>
      </div>
    </li>
  );
}
