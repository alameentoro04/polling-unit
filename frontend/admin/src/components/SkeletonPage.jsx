import SkeletonCard from "./SkeletonCard";
import SkeletonTable from "./SkeletonTable";
import SkeletonChart from "./SkeletonChart";

export default function SkeletonPage({ statCards = 0, variant = "table" }) {
  return (
    <div>
      <div
        className="skeleton-block"
        style={{ height: 22, width: 180, marginBottom: 16 }}
      />

      {statCards > 0 && (
        <div className="summary-grid">
          {Array.from({ length: statCards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {variant === "table" ? (
        <SkeletonTable />
      ) : (
        <div className="charts-grid">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      )}
    </div>
  );
}
