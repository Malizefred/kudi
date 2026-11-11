import { formatNgn } from "@/lib/kudi/model";

export { formatNgn };

type Mini = { id: string; name: string; aliases: string[] };

export function matchContactSafe<T extends Mini>(text: string, contacts: T[]): T | undefined {
  const hay = text.toLowerCase();
  let best: { contact: T; len: number } | undefined;
  for (const contact of contacts) {
    for (const key of [contact.name, ...contact.aliases]) {
      const al = key.toLowerCase();
      if (al.length < 3) continue;
      if (hay.includes(al) && (!best || al.length > best.len)) best = { contact, len: al.length };
    }
  }
  return best?.contact;
}
