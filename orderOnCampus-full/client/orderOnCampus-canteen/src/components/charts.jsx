import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { money } from '../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
ChartJS.defaults.color = '#66716F';

const PALETTE = ['#0E6B6B', '#F29E38', '#4FA7A0', '#C9761A', '#8CCBC4', '#9C5A12', '#073D3D', '#FDDDB0'];

const grid = { color: '#EFEBE3', drawTicks: false };
const tooltip = { backgroundColor: '#13201F', padding: 10, cornerRadius: 8, titleFont: { weight: '700' }, boxPadding: 4 };

const moneyTick = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`);

// Screen readers get the same numbers as a visually hidden table.
function DataTable({ caption, labels, series }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th>Label</th>{series.map((s) => <th key={s.label}>{s.label}</th>)}</tr></thead>
      <tbody>{labels.map((l, i) => <tr key={l}><th>{l}</th>{series.map((s) => <td key={s.label}>{s.format ? s.format(s.data[i]) : s.data[i]}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function TrendChart({ labels, series, height = 260, caption, money: isMoney }) {
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      type: s.type || 'line',
      borderColor: s.color || PALETTE[i],
      backgroundColor: s.type === 'bar' ? `${s.color || PALETTE[i]}CC` : `${s.color || PALETTE[i]}1F`,
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
      legend: { display: series.length > 1, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
      tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${series[ctx.datasetIndex].format ? series[ctx.datasetIndex].format(ctx.parsed.y) : ctx.parsed.y}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { beginAtZero: true, grid, border: { display: false }, ticks: { precision: 0, padding: 8, callback: isMoney ? moneyTick : undefined } },
      ...(hasRight ? { y1: { beginAtZero: true, position: 'right', grid: { display: false }, border: { display: false }, ticks: { precision: 0, padding: 8 } } } : {}),
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
            x: { beginAtZero: true, grid, border: { display: false }, ticks: { precision: 0 } },
            y: { grid: { display: false }, ticks: { color: '#13201F', font: { weight: '600' } } },
          },
        }}
      />
      <DataTable caption={caption} labels={labels} series={[{ label, data, format }]} />
    </div>
  );
}

export function DonutChart({ labels, data, caption, height = 220, format = money, colors = PALETTE }) {
  return (
    <div style={{ height }} role="img" aria-label={caption}>
      <Doughnut
        data={{ labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 12 } },
            tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ${format(ctx.parsed)}` } },
          },
        }}
      />
      <DataTable caption={caption} labels={labels} series={[{ label: 'Value', data, format }]} />
    </div>
  );
}
