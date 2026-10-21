// Labelled fields and titled sections shared by the invoice, cost and subscription forms.

export function Field({ label, children, wide, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-ink3">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink3">{hint}</span>}
    </label>
  );
}

export const Section = ({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section className="flex flex-col gap-4 border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="display text-[18px] leading-[1.1]">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

