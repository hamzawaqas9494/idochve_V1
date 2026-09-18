type Props = {
  eyebrow?: string;
  title: string;
  body?: string;
  invert?: boolean;
};

export function SectionHeading({ eyebrow, title, body, invert }: Props) {
  return (
    <div className={`mx-auto max-w-3xl ${invert ? "text-white" : "text-ink"}`}>
      {eyebrow ? (
        <p
          className={`mb-3 text-xs font-semibold tracking-[0.18em] uppercase ${
            invert ? "text-teal-600" : "text-teal-600"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body ? (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${invert ? "text-white/72" : "text-muted"}`}>
          {body}
        </p>
      ) : null}
    </div>
  );
}
