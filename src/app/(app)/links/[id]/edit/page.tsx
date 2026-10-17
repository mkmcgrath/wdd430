import type { Metadata } from "next";
import Link from "next/link";
import { LinkForm } from "@/components/LinkForm";
import { requireUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { getLink, type Link as SavedLink } from "@/lib/services/links";
import { listTags } from "@/lib/services/tags";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: "Edit link" };

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = parseId((await params).id);

  let link: SavedLink | null = null;
  if (id) {
    try {
      link = await getLink(user.id, id);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
    }
  }

  if (!link) {
    return (
      <div className="card empty">
        <h1>Link not found</h1>
        <p>This link doesn&apos;t exist or was deleted.</p>
        <Link href="/links" className="btn btn-primary">
          Back to links
        </Link>
      </div>
    );
  }

  const tags = await listTags(user.id);
  return (
    <>
      <div className="page-header">
        <h1>Edit link</h1>
      </div>
      <LinkForm key={link.id} link={link} allTags={tags.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
