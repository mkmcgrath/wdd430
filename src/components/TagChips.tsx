import Link from "next/link";
import type { TagRef } from "@/lib/services/tagging";

/** Tag chips that open the given list filtered by that tag (F8 FR-10). */
export function TagChips({ tags, basePath }: { tags: TagRef[]; basePath: "/notes" | "/links" }) {
  if (tags.length === 0) return null;
  return (
    <ul className="chips" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag.id}>
          <Link className="chip" href={`${basePath}?tag=${tag.id}`}>
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
