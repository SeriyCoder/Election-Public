import type { ComponentChildren } from 'preact';

export interface PieSlice {
  readonly key: string;
  readonly color: string;
  /** Exact percent texts from `panelSlices`; display geometry only. */
  readonly start: string;
  readonly size: string;
  /** Plain text shown in the native tooltip and the accessible name. */
  readonly title: string;
}

/**
 * A pie of SVG stroke slices: each slice is its own hover and tap target,
 * the others dim while one is active.
 */
export function HoverPie({
  slices,
  label,
  active,
  onActive,
  class: className = 'ws-pie',
  children,
}: {
  readonly slices: readonly PieSlice[];
  readonly label: string;
  readonly active: string | null;
  readonly onActive: (key: string | null) => void;
  readonly class?: string;
  readonly children?: ComponentChildren;
}) {
  return (
    <div class={`${className} ws-hover-pie`} data-active={active !== null}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={label}
        onMouseLeave={() => onActive(null)}
      >
        {slices.map((slice) => (
          <circle
            key={slice.key}
            data-slice={slice.key}
            data-on={slice.key === active}
            cx="50"
            cy="50"
            r="25"
            pathLength="100"
            fill="none"
            stroke={slice.color}
            stroke-width="50"
            stroke-dasharray={`${slice.size} 100`}
            stroke-dashoffset={`-${slice.start}`}
            onMouseEnter={() => onActive(slice.key)}
            onClick={() => onActive(slice.key === active ? null : slice.key)}
          >
            <title>{slice.title}</title>
          </circle>
        ))}
      </svg>
      {children}
    </div>
  );
}
