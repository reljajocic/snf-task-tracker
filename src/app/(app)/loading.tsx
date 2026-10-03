// Shown instantly while a screen loads (the server is a few hundred ms away).
export default function Loading() {
  const bar = "animate-pulse rounded-md bg-chip";
  return (
    <div aria-busy="true" className="flex flex-col gap-8 px-5 pb-12 pt-8 lg:px-10 lg:pt-9">
      <div className="flex flex-col gap-3">
        <div className={`${bar} h-3 w-40`} />
        <div className={`${bar} h-10 w-64 lg:h-11`} />
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${bar} h-[62px] w-full`} style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}
