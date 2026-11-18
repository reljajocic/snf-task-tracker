"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClientDoc } from "./actions";

/** A button that makes a page (blank, or from a starter) and opens it for editing. */
export function NewDoc({ clientId, title, body, label, className }: { clientId: string; title: string; body?: string; label: React.ReactNode; className: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() =>
          start(async () => {
            const res = await createClientDoc(clientId, title, body);
            if (res.error || !res.id) return setError(res.error);
            router.push(`/clients/${clientId}/docs?d=${res.id}&edit=1`);
          })
        }
      >
        {label}
      </button>
      {error && <p role="alert" className="text-[13px] text-red-ink">{error}</p>}
    </>
  );
}
