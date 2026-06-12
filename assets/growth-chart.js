/* ==========================================================
   成長曲線チャート SVG レンダラー
   ========================================================== */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const BANDS = [
    { lo: 3, hi: 97, fill: '#F8D8DD' },
    { lo: 10, hi: 90, fill: '#CCDFF1' },
    { lo: 25, hi: 75, fill: '#BCE5DD' }
  ];
  const PCT_LINES = [97, 90, 75, 50, 25, 10, 3];

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  window.renderGrowthChart = function (container, opts) {
    const G = window.GrowthData;
    const W = 460, H = 330;
    const M = { l: 46, r: 34, t: 14, b: 36 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const maxAgeM = 72;

    const yMinRaw = G.curveValue(opts.sex, opts.metric, 0, 3);
    const yMaxRaw = G.curveValue(opts.sex, opts.metric, maxAgeM, 97);
    const pad = (yMaxRaw - yMinRaw) * 0.06;
    const yMin = yMinRaw - pad, yMax = yMaxRaw + pad;

    const x = (ageM) => M.l + (ageM / maxAgeM) * iw;
    const y = (v) => M.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '成長曲線グラフ' });
    svg.style.width = '100%';
    svg.style.height = 'auto';

    const STEPS = [];
    for (let m = 0; m <= maxAgeM; m += 3) STEPS.push(m);

    BANDS.forEach(b => {
      let d = '';
      STEPS.forEach((m, i) => {
        d += (i ? 'L' : 'M') + x(m).toFixed(1) + ',' + y(G.curveValue(opts.sex, opts.metric, m, b.hi)).toFixed(1);
      });
      for (let i = STEPS.length - 1; i >= 0; i--) {
        d += 'L' + x(STEPS[i]).toFixed(1) + ',' + y(G.curveValue(opts.sex, opts.metric, STEPS[i], b.lo)).toFixed(1);
      }
      d += 'Z';
      svg.appendChild(el('path', { d, fill: b.fill, 'fill-opacity': 0.75 }));
    });

    const range = yMax - yMin;
    const step = range > 60 ? 20 : range > 25 ? 10 : range > 12 ? 5 : 2;
    const gStart = Math.ceil(yMin / step) * step;
    for (let v = gStart; v <= yMax; v += step) {
      svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), stroke: '#E2EAEC', 'stroke-width': 1 }));
      const t = el('text', { x: M.l - 7, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#8B989F', 'font-weight': 700 });
      t.textContent = v;
      svg.appendChild(t);
    }

    svg.appendChild(el('line', { x1: M.l, x2: M.l, y1: M.t, y2: M.t + ih, stroke: '#B9C6CB', 'stroke-width': 1.5 }));
    svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: M.t + ih, y2: M.t + ih, stroke: '#B9C6CB', 'stroke-width': 1.5 }));

    for (let yr = 0; yr <= 6; yr++) {
      const t = el('text', { x: x(yr * 12), y: M.t + ih + 18, 'text-anchor': 'middle', 'font-size': 11, fill: '#8B989F', 'font-weight': 700 });
      t.textContent = yr;
      svg.appendChild(t);
    }
    const xl = el('text', { x: M.l + iw / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#8B989F', 'font-weight': 700 });
    xl.textContent = '年齢(歳)';
    svg.appendChild(xl);
    const yl = el('text', { x: 8, y: M.t + 2, 'text-anchor': 'start', 'font-size': 11, fill: '#8B989F', 'font-weight': 700 });
    yl.textContent = opts.yLabel || '';
    svg.appendChild(yl);

    PCT_LINES.forEach(p => {
      let d = '';
      STEPS.forEach((m, i) => {
        d += (i ? 'L' : 'M') + x(m).toFixed(1) + ',' + y(G.curveValue(opts.sex, opts.metric, m, p)).toFixed(1);
      });
      svg.appendChild(el('path', { d, fill: 'none', stroke: p === 50 ? '#7BC4BB' : '#fff', 'stroke-width': p === 50 ? 1.5 : 1, 'stroke-dasharray': p === 50 ? '4 3' : 'none', opacity: 0.9 }));
      const t = el('text', { x: W - M.r + 5, y: y(G.curveValue(opts.sex, opts.metric, maxAgeM, p)) + 4, 'font-size': 10, fill: p === 97 || p === 3 ? '#E58A98' : '#8FA8C4', 'font-weight': 800 });
      t.textContent = p;
      svg.appendChild(t);
    });

    (opts.compare || []).forEach(c => drawSeries(svg, c.series, c.color, x, y, 3.5, true));

    if (opts.series && opts.series.length) {
      drawSeries(svg, opts.series, '#1FA89B', x, y, 4.5, false);
      const last = opts.series[opts.series.length - 1];
      svg.appendChild(el('circle', { cx: x(last.ageM), cy: y(last.value), r: 8, fill: 'none', stroke: '#1FA89B', 'stroke-width': 2, opacity: 0.45 }));
    }

    container.innerHTML = '';
    container.appendChild(svg);
  };

  function drawSeries(svg, series, color, x, y, r, dashed) {
    if (!series || !series.length) return;
    if (series.length > 1) {
      let d = '';
      series.forEach((p, i) => { d += (i ? 'L' : 'M') + x(p.ageM).toFixed(1) + ',' + y(p.value).toFixed(1); });
      svg.appendChild(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-dasharray': dashed ? '5 4' : 'none' }));
    }
    series.forEach(p => {
      svg.appendChild(el('circle', { cx: x(p.ageM), cy: y(p.value), r, fill: color, stroke: '#fff', 'stroke-width': 1.5 }));
    });
  }
})();
