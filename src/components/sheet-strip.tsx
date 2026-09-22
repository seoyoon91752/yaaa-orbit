export type SheetItem = {
  label: string;
  value: string;
  accent?: "primary" | "gold";
};

/** Drafting-sheet title block: a row of monospace readouts above page content. */
export function SheetStrip({ items, note }: { items: SheetItem[]; note?: string }) {
  return (
    <section className="blueprint-panel mb-10 rounded-lg">
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="bg-background/70 px-5 py-4">
            <p className="label-mono">{it.label}</p>
            <p
              className={`mt-1.5 truncate font-mono text-lg ${
                it.accent === "primary"
                  ? "text-primary"
                  : it.accent === "gold"
                    ? "text-gold"
                    : "text-foreground"
              }`}
            >
              {it.value}
            </p>
          </div>
        ))}
      </div>
      {note && (
        <p className="border-t border-border px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
          {note}
        </p>
      )}
    </section>
  );
}
