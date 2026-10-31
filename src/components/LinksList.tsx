import { api, href } from "../lib/api";
import { LinkCard } from "./ItemCards";
import { ListView } from "./ListView";

export function LinksList() {
  return (
    <ListView
      load={api.links}
      noun="link"
      newHref={href("/links/new/")}
      newLabel="Save a link"
      flashes={{ saved: "Link saved." }}
      renderItem={(link, { removed }) => (
        <LinkCard key={link.id} link={link} onDeleted={() => removed(link.id, "Link deleted.")} />
      )}
    />
  );
}
