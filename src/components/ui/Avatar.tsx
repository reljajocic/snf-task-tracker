type Person = { initials: string; avatar_bg: string; avatar_fg: string; full_name?: string; avatar_url?: string | null };

/** Circle with the person's photo, or their initials on their colour. Stacks overlap by 8px. */
export function Avatar({ person, size = 28 }: { person: Person; size?: number }) {
  if (person.avatar_url) {
    return (
      <img
        src={person.avatar_url}
        alt={person.full_name ?? person.initials}
        title={person.full_name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, background: person.avatar_bg }}
      />
    );
  }
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

export function AvatarStack({ people, size = 28, ring = "var(--surf)" }: { people: Person[]; size?: number; ring?: string }) {
  return (
    <span className="inline-flex flex-none">
      {people.map((p, i) => (
        <span
          key={p.initials + i}
          className="flex rounded-full"
          style={{ marginLeft: i === 0 ? 0 : -8, boxShadow: `0 0 0 2px ${ring}` }}
        >
          <Avatar person={p} size={size} />
        </span>
      ))}
    </span>
  );
}
