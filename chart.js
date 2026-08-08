// ---------------- chart ----------------
function drawChart(answers){
  const ctx = document.getElementById('chart');
  if(!ctx) return;
  const points = answers.map((a,i) => ({
    x: a.confidence + (Math.random()-0.5)*0.25,
    y: a.correct ? 1 : 0,
    label: a.question,
    correct: a.correct,
    confidence: a.confidence
  }));
  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        data: points,
        pointRadius: 8,
        pointHoverRadius: 10,
        backgroundColor: points.map(p => {
          if(!p.correct && p.confidence >= 4) return '#DC9A34';
          return p.correct ? '#3E8C79' : '#B34A36';
        }),
        pointBorderColor: points.map(p => {
          if(!p.correct && p.confidence >= 4) return '#8A5A16';
          return p.correct ? '#1F4A40' : '#6E2A1D';
        }),
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 20 },
      scales: {
        x: {
          min: 0.5, max: 5.5,
          title: { display: true, text: 'Confidence (1\u20135)', color: '#736A55', font:{family:'IBM Plex Mono', size:11} },
          ticks: { stepSize: 1, color: '#736A55', font:{family:'IBM Plex Mono'} },
          grid: { color: '#C9BF9E' }
        },
        y: {
          min: -0.5, max: 1.5,
          ticks: {
            stepSize: 1,
            color: '#736A55',
            font:{family:'IBM Plex Mono'},
            callback: v => v === 1 ? 'Correct' : v === 0 ? 'Wrong' : ''
          },
          grid: { color: '#C9BF9E' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont:{family:'Source Serif 4'},
          titleFont:{family:'Fraunces'},
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return `${p.correct ? 'Correct' : 'Wrong'}, confidence ${p.confidence}/5`;
            },
            title: (items) => {
              const p = items[0].raw;
              return p.label.length > 60 ? p.label.slice(0,60)+'\u2026' : p.label;
            }
          }
        }
      }
    }
  });
}
