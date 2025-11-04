import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

const COLORS = {
  positif: '#22c55e',
  neutre: '#6b7280',
  'négatif': '#ef4444'
};

function SentimentChart({ distribution }) {
  const chartData = buildChartData(distribution);
  const hasData = chartData.some((item) => item.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        Le graphique apparaîtra après l'analyse.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.sentiment]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value} phrases`}
            labelFormatter={(label) => label}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
        {chartData.map((entry) => (
          <div key={entry.sentiment} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[entry.sentiment] }}
            />
            <span>
              {entry.name} &middot; {entry.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildChartData(distribution = {}) {
  return [
    {
      name: 'Positif',
      sentiment: 'positif',
      value: distribution.positif?.count ?? 0,
      percentage: distribution.positif?.percentage ?? 0
    },
    {
      name: 'Neutre',
      sentiment: 'neutre',
      value: distribution.neutre?.count ?? 0,
      percentage: distribution.neutre?.percentage ?? 0
    },
    {
      name: 'Négatif',
      sentiment: 'négatif',
      value: distribution['négatif']?.count ?? 0,
      percentage: distribution['négatif']?.percentage ?? 0
    }
  ];
}

export default SentimentChart;
