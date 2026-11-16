// Grey placeholder blocks shown instantly while a page loads.
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      <div className="nav-progress on" aria-hidden />
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="sk sk-card" />
      ))}
    </div>
  );
}
