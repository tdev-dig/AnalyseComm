import { useRef, useState } from 'react';

function FileUpload({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const dropZoneRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    dropZoneRef.current?.classList.add('ring-2', 'ring-indigo-300');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dropZoneRef.current?.classList.remove('ring-2', 'ring-indigo-300');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dropZoneRef.current?.classList.remove('ring-2', 'ring-indigo-300');
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      onUpload(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-indigo-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-12 w-12 text-indigo-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-3.75-9L12 3 6.75 7.5m5.25-4.5V15"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-slate-700">
          Glissez-déposez votre fichier ici
        </p>
        <p className="text-xs text-slate-500">ou</p>
        <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-indigo-50">
          Parcourir vos fichiers
          <input
            type="file"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <p className="mt-3 text-xs text-slate-400">
          Taille maximale recommandée&nbsp;: 5&nbsp;Mo
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <div className="flex flex-col">
            <span className="font-medium text-slate-700">{selectedFile.name}</span>
            <span className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Effacer
          </button>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUploading ? 'Téléversement…' : 'Charger le fichier'}
        </button>
      </div>
    </form>
  );
}

function formatFileSize(bytes) {
  const units = ['octets', 'Ko', 'Mo', 'Go'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export default FileUpload;
