const beltStyles: Record<string, { background: string; color: string; border: string }> = {
  white: { background: '#ffffff', color: '#374151', border: '#e5e7eb' },
  yellow: { background: '#fef9c3', color: '#854d0e', border: '#fde68a' },
  orange: { background: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
  green: { background: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  blue: { background: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  purple: { background: '#ede9fe', color: '#5b21b6', border: '#ddd6fe' },
  brown: { background: '#f5e7d3', color: '#78350f', border: '#e7c49f' },
  black: { background: '#111827', color: '#f9fafb', border: '#111827' },
};

function normalizeBeltName(belt?: string | null) {
  return belt?.trim() || 'Unranked';
}

export function BeltBadge({ belt }: { belt?: string | null }) {
  const label = normalizeBeltName(belt);
  const matchedStyle = Object.entries(beltStyles).find(([name]) => label.toLowerCase().includes(name))?.[1];
  const style = matchedStyle ?? { background: '#f9fafb', color: '#4b5563', border: '#e5e7eb' };

  return (
    <span
      className="belt-badge"
      style={{
        background: style.background,
        color: style.color,
        borderColor: style.border,
      }}
    >
      {label}
    </span>
  );
}
