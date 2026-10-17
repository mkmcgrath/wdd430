import type { Metadata } from "next";
import { LinkForm } from "@/components/LinkForm";
import { requireUser } from "@/lib/auth/session";
import { listTags } from "@/lib/services/tags";

export const metadata: Metadata = { title: "Save a link" };

export default async function NewLinkPage() {
  const user = await requireUser();
  const tags = await listTags(user.id);
  return (
    <>
      <div className="page-header">
        <h1>Save a link</h1>
      </div>
      <LinkForm allTags={tags.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
