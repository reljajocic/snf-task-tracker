import { Fragment } from "react";
import { docBlocks, docInline } from "@/lib/doc-text";

function Line({ text }: { text: string }) {
  return (
    <>
      {docInline(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i} className="font-semibold text-ink">{p.text}</strong>
        ) : p.kind === "link" ? (
          <a key={i} href={p.href} target="_blank" rel="noreferrer" className="break-words font-medium text-rust-ink underline decoration-[1px] underline-offset-2 hover:opacity-80">
            {p.text}
          </a>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

/** A client doc as read: headings, lists, bold and links from the few marks people type. */
export function DocBody({ body }: { body: string }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-3 text-[15px] leading-relaxed text-ink2">
      {docBlocks(body).map((b, i) =>
        b.kind === "heading" ? (
          b.level === 1 ? (
            <h2 key={i} className="display mt-3 text-[20px] leading-[1.15] text-ink first:mt-0">
              <Line text={b.text} />
            </h2>
          ) : (
            <h3 key={i} className="mt-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink first:mt-0">
              <Line text={b.text} />
            </h3>
          )
        ) : b.kind === "list" ? (
          (() => {
            const L = b.ordered ? "ol" : "ul";
            return (
              <L key={i} className={`flex flex-col gap-1.5 pl-5 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-ink3`}>
                {b.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <Line text={item} />
                  </li>
                ))}
              </L>
            );
          })()
        ) : (
          <p key={i} className="whitespace-pre-line">
            <Line text={b.text} />
          </p>
        ),
      )}
    </div>
  );
}
