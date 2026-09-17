import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AnimatedNumber from "../components/AnimatedNumber";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Import() {
  const { api } = useAuth();
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/import/polling-units", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.results);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Import Polling Units</h1>

      <div className="card mb-4">
        <div className="text-sm text-gray-600 mb-4">
          Upload a CSV file with these columns:
          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs" style={{ background: "var(--gray-100)", borderRadius: "var(--radius)" }}>
            lga, ward, polling_unit_code, polling_unit_name, polling_unit_location, latitude, longitude
          </code>
        </div>

        {!file ? (
          <motion.div
            className={`dropzone ${dragActive ? "active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            animate={{ scale: dragActive ? 1.01 : 1 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => acceptFile(e.target.files[0])}
              style={{ display: "none" }}
            />
            <div className="dropzone-icon">
              <UploadCloud size={28} />
            </div>
            <div className="dropzone-title">
              {dragActive ? "Drop the file here" : "Drag & drop your CSV here"}
            </div>
            <div className="dropzone-subtitle">or click to browse</div>
          </motion.div>
        ) : (
          <div className="dropzone-file">
            <FileSpreadsheet size={22} className="text-primary" />
            <div style={{ flex: 1 }}>
              <div className="font-semibold text-sm">{file.name}</div>
              <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
            </div>
            <button className="dropzone-remove" onClick={() => { setFile(null); setResult(null); }}>
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="badge badge-red mb-3 mt-3" style={{ width: "100%", justifyContent: "center" }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary mt-3"
          onClick={handleUpload}
          disabled={uploading || !file}
        >
          {uploading ? "Importing…" : "Import Data"}
        </button>
      </div>

      {result && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="card-header">
            <div className="card-title">Import Results</div>
          </div>
          <div className="import-results-grid">
            <div className="import-result-stat">
              <div className="import-result-value">
                <AnimatedNumber value={result.imported_rows} />
              </div>
              <div className="import-result-label">Imported</div>
            </div>
            <div className="import-result-stat">
              <div className="import-result-value">
                <AnimatedNumber value={result.total_rows} />
              </div>
              <div className="import-result-label">Total Rows</div>
            </div>
            <div className="import-result-stat success">
              <CheckCircle2 size={16} />
              <div className="import-result-value"><AnimatedNumber value={result.valid_rows} /></div>
              <div className="import-result-label">Valid</div>
            </div>
            <div className="import-result-stat danger">
              <XCircle size={16} />
              <div className="import-result-value"><AnimatedNumber value={result.invalid_rows} /></div>
              <div className="import-result-label">Invalid</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle size={14} className="text-danger" /> Errors
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }} className="text-xs">
                {result.errors.map((err, i) => (
                  <div key={i} className="py-1 text-danger" style={{ borderBottom: "1px solid var(--gray-100)" }}>{err}</div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
