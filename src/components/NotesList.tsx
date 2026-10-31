import { api, href } from "../lib/api";
import { NoteCard } from "./ItemCards";
import { ListView } from "./ListView";

export function NotesList() {
  return (
    <ListView
      load={api.notes}
      noun="note"
      newHref={href("/notes/new/")}
      newLabel="New note"
      flashes={{ deleted: "Note deleted." }}
      renderItem={(note) => <NoteCard key={note.id} note={note} />}
    />
  );
}
