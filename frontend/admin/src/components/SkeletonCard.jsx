export default function SkeletonCard() {
  return (
    <div className="card">
      <div
        className="skeleton-block"
        style={{ height: 14, width: "55%", marginBottom: 14 }}
      />
      <div className="skeleton-block" style={{ height: 30, width: "40%" }} />
    </div>
  );
}
