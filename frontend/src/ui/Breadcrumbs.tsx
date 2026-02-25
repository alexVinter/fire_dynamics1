interface Props {
  items: string[];
}

export default function Breadcrumbs({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          )}
          <span className={i === items.length - 1 ? "font-medium text-[var(--color-text)]" : ""}>
            {item}
          </span>
        </span>
      ))}
    </nav>
  );
}
