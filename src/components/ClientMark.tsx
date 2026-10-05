import { clientInitials } from "@/lib/client-status";
import { inkOn } from "@/lib/color";

/** A client's square mark: their own colour and initials, or neutral glass with generated initials. */
export function ClientMark({
  client,
  size = 42,
}: {
  client: { name: string; color?: string | null; initials?: string | null };
  size?: number;
}) {
  const text = client.initials || clientInitials(client.name);
  return (
    <span
      className={`display grid flex-none place-items-center rounded-md leading-none ${client.color ? "" : "bg-surf2"}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size / (text.length > 2 ? 3.6 : 3)),
        ...(client.color ? { background: client.color, color: inkOn(client.color), boxShadow: `0 6px 22px ${client.color}55` } : {}),
      }}
    >
      {text}
    </span>
  );
}
