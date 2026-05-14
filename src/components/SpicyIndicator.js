/** API may send boolean, 1/0, or string flags */
export function isItemSpicy(item) {
  const v = item?.is_spicy;
  return v === true || v === 1 || v === "1" || v === "true";
}

export function SpicyIndicator({ className = "", sizeClass = "text-[1em]" }) {
  return (
    <span
      role="img"
      aria-label="Spicy"
      title="Spicy"
      className={`inline-flex shrink-0 items-center leading-none text-red-500 ${sizeClass} ${className}`.trim()}
    >
      🌶
    </span>
  );
}
