import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { LinkCard } from "@/components/ItemCards";
import { ListFilters } from "@/components/ListFilters";
import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { param, type SearchParams } from "@/lib/params";
import { listLinks, type Link as SavedLink } from "@/lib/services/links";
import { listTags } from "@/lib/services/tags";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: "Links" };

export default async function LinksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = param(params, "q") ?? "";
  const tagParam = param(params, "tag");
  const tagId = tagParam ? (parseId(tagParam) ?? undefined) : undefined;

  const tags = await listTags(user.id);
  let links: SavedLink[] = [];
  let error: string | undefined;
  try {
    links = await listLinks(user.id, { q, tagId });
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    error = Object.values(e.errors ?? {})[0]?.[0];
  }
  const filtered = Boolean(q.trim() || tagId);
  const tagName = tags.find((tag) => tag.id === tagId)?.name;

  return (
    <>
      <div className="page-header">
        <h1>Links</h1>
        <Link href="/links/new" className="btn btn-primary">
          Save a link
        </Link>
      </div>
      {param(params, "deleted") && <Flash message="Link deleted." />}
      {param(params, "saved") && <Flash message="Link saved." />}
      <ListFilters key={tagId ?? "all"} tags={tags} q={q} tagId={tagId} searchLabel="Search links" />
      {error && <Flash tone="error" message={error} />}

      {links.length === 0 && !error ? (
        <div className="card empty">
          {!filtered ? (
            <>
              <p>No saved links yet</p>
              <Link href="/links/new" className="btn btn-primary">
                Save a link
              </Link>
            </>
          ) : (
            <>
              <p className="wrap-anywhere">
                {q.trim() ? `No results for '${q.trim()}'.` : `No links tagged '${tagName ?? "this tag"}'.`}
              </p>
              <Link href="/links" className="btn">
                {q.trim() ? "Clear search" : "Clear filter"}
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="card-list" aria-label={`${links.length} links`}>
          {links.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </ul>
      )}
    </>
  );
}
