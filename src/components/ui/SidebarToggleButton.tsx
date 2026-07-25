type SidebarToggleButtonProps = {
  open: boolean;
  onToggle: () => void;
  controls: string;
};

export function SidebarToggleButton({ open, onToggle, controls }: SidebarToggleButtonProps) {
  return (
    <button
      type="button"
      className="button button--neon runtime-shell__panel-toggle"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
    >
      {open ? "Hide panel" : "Open panel"}
    </button>
  );
}

