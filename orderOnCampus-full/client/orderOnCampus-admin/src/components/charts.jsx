import { useEffect, useState } from 'react';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { money } from '../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';

const PALETTE = ['#0E6B6B', '#F29E38', '#4FA7A0', '#C9761A', '#2563A5', '#8CCBC4', '#9C5A12', '#1F8A5B'];

// Re-renders charts when the light/dark class on <html> changes.
function useChartTheme() {
  const read = () => {
    const dark = document.documentElement.classList.contains('dark');
    return { dark, text: dark ? '#94A2A0' : '#646F6D', grid: dark ? 'rgba(255,255,255,0.07)' : '#EEEBE4', strong: dark ? '#E6EEED' : '#111B1A', border: dark ? '#141B1B' : '#FFFFFF' };
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

const tooltip = { backgroundColor: '#101A19', padding: 10, cornerRadius: 8, titleFont: { weight: '700' }, boxPadding: 4 };
const moneyTick = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`);

// Screen readers get the same numbers as a visually hidden table.
function DataTable({ caption, labels, series }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th>Label</th>{series.map((s) => <th key={s.label}>{s.label}</th>)}</tr></thead>
      <tbody>{labels.map((l, i) => <tr key={`${l}-${i}`}><th>{l}</th>{series.map((s) => <td key={s.label}>{s.format ? s.format(s.data[i]) : s.data[i]}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function TrendChart({ labels, series, height = 260, caption, money: isMoney }) {
  const t = useChartTheme();
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      type: s.type || 'line',
      borderColor: s.color || PALETTE[i],
      backgroundColor: s.type === 'bar' ? `${s.color || PALETTE[i]}CC` : `${s.color || PALETTE[i]}22`,
      fill: s.type !== 'bar' && i === 0,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: labels.length > 31 ? 0 : 3,
      pointHoverRadius: 5,
      borderRadius: 6,
      maxBarThickness: 28,
      yAxisID: s.axis || 'y',
    })),
  };
  const hasRight = series.some((s) => s.axis === 'y1');
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: series.length > 1, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16, color: t.text } },
      tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${series[ctx.datasetIndex].format ? series[ctx.datasetIndex].format(ctx.parsed.y) : ctx.parsed.y}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: t.text } },
      y: { beginAtZero: true, grid: { color: t.grid, drawTicks: false }, border: { display: false }, ticks: { precision: 0, padding: 8, color: t.text, callback: isMoney ? moneyTick : undefined } },
      ...(hasRight ? { y1: { beginAtZero: true, position: 'right', grid: { display: false }, border: { display: false }, ticks: { precision: 0, padding: 8, color: t.text } } } : {}),
    },
  };
  const ChartTag = series.every((s) => s.type === 'bar') ? Bar : Line;
  return (
    <div style={{ height }} role="img" aria-label={caption}>
      <ChartTag data={data} options={options} />
      <DataTable caption={caption} labels={labels} series={series} />
    </div>
  );
}

export function HBarChart({ labels, data, label, height, caption, format = (v) => v, color = PALETTE[0] }) {
  const t = useChartTheme();
  const h = height || Math.max(160, labels.length * 38);
  return (
    <div style={{ height: h }} role="img" aria-label={caption}>
      <Bar
        data={{ labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 6, maxBarThickness: 22 }] }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${label}: ${format(ctx.parsed.x)}` } } },
          scales: {
            x: { beginAtZero: true, grid: { color: t.grid }, border: { display: false }, ticks: { precision: 0, color: t.text } },
            y: { grid: { display: false }, ticks: { color: t.strong, font: { weight: '600' } } },
          },
        }}
      />
      <DataTable caption={caption} labels={labels} series={[{ label, data, format }]} />
    </div>
  );
}

export function DonutChart({ labels, data, caption, height = 220, format = money }) {
  const t = useChartTheme();
  return (
    <div style={{ height }} role="img" aria-label={caption}>
      <Doughnut
        data={{ labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 2, borderColor: t.border, hoverOffset: 6 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 12, color: t.text } },
            tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ${format(ctx.parsed)}` } },
          },
        }}
      />
      <DataTable caption={caption} labels={labels} series={[{ label: 'Value', data, format }]} />
    </div>
  );
}
