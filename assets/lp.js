/* LP インタラクション: ハンバーガー / 診断デモ / ヒーローチャート */
(function () {
  const $ = (s) => document.querySelector(s);

  const burger = $('#hamburgerBtn');
  const menu = $('#mobileMenu');
  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('open', !open);
    document.body.style.overflow = open ? '' : 'hidden';
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  const ageSel = $('#demoAge');
  for (let m = 0; m <= 72; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m < 12 ? `${m}か月` : `${Math.floor(m / 12)}歳${m % 12 ? m % 12 + 'か月' : ''}`;
    ageSel.appendChild(opt);
  }
  ageSel.value = 30;

  const G = window.GrowthData;
  const state = { sex: 'boy', tab: 'height' };
  const META = {
    height: { label: '身長', unit: 'cm', y: '身長(cm)' },
    weight: { label: '体重', unit: 'kg', y: '体重(kg)' },
    kaup:   { label: 'カウプ指数', unit: '', y: 'カウプ指数' }
  };

  const boyBtn = $('#demoBoy'), girlBtn = $('#demoGirl');
  boyBtn.addEventListener('click', () => { state.sex = 'boy'; boyBtn.classList.add('on-boy'); girlBtn.classList.remove('on-girl'); compute(); });
  girlBtn.addEventListener('click', () => { state.sex = 'girl'; girlBtn.classList.add('on-girl'); boyBtn.classList.remove('on-boy'); compute(); });

  document.querySelectorAll('.app-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.app-tabs button').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('on');
      btn.setAttribute('aria-selected', 'true');
      state.tab = btn.dataset.tab;
      compute();
    });
  });
  $('#demoSubmit').addEventListener('click', compute);

  function trackSeries(metric, ageM, value) {
    const { mean, sd } = G.statsAt(state.sex, metric, ageM);
    const z = (value - mean) / sd;
    const pts = [];
    for (let m = 0; m <= ageM - 4; m += 6) {
      const s = G.statsAt(state.sex, metric, m);
      pts.push({ ageM: m, value: s.mean + z * s.sd });
    }
    pts.push({ ageM, value });
    return pts;
  }

  function compute() {
    const ageM = +ageSel.value;
    const h = parseFloat($('#demoHeight').value);
    const w = parseFloat($('#demoWeight').value);
    if (!isFinite(h) || !isFinite(w)) return;

    const pH = G.percentile(state.sex, 'height', ageM, h);
    const pW = G.percentile(state.sex, 'weight', ageM, w);
    const k = G.kaup(h, w);
    const kl = G.kaupLabel(k);

    const meta = META[state.tab];
    $('#demoPctHead').textContent = `${meta.label}のパーセンタイル`.replace('カウプ指数のパーセンタイル', 'カウプ指数');
    if (state.tab === 'kaup') {
      $('#demoPctValue').textContent = k.toFixed(1);
      $('#demoPctUnit').textContent = '';
      $('#demoPctBadge').textContent = kl.label;
      renderGrowthChart($('#demoChart'), {
        sex: state.sex, metric: 'kaup', yLabel: meta.y,
        series: trackSeries('kaup', ageM, k)
      });
    } else {
      const p = state.tab === 'height' ? pH : pW;
      const v = state.tab === 'height' ? h : w;
      $('#demoPctValue').textContent = p;
      $('#demoPctUnit').textContent = 'パーセンタイル';
      $('#demoPctBadge').textContent = G.pctBand(p).label;
      renderGrowthChart($('#demoChart'), {
        sex: state.sex, metric: state.tab, yLabel: meta.y,
        series: trackSeries(state.tab, ageM, v)
      });
    }

    const bandTxt = (p) => G.pctBand(p).label.replace('です😊', '').replace('です', '');
    $('#sumHeight').innerHTML = `${pH} <small>パーセンタイル(${bandTxt(pH)})</small>`;
    $('#sumWeight').innerHTML = `${pW} <small>パーセンタイル(${bandTxt(pW)})</small>`;
    $('#sumKaup').innerHTML = `${k.toFixed(1)} <small>(${kl.label})</small>`;

    const ok = pH >= 10 && pH <= 90 && pW >= 10 && pW <= 90 && kl.tone === 'ok';
    $('#sumNote').innerHTML = ok
      ? '<b>🌼 成長はおおむね順調です。</b><br>引き続きバランスの良い食事と生活リズムを大切にしましょう。'
      : '<b>🌱 気になる項目があります。</b><br>一度の測定で判断せず、気になるときは小児科に相談しましょう。';
  }

  compute();

  renderGrowthChart($('#heroChart'), {
    sex: 'boy', metric: 'height', yLabel: '身長(cm)',
    series: trackSeries('height', 30, 88.5)
  });
  const heroP = G.percentile('boy', 'height', 30, 88.5);
  document.querySelector('.hero-chart-card .pct-value b').textContent = heroP;
  document.querySelector('.hero-chart-card .pct-badge').textContent = G.pctBand(heroP).label;
})();
