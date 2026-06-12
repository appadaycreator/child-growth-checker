/* 診断画面ロジック */
(function () {
  const $ = (s) => document.querySelector(s);
  const G = window.GrowthData;

  const burger = $('#hamburgerBtn');
  const menu = $('#mobileMenu');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('open', !open);
      document.body.style.overflow = open ? '' : 'hidden';
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  function fillAges(sel, def) {
    for (let m = 0; m <= 72; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m < 12 ? `${m}か月` : `${Math.floor(m / 12)}歳${m % 12 ? m % 12 + 'か月' : ''}`;
      sel.appendChild(opt);
    }
    sel.value = def;
  }
  fillAges($('#age'), 30);
  fillAges($('#cmpAge'), 54);

  const META = {
    height: { label: '身長', unit: 'cm', y: '身長(cm)' },
    weight: { label: '体重', unit: 'kg', y: '体重(kg)' },
    kaup:   { label: 'カウプ指数', unit: '', y: 'カウプ指数' },
    head:   { label: '頭囲', unit: 'cm', y: '頭囲(cm)' },
    chest:  { label: '胸囲', unit: 'cm', y: '胸囲(cm)' }
  };
  const state = { sex: 'boy', cmpSex: 'girl', tab: 'height', compare: false };

  function wireSex(boyId, girlId, key) {
    const b = $(boyId), g = $(girlId);
    b.addEventListener('click', () => { state[key] = 'boy'; b.classList.add('on-boy'); g.classList.remove('on-girl'); compute(); });
    g.addEventListener('click', () => { state[key] = 'girl'; g.classList.add('on-girl'); b.classList.remove('on-boy'); compute(); });
  }
  wireSex('#sexBoy', '#sexGirl', 'sex');
  wireSex('#cmpBoy', '#cmpGirl', 'cmpSex');

  document.querySelectorAll('.metric-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metric-tabs button').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('on');
      btn.setAttribute('aria-selected', 'true');
      state.tab = btn.dataset.tab;
      compute();
    });
  });

  $('#compareToggle').addEventListener('click', () => {
    state.compare = !state.compare;
    $('#compareForm').classList.toggle('open', state.compare);
    $('#compareToggle').textContent = state.compare ? '－ 比較をやめる' : '＋ きょうだいを追加して比較';
    compute();
  });

  $('#calcBtn').addEventListener('click', compute);
  $('#cmpApply').addEventListener('click', compute);
  $('#pdfBtn').addEventListener('click', () => window.print());

  function val(id) { const v = parseFloat($(id).value); return isFinite(v) ? v : null; }

  function trackSeries(sex, metric, ageM, value) {
    const { mean, sd } = G.statsAt(sex, metric, ageM);
    const z = (value - mean) / sd;
    const pts = [];
    for (let m = 0; m <= ageM - 4; m += 6) {
      const s = G.statsAt(sex, metric, m);
      pts.push({ ageM: m, value: s.mean + z * s.sd });
    }
    pts.push({ ageM, value });
    return pts;
  }

  function metricValue(metric, h, w, head, chest) {
    if (metric === 'height') return h;
    if (metric === 'weight') return w;
    if (metric === 'kaup') return (h && w) ? G.kaup(h, w) : null;
    if (metric === 'head') return head;
    return chest;
  }

  function compute() {
    const ageM = +$('#age').value;
    const h = val('#height'), w = val('#weight'), head = val('#head'), chest = val('#chest');
    if (h == null || w == null) return;

    const k = G.kaup(h, w);
    const kl = G.kaupLabel(k);
    const pH = G.percentile(state.sex, 'height', ageM, h);
    const pW = G.percentile(state.sex, 'weight', ageM, w);

    const meta = META[state.tab];
    const v = metricValue(state.tab, h, w, head, chest);

    if (v == null) {
      $('#pctHead').textContent = `${meta.label}が未入力です`;
      $('#pctValue').textContent = '–';
      $('#pctUnit').textContent = '';
      $('#pctBadge').textContent = `${meta.label}を入力すると表示されます`;
      $('#chart').innerHTML = '';
    } else if (state.tab === 'kaup') {
      $('#pctHead').textContent = 'カウプ指数';
      $('#pctValue').textContent = k.toFixed(1);
      $('#pctUnit').textContent = '';
      $('#pctBadge').textContent = kl.label;
      drawChart('kaup', ageM, k, meta);
    } else {
      const p = G.percentile(state.sex, state.tab, ageM, v);
      $('#pctHead').textContent = `${meta.label}のパーセンタイル`;
      $('#pctValue').textContent = p;
      $('#pctUnit').textContent = 'パーセンタイル';
      $('#pctBadge').textContent = G.pctBand(p).label;
      drawChart(state.tab, ageM, v, meta);
    }

    const bandTxt = (p) => G.pctBand(p).label.replace('です😊', '').replace('です', '');
    $('#sHeight').innerHTML = `${pH} <small>パーセンタイル(${bandTxt(pH)})</small>`;
    $('#sWeight').innerHTML = `${pW} <small>パーセンタイル(${bandTxt(pW)})</small>`;
    $('#sKaup').innerHTML = `${k.toFixed(1)} <small>(${kl.label})</small>`;
    $('#sHead').innerHTML = head != null
      ? `${G.percentile(state.sex, 'head', ageM, head)} <small>パーセンタイル</small>`
      : `– <small>未入力</small>`;
    $('#sChest').innerHTML = chest != null
      ? `${G.percentile(state.sex, 'chest', ageM, chest)} <small>パーセンタイル</small>`
      : `– <small>未入力</small>`;

    const ok = pH >= 10 && pH <= 90 && pW >= 10 && pW <= 90 && kl.tone === 'ok';
    const watch = pH < 3 || pH > 97 || pW < 3 || pW > 97;
    $('#advice').innerHTML = watch
      ? '<b>🩺 基準範囲の外の項目があります。</b><br>成長には個人差がありますが、一度小児科で相談すると安心です。本サービスは診断の代わりにはなりません。'
      : ok
      ? '<b>🌼 成長はおおむね順調です。</b><br>引き続きバランスの良い食事と生活リズムを大切にしましょう。'
      : '<b>🌱 やや低め/高めの項目があります。</b><br>一度の測定で判断せず、しばらく様子を見ましょう。気になるときは小児科へ。';

    $('#printDate').textContent = `計測日: ${new Date().toLocaleDateString('ja-JP')} / 年齢: ${$('#age').selectedOptions[0].textContent} / 性別: ${state.sex === 'boy' ? '男の子' : '女の子'}`;
  }

  function drawChart(metric, ageM, v, meta) {
    const compare = [];
    if (state.compare) {
      const cAge = +$('#cmpAge').value;
      const ch = val('#cmpHeight'), cw = val('#cmpWeight');
      const cv = metric === 'height' ? ch
        : metric === 'weight' ? cw
        : metric === 'kaup' ? (ch && cw ? G.kaup(ch, cw) : null)
        : null;
      if (cv != null) {
        compare.push({ name: 'きょうだい', color: '#F49E42', series: trackSeries(state.cmpSex, metric, cAge, cv) });
      }
      $('#cmpLegend').style.display = cv != null ? 'inline-flex' : 'none';
    } else {
      $('#cmpLegend').style.display = 'none';
    }
    renderGrowthChart($('#chart'), {
      sex: state.sex, metric, yLabel: meta.y,
      series: trackSeries(state.sex, metric, ageM, v),
      compare
    });
  }

  compute();
})();
