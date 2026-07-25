type SidebarToggleButtonProps = {
  open: boolean;
  onToggle: () => void;
  controls: string;
  closedLabel?: string;
  openLabel?: string;
};

export function SidebarToggleButton({
  open,
  onToggle,
  controls,
  closedLabel = "Open panel",
  openLabel = "Explore map",
}: SidebarToggleButtonProps) {
  return (
    <button
      type="button"
      className="button button--ghost runtime-shell__panel-toggle"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
    >
      {open ? openLabel : closedLabel}
    </button>
  );
}
