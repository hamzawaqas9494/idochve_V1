type Props = {
  title: string;
  children: React.ReactNode;
};

export function ProductFrame({ title, children }: Props) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <figcaption className="flex items-center gap-2 border-b border-border bg-paper-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="ms-2 font-mono text-[0.7rem] text-muted">{title}</span>
      </figcaption>
      <div className="p-4 text-sm">{children}</div>
    </figure>
  );
}
