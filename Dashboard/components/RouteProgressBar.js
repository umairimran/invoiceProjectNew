/**
 * Thin progress bar at the top of the viewport during route changes.
 * Prevents flicker by not replacing the layout — only shows a subtle indicator.
 */
export default function RouteProgressBar({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary/30 overflow-hidden"
      role="progressbar"
      aria-hidden="true"
    >
      <div className="h-full w-1/3 bg-primary animate-route-progress" />
    </div>
  );
}
