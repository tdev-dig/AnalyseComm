import { useMemo, useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import SentimentChart from './components/SentimentChart.jsx';
import WordCloudPanel from './components/WordCloud.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SENTIMENT_OPTIONS = [
  { value: 'all', label: 'Tous les sentiments' },
  { value: 'positif', label: 'Positifs' },
  { value: 'neutre', label: 'Neutres' },
  { value: 'négatif', label: 'Négatifs' }
];

function App() {
  const [uploadInfo, setUploadInfo] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const handleUpload = async (file) => {
    setErrorMessage('');
    setIsUploading(true);
    setResults([]);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorPayload = await safeParseJson(response);
        throw new Error(errorPayload?.detail || "Échec du téléchargement du fichier");
      }

      const data = await response.json();
      setUploadInfo({ ...data, filename: file.name });
      setSelectedColumn(data.detected_column || data.columns?.[0] || '');
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Une erreur inattendue est survenue");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadInfo?.upload_id) {
      setErrorMessage('Veuillez téléverser un fichier avant de lancer l\'analyse.');
      return;
    }

    if (!selectedColumn) {
      setErrorMessage('Veuillez sélectionner une colonne de texte à analyser.');
      return;
    }

    setErrorMessage('');
    setIsAnalyzing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadInfo.upload_id, column: selectedColumn })
      });

      if (!response.ok) {
        const errorPayload = await safeParseJson(response);
        throw new Error(errorPayload?.detail || "Échec de l'analyse du sentiment");
      }

      const payload = await response.json();
      setResults(payload.results ?? []);
      setSummary(payload.summary ?? null);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Une erreur inattendue est survenue pendant l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!uploadInfo?.upload_id) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/results/${uploadInfo.upload_id}/csv`);
      if (!response.ok) {
        const errorPayload = await safeParseJson(response);
        throw new Error(errorPayload?.detail || "Impossible de télécharger le CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = uploadInfo.filename
        ? `resultats_${uploadInfo.filename.replace(/\.[^/.]+$/, '')}.csv`
        : 'resultats_sentiment.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Une erreur s'est produite lors du téléchargement des résultats");
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter((row) => {
      const matchesSentiment =
        sentimentFilter === 'all' ? true : row.sentiment === sentimentFilter;
      const matchesSearch = row.text
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSentiment && matchesSearch;
    });
  }, [results, searchTerm, sentimentFilter]);

  const positivePercentage = summary?.distribution?.positif?.percentage ?? 0;
  const neutralPercentage = summary?.distribution?.neutre?.percentage ?? 0;
  const negativePercentage = summary?.distribution?.['négatif']?.percentage ?? 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Analyseur de sentiment en français
            </h1>
            <p className="text-sm text-slate-500 sm:text-base">
              Téléversez un fichier CSV ou Excel pour détecter automatiquement le sentiment de vos textes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {summary && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Télécharger le CSV
              </button>
            )}
            <a
              href="https://huggingface.co/cardiffnlp/twitter-xlm-roberta-base-sentiment"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-slate-500 hover:text-slate-700 sm:inline"
            >
              Modèle supporté
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">1. Importer votre fichier</h2>
            <p className="mt-1 text-sm text-slate-500">
              Formats acceptés&nbsp;: <code>.csv</code> et <code>.xlsx</code>. Le fichier doit contenir une colonne de texte.
            </p>
            <div className="mt-6">
              <FileUpload onUpload={handleUpload} isUploading={isUploading} />
            </div>

            {uploadInfo && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Fichier chargé</p>
                    <p className="text-sm text-slate-500">{uploadInfo.filename}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label htmlFor="column-select" className="text-sm font-medium text-slate-600">
                      Colonne à analyser
                    </label>
                    <select
                      id="column-select"
                      className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      value={selectedColumn}
                      onChange={(event) => setSelectedColumn(event.target.value)}
                    >
                      {uploadInfo.columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Colonne détectée automatiquement&nbsp;: <span className="font-medium text-slate-600">{uploadInfo.detected_column}</span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !uploadInfo}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isAnalyzing ? 'Analyse en cours…' : 'Analyser le sentiment'}
            </button>

            {errorMessage && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">2. Statistiques globales</h2>
              {!summary ? (
                <p className="mt-3 text-sm text-slate-500">
                  Les statistiques apparaîtront ici après l'analyse du fichier.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 to-white p-4">
                    <p className="text-xs uppercase tracking-wide text-indigo-500">Textes analysés</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.total_texts}</p>
                    <p className="mt-3 text-sm text-slate-500">
                      Sentiment dominant&nbsp;: <span className="font-semibold text-slate-700">{summary.dominant_sentiment}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Polarité globale</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.overall_polarity}</p>
                    <p className="mt-3 text-sm text-slate-500">
                      Score moyen&nbsp;: <span className="font-semibold text-slate-700">{summary.average_score}</span>
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Répartition des sentiments</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className="h-full bg-positive"
                          style={{ width: `${positivePercentage}%` }}
                          title={`Positif : ${positivePercentage}%`}
                        />
                        <span
                          className="h-full bg-neutral"
                          style={{ width: `${neutralPercentage}%` }}
                          title={`Neutre : ${neutralPercentage}%`}
                        />
                        <span
                          className="h-full bg-negative"
                          style={{ width: `${negativePercentage}%` }}
                          title={`Négatif : ${negativePercentage}%`}
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        <p className="text-positive">{positivePercentage}%</p>
                        <p className="text-neutral">{neutralPercentage}%</p>
                        <p className="text-negative">{negativePercentage}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">3. Visualisation</h2>
              {!summary ? (
                <p className="mt-3 text-sm text-slate-500">Les graphiques seront affichés après l'analyse.</p>
              ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <SentimentChart distribution={summary.distribution} />
                  <WordCloudPanel data={summary.word_cloud} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">4. Résultats détaillés</h2>
              <p className="text-sm text-slate-500">Recherchez, filtrez et explorez chaque phrase analysée.</p>
            </div>
            {results.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <input
                  type="search"
                  placeholder="Rechercher un texte..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64"
                />
                <select
                  value={sentimentFilter}
                  onChange={(event) => setSentimentFilter(event.target.value)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {SENTIMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6">
            <ResultsTable results={results} filteredResults={filteredResults} />
          </div>
        </section>
      </main>
    </div>
  );
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

export default App;
