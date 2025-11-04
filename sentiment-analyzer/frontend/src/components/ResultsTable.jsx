const sentimentVariants = {
  positif: 'bg-positive/10 text-positive border-positive/30',
  neutre: 'bg-neutral/10 text-neutral border-neutral/30',
  'négatif': 'bg-negative/10 text-negative border-negative/30'
};

function ResultsTable({ results, filteredResults }) {
  if (!results || results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Les résultats apparaîtront après l'analyse de votre fichier.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 bg-white">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Texte original
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sentiment
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {filteredResults.map((row, index) => (
              <tr key={`${row.text}-${index}`} className="transition hover:bg-slate-50">
                <td className="max-w-xl px-6 py-4 align-top text-slate-600">
                  <p className="whitespace-pre-line text-sm leading-relaxed">{row.text}</p>
                  {row.clean_text !== row.text && (
                    <p className="mt-2 text-xs text-slate-400">Version nettoyée&nbsp;: {row.clean_text}</p>
                  )}
                </td>
                <td className="px-6 py-4 align-top">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${sentimentVariants[row.sentiment] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {capitalize(row.sentiment)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right align-top font-semibold text-slate-800">
                  {row.score.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between bg-slate-50 px-6 py-3 text-xs text-slate-500">
        <span>{filteredResults.length} sur {results.length} phrases affichées</span>
        <span>Trié par ordre d'apparition</span>
      </div>
    </div>
  );
}

function capitalize(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default ResultsTable;
