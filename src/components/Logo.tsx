/** Placeholder logo — swap for the real brand mark later. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      className="brand-logo"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--brand-primary)" />
      <path d="M16 7 6 19h4v6h12v-6h4L16 7z" fill="#fff" />
      <circle cx="24" cy="9" r="3" fill="var(--brand-accent)" />
    </svg>
  );
}
