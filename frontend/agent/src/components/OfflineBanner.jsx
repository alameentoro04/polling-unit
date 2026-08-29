export default function OfflineBanner({ isOnline }) {
  if (isOnline) return null;
  return (
    <div className="offline-banner">
      OFFLINE — Records saved locally. Will sync when connection returns.
    </div>
  );
}
