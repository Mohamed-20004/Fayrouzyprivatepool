/**
 * Brand lockup: first word of the chalet name in the Themysion script,
 * the rest in letter-spaced caps beneath — sized per placement.
 * Always LTR: the wordmark is the logo, identical in all languages.
 */
export function BrandLockup({
  name,
  variant,
}: {
  name: string;
  variant: "header" | "hero" | "footer";
}) {
  const [first, ...rest] = name.split(" ");
  const caps = rest.join(" ");
  return (
    <span className={`lockup lockup-${variant}`} dir="ltr">
      <span className="lockup-script">{first}</span>
      {caps && <span className="lockup-caps">{caps}</span>}
    </span>
  );
}
