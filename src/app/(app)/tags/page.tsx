import type { Metadata } from "next";
import { TagManager } from "@/components/TagManager";
import { requireUser } from "@/lib/auth/session";
import { listTags } from "@/lib/services/tags";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const user = await requireUser();
  const tags = await listTags(user.id);
  return (
    <>
      <div className="page-header">
        <h1>Tags</h1>
      </div>
      <TagManager tags={tags} />
    </>
  );
}
