import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function Pagination({ currentPage, lastPage, onChange }) {
  if (!lastPage || lastPage <= 1) return null;

  const windowSize = 1; // pages shown on each side of the current one
  const pages = new Set([1, lastPage]);
  for (let p = currentPage - windowSize; p <= currentPage + windowSize; p++) {
    if (p >= 1 && p <= lastPage) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const items = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push({ ellipsis: true, key: `e${p}` });
    items.push({ page: p, key: p });
    prev = p;
  }

  return (
    <div className="pagination">
      <button
        onClick={() => onChange(1)}
        disabled={currentPage === 1}
        aria-label="First page"
      >
        <ChevronsLeft size={14} />
      </button>
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>

      {items.map((item) =>
        item.ellipsis ? (
          <span key={item.key} className="pagination-ellipsis">
            …
          </span>
        ) : (
          <button
            key={item.key}
            className={currentPage === item.page ? "active" : ""}
            onClick={() => onChange(item.page)}
          >
            {item.page}
          </button>
        )
      )}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === lastPage}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
      <button
        onClick={() => onChange(lastPage)}
        disabled={currentPage === lastPage}
        aria-label="Last page"
      >
        <ChevronsRight size={14} />
      </button>

      <span className="pagination-info">
        Page {currentPage} of {lastPage}
      </span>
    </div>
  );
}
