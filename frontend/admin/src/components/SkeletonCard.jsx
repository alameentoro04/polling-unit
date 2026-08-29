export default function SkeletonCard() {
  return (
    <div className="card" style={{ animation: "pulse 2s infinite" }}>
      <div
        style={{
          height: 16,
          background: "#e5e7eb",
          borderRadius: 4,
          width: "60%",
          marginBottom: 12,
        }}
      />
      <div
        style={{
          height: 32,
          background: "#e5e7eb",
          borderRadius: 4,
          width: "40%",
        }}
      />
    </div>
  );
}
