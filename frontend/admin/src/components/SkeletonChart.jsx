export default function SkeletonChart({ height = 230, title = true }) {
  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <div
            className="skeleton-block"
            style={{ height: 12, width: "35%" }}
          />
        </div>
      )}
      <div
        className="skeleton-block"
        style={{ height, width: "100%", borderRadius: "var(--radius)" }}
      />
    </div>
  );
}
