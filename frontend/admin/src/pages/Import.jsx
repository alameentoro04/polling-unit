import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Import() {
  const { api } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setResult(null)
    setError('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/import/polling-units', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data.results)
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Import Polling Units</h1>

      <div className="card mb-4">
        <div className="text-sm text-gray-600 mb-4">
          Upload a CSV file with the following columns:
          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
            lga, ward, polling_unit_code, polling_unit_name, polling_unit_location, latitude, longitude
          </code>
        </div>

        <form onSubmit={handleUpload}>
          <div className="mb-3">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="input w-full"
            />
          </div>

          {error && (
            <div className="badge badge-red mb-3" style={{ width: '100%', justifyContent: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Import Data'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Import Results</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-primary">{result.imported_rows}</div>
              <div className="text-xs text-gray-500">Imported</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{result.total_rows}</div>
              <div className="text-xs text-gray-500">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{result.valid_rows}</div>
              <div className="text-xs text-gray-500">Valid</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{result.invalid_rows}</div>
              <div className="text-xs text-gray-500">Invalid</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Errors:</div>
              <div className="max-h-48 overflow-y-auto text-xs">
                {result.errors.map((err, i) => (
                  <div key={i} className="py-1 text-red-600 border-b border-gray-100">{err}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
