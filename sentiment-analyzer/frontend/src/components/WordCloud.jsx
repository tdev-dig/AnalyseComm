import { useMemo, useState } from 'react';
import WordCloud from 'react-d3-cloud';

const SENTIMENT_LABELS = {
  positif: 'Positif',
  neutre: 'Neutre',
  'négatif': 'Négatif'
};

function WordCloudPanel({ data = {} }) {
  const sentiments = Object.keys(SENTIMENT_LABELS);
  const [activeSentiment, setActiveSentiment] = useState('positif');

  const words = useMemo(() => {
    const selected = data?.[activeSentiment] ?? [];
    return selected.map((item) => ({
      text: item.text,
      value: item.value
    }));
  }, [data, activeSentiment]);

  const hasWords = words.length > 0;

  return (
    <div className="flex h-64 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex gap-2">
        {sentiments.map((sentiment) => (
          <button
            key={sentiment}
            type="button"
            onClick={() => setActiveSentiment(sentiment)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeSentiment === sentiment
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {SENTIMENT_LABELS[sentiment]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1">
        {!hasWords ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
            Les mots clés apparaitront après l'analyse.
          </div>
        ) : (
          <WordCloud
            data={words}
            font="Inter"
            fontWeight="bold"
            spiral="rectangular"
            rotate={0}
            padding={2}
            fontSizeMapper={(word) => Math.max(Math.log2(word.value + 1) * 12, 12)}
          />
        )}
      </div>
    </div>
  );
}

export default WordCloudPanel;
