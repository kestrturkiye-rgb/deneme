/** A decorative angle repeated from the direction of the Kıvanç mark. */
export default function BrandLines({ className = "" }: { className?: string }) {
  return (
    <svg
      className={"kg-brand-lines " + className}
      viewBox="0 0 520 600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m410-60-280 360 280 360M480-60 200 300l280 360M550-60 270 300l280 360" />
      <path d="m340-60-280 360 280 360" strokeWidth="2" />
    </svg>
  );
}
