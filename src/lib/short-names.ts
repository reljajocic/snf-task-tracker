/**
 * Short names for tight spots (chips, stat cards): the first name, plus the last name's initial when two people
 * share a first name ("Marko" and "Marko V."), so nobody is mistaken for someone else.
 */
export function shortNames(people: { id: string; full_name: string }[]): Record<string, string> {
  const first = (n: string) => n.trim().split(/\s+/)[0] ?? n;
  const count = new Map<string, number>();
  for (const p of people) count.set(first(p.full_name), (count.get(first(p.full_name)) ?? 0) + 1);
  return Object.fromEntries(
    people.map((p) => {
      const parts = p.full_name.trim().split(/\s+/);
      const f = parts[0] ?? p.full_name;
      return [p.id, (count.get(f) ?? 0) > 1 && parts.length > 1 ? `${f} ${parts[parts.length - 1][0]}.` : f];
    }),
  );
}
