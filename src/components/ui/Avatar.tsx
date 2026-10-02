type Person = { initials: string; avatar_bg: string; avatar_fg: string; full_name?: string };

/** Circle with the person's initial. Stacks overlap by 8px with a ring in the page color. */
export function Avatar({ person, size = 28 }: { person: Person; size?: number }) {
  return (
    <span
      title={person.full_name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: person.avatar_bg,
        color: person.avatar_fg,
        fontSize: Math.round(size * 0.43),
      }}
    >
      {person.initials}
    </span>
  );
}

export function AvatarStack({ people, size = 28 }: { people: Person[]; size?: number }) {
  return (
    <span className="inline-flex">
      {people.map((p, i) => (
        <span
          key={p.initials + i}
          className="rounded-full ring-2 ring-[var(--bg)]"
          style={{ marginLeft: i === 0 ? 0 : -8 }}
        >
          <Avatar person={p} size={size} />
        </span>
      ))}
    </span>
  );
}
