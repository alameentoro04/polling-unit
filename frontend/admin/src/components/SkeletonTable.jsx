export default function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <div
                  className="skeleton-block"
                  style={{ height: 10, width: "70%" }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <div
                    className="skeleton-block"
                    style={{ height: 12, width: c === 0 ? "60%" : "85%" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
