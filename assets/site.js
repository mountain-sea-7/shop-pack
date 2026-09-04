document.addEventListener('DOMContentLoaded', function () {
  // 内容包是全局体育钩子，不是当前商品的固定文案；统一按钮术语，避免和历史样本混淆。
  document.querySelectorAll('button[onclick*="copySportsPack"]').forEach(function (button) {
    button.textContent = '📋 复制体育钩子内容包';
  });
  document.querySelectorAll('#product-sections > .product-section').forEach(function (section) {
    var product = section.getAttribute('data-product');
    var groups = Array.prototype.slice.call(section.querySelectorAll('.audio-group'));
    var primaryByHook = {};
    // 同一商品下文案完全相同的音频，只展示第一条（采集顺序按赞数优先）；
    // 其余 ID 保留为备用，避免重复卡片占满列表，也方便后续换音频测试。
    groups.forEach(function (group) {
      if (group.hasAttribute('data-duplicate-of')) return;
      var hook = group.querySelector('.copy-area[data-hook="0"]');
      var hookKey = hook ? hook.textContent.replace(/\s+/g, ' ').trim() : '';
      if (!hookKey) return;
      if (primaryByHook[hookKey]) {
        group.setAttribute('data-duplicate-of', primaryByHook[hookKey]);
      } else {
        primaryByHook[hookKey] = group.getAttribute('data-music') || '';
      }
    });
    var visible = groups.filter(function (group) {
      return !group.hasAttribute('data-duplicate-of');
    }).length;
    var standby = groups.length - visible;
    // 没有可用音频、也不是动态工具页时，不占用导航位置；补充素材后会随页面源码自然恢复。
    if (visible === 0 && product !== 'p12' && product !== 'p13') {
      section.hidden = true;
      var emptyTab = document.querySelector('.product-tab[data-product="' + product + '"]');
      if (emptyTab) emptyTab.hidden = true;
      return;
    }
    var counter = document.querySelector('.product-tab[data-product="' + product + '"] .tab-cnt');
    if (!counter || !/^\d+$/.test(counter.textContent.trim())) return;
    counter.textContent = String(visible);
    var title = section.querySelector('.section-title');
    if (title) {
      title.textContent = title.textContent.replace(/（\d+个(?:，隐藏\d+条同内容备用ID)?）/, '（' + visible + '个' + (standby ? '，隐藏' + standby + '条同内容备用ID' : '') + '）');
    }
  });
});
function switchHook(btn, gid) {
  var group = btn.parentElement.parentElement;
  var tabs = group.querySelectorAll('.hook-tab');
  var idx = 0;
  for (var i=0;i<tabs.length;i++) { tabs[i].classList.remove('active'); if (tabs[i]===btn) idx=i; }
  btn.classList.add('active');
  var items = group.querySelectorAll('[data-hook]');
  for (var j=0;j<items.length;j++) {
    items[j].style.display = (parseInt(items[j].getAttribute('data-hook'))===idx)?'':'none';
  }
}
function copyText(id, btn) {
  var text = document.getElementById(id).innerText;
  var fn = navigator.clipboard ? function(){navigator.clipboard.writeText(text).then(function(){s(btn)}).catch(function(){f(text,btn)})} : function(){f(text,btn)};
  fn();
}
var sportsPackCache = null;
var sportsPackLoading = false;
var sportsPackFailed = false;
var hotSportsPackCache = null;
var hotSportsPackLoading = false;
var hotSportsPackFailed = false;
var SPORTS_COPY_HISTORY_KEY = 'xyshop_sports_copy_history_v2';
var FRESH_POOL_MAX_AGE_HOURS = 72;
function loadSportsPack() {
  if (sportsPackCache || sportsPackLoading) return;
  sportsPackLoading = true;
  fetch('sports_pack.json?t=' + Date.now()).then(function(r){
    if (!r.ok) throw new Error('sports_pack.json 加载失败');
    return r.json();
  }).then(function(data){
    sportsPackCache = data;
  }).catch(function(){
    sportsPackCache = null;
    sportsPackFailed = true;
  }).then(function(){
    sportsPackLoading = false;
  });
}
function loadHotSportsPack() {
  if (hotSportsPackCache || hotSportsPackLoading) return;
  hotSportsPackLoading = true;
  fetch('fresh_sports_pack.json?t=' + Date.now()).then(function(r){
    if (!r.ok) throw new Error('fresh_sports_pack.json 加载失败');
    return r.json();
  }).then(function(data){
    hotSportsPackCache = data && Array.isArray(data.items) ? data : null;
    hotSportsPackFailed = !hotSportsPackCache;
  }).catch(function(){
    hotSportsPackCache = null;
    hotSportsPackFailed = true;
  }).then(function(){
    hotSportsPackLoading = false;
  });
}
// 提前加载内容包，保证实际复制仍发生在用户点击的同步调用栈内。
loadSportsPack();
loadHotSportsPack();
function sportsLikeValue(value) {
  var match = String(value || '').replace(/,/g, '').match(/([\d.]+)\s*(万)?/);
  return match ? Number(match[1]) * (match[2] ? 10000 : 1) : 0;
}
function relativeAgeHours(value) {
  var text = String(value || '').trim();
  if (text === '刚刚') return 0;
  var hour = text.match(/^(\d+)\s*小时前$/);
  if (hour) return Number(hour[1]);
  var day = text.match(/^(\d+)\s*天前$/);
  if (day) return Number(day[1]) * 24;
  return null;
}
function hotPackAgeHours(pack) {
  var stamp = pack && pack.updated ? Date.parse(pack.updated) : NaN;
  return Number.isFinite(stamp) ? (Date.now() - stamp) / 3600000 : Infinity;
}
function textKey(text) {
  var value = String(text || '').replace(/\s+/g, ' ').trim();
  var hash = 0;
  for (var i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return String(hash);
}
function getTodayCopyHistory() {
  var today = new Date().toISOString().slice(0, 10);
  try {
    var stored = JSON.parse(localStorage.getItem(SPORTS_COPY_HISTORY_KEY) || '{}');
    return stored && stored.date === today && Array.isArray(stored.used) ? stored : { date: today, used: [] };
  } catch (error) {
    return { date: today, used: [] };
  }
}
function saveTodayCopyHistory(history) {
  try { localStorage.setItem(SPORTS_COPY_HISTORY_KEY, JSON.stringify(history)); } catch (error) {}
}
function weightedPick(items) {
  var total = 0;
  var weights = items.map(function(item) {
    // 保留随机性，但让高赞内容获得更高出现概率，避免低赞条目与爆款等权。
    var weight = Math.pow(Math.max(1, sportsLikeValue(item.likes)), 0.35);
    total += weight;
    return weight;
  });
  var cursor = Math.random() * total;
  for (var i = 0; i < items.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return items[i];
  }
  return items[items.length - 1];
}
function makeCandidates(items, source) {
  return (items || []).filter(function(item) { return item && item.text; }).map(function(item) {
    return {
      id: source + ':' + (item.video_id || item.aweme_id || textKey(item.text)),
      source: source,
      text: item.text,
      likes: item.likes || '',
      time: item.time || '',
      sport: item.sport || ''
    };
  });
}
function evergreenCandidates(pack) {
  if (!pack || !Array.isArray(pack.items) || pack.pool_type !== 'legacy_event_caption') return [];
  return makeCandidates(pack.items.filter(function(item) {
    return item && item.type === 'legacy_event_caption';
  }), '历史爆款');
}
function copySportsPack(btn) {
  if (!sportsPackCache && !sportsPackFailed) loadSportsPack();
  if (!hotSportsPackCache && !hotSportsPackFailed) loadHotSportsPack();
  if (sportsPackLoading || hotSportsPackLoading) {
    s(btn, '内容池加载中，请稍后');
    return;
  }
  var evergreen = evergreenCandidates(sportsPackCache);
  var fresh = [];
  if (hotSportsPackCache && Array.isArray(hotSportsPackCache.items) && hotPackAgeHours(hotSportsPackCache) <= FRESH_POOL_MAX_AGE_HOURS) {
    fresh = makeCandidates(hotSportsPackCache.items.filter(function(item) {
      var age = relativeAgeHours(item.time);
      return age !== null && age <= FRESH_POOL_MAX_AGE_HOURS;
    }), '新鲜体育');
  }
  var pool = fresh.length ? fresh : evergreen;
  if (!pool.length) pool = fresh;
  if (!pool.length) {
    s(btn, '暂无可用内容包');
    return;
  }
  var history = getTodayCopyHistory();
  var unused = pool.filter(function(item) { return history.used.indexOf(item.id) === -1; });
  var selected = weightedPick(unused.length ? unused : pool);
  history.used.push(selected.id);
  // 只保存今天的去重记录，且限制大小，避免 localStorage 无限制增长。
  history.used = history.used.slice(-200);
  saveTodayCopyHistory(history);
  copyAny(selected.text, btn, '✅ ' + selected.source + (selected.likes ? '·' + selected.likes + '赞' : ''));
}
function copyAny(text, btn, successMessage) {
  var done = function(){ s(btn, successMessage); };
  // 1. 现代 clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      navigator.clipboard.writeText(text).then(done).catch(function(){
        // 2. execCommand 兜底
        legacyCopy(text) ? done() : s(btn, '复制失败');
      });
      return;
    } catch(e) {}
  }
  // 2. execCommand 兜底
  legacyCopy(text) ? done() : s(btn, '复制失败');
}
function legacyCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch(e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function copyTextByName(text, btn) {
  var fn = navigator.clipboard ? function(){navigator.clipboard.writeText(text).then(function(){s(btn)}).catch(function(){f(text,btn)})} : function(){f(text,btn)};
  fn();
}
function f(text,btn){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');s(btn)}catch(e){}document.body.removeChild(ta)}
function s(btn,msg){var o=btn.innerText;btn.innerText=msg || '✅ 已复制！';btn.classList.add('copied');setTimeout(function(){btn.innerText=o;btn.classList.remove('copied')},1500)}
function switchProduct(btn) {
  var pid = btn.getAttribute('data-product');
  var tabs = document.querySelectorAll('.product-tab');
  for (var i=0;i<tabs.length;i++) tabs[i].classList.remove('active');
  btn.classList.add('active');
  var secs = document.querySelectorAll('.product-section');
  for (var j=0;j<secs.length;j++) {
    secs[j].style.display = secs[j].getAttribute('data-product')===pid ? '' : 'none';
  }
}
window.onload = function() {
  var first = document.querySelector('.product-tab.active');
  if (first) switchProduct(first);
  loadAudioConfig();
  loadOcrConfig();
};
// 后台可改音频: 读取同目录 audio_config.json 动态更新拍同款按钮
function loadAudioConfig() {
  fetch('audio_config.json').then(function(r){return r.json()}).then(function(cfg){
    var btns = document.querySelectorAll('.beat-btn[data-aweme]');
    for (var i=0;i<btns.length;i++) {
      var mid = cfg[btns[i].getAttribute('data-aweme')];
      if (mid) btns[i].href = 'https://www.douyin.com/music/' + mid;
    }
  }).catch(function(){});
}
// 后台可改画面字: 读取同目录 ocr_config.json, 覆盖默认画面字
function loadOcrConfig() {
  fetch('ocr_config.json').then(function(r){
    if (!r.ok) throw new Error('ocr_config.json HTTP ' + r.status);
    return r.json();
  }).then(function(cfg){
    var els = document.querySelectorAll('.hook-text[data-aweme]');
    for (var i=0;i<els.length;i++) {
      var ov = cfg[els[i].getAttribute('data-aweme')];
      if (ov) els[i].innerText = ov;
    }
    var vids = document.querySelectorAll('.copy-area[data-ocr]');
    for (var j=0;j<vids.length;j++) {
      var ov2 = cfg[vids[j].getAttribute('data-ocr')];
      if (ov2) vids[j].innerText = ov2;
    }
  }).catch(function(error){
    console.warn('画面字配置未加载，继续使用页面默认文案：' + error.message);
  });
}

// === 已发标记功能（localStorage 本机独立） ===
(function() {
  var KEY = 'xyshop_used_items_v1';
  var used = {};
  try { used = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { used = {}; }
  window.__used = used;

  function saveUsed() {
    try { localStorage.setItem(KEY, JSON.stringify(used)); } catch(e) {}
    applyFilter();
  }

  function getItemId(el) {
    // audio-group: data-music；video-card: data-ocr；account-card: 昵称
    if (el.classList.contains('audio-group')) return 'a:' + (el.getAttribute('data-music') || '');
    var ocr = el.querySelector('[data-ocr]');
    if (el.classList.contains('video-card') && ocr) return 'v:' + ocr.getAttribute('data-ocr');
    if (el.classList.contains('account-card')) {
      var nick = el.querySelector('.acc-nick');
      return 'acct:' + (nick ? nick.innerText.trim().slice(0, 30) : '');
    }
    return '';
  }

  window.toggleUsedFilter = function() {
    var btn = document.getElementById('filterBtn');
    var onlyUnused = btn.classList.toggle('off');
    btn.innerText = onlyUnused ? '显示全部' : '只看未发';
    applyFilter();
  };

  function applyFilter() {
    var btn = document.getElementById('filterBtn');
    if (!btn) return;
    var onlyUnused = btn.classList.contains('off');
    var items = document.querySelectorAll('.audio-group, .video-card, .account-card');
    items.forEach(function(el) {
      var id = getItemId(el);
      if (!id) return;
      var isUsed = !!window.__used[id];
      el.classList.toggle('used', isUsed);
      var markBtn = el.querySelector('.mark-used-btn');
      if (markBtn) markBtn.innerText = isUsed ? '↩️ 撤销已发' : '✅ 标记已发';
      if (onlyUnused && isUsed) el.style.display = 'none';
      else el.style.display = '';
    });
    // 更新统计
    var n = Object.keys(window.__used).length;
    var cnt = document.getElementById('usedCount');
    if (cnt) cnt.innerText = n;
  }

  window.markUsed = function(btn) {
    var card = btn.closest('.audio-group, .video-card, .account-card');
    if (!card) return;
    var id = getItemId(card);
    if (!id) return;
    if (window.__used[id]) {
      delete window.__used[id];
      btn.innerText = '✅ 标记已发';
    } else {
      window.__used[id] = Date.now();
      btn.innerText = '↩️ 撤销已发';
    }
    saveUsed();
  };

  window.resetUsed = function() {
    if (!confirm('确定重置全部已发记录？本机所有标记将清空。')) return;
    used = {};
    window.__used = used;
    saveUsed();
  };

  function injectButtons() {
    // 给每个素材卡加"标记已发"按钮（如果没有）
    var items = document.querySelectorAll('.audio-group, .video-card, .account-card');
    items.forEach(function(el) {
      if (el.querySelector('.mark-used-btn')) return;
      var b = document.createElement('button');
      b.className = 'mark-used-btn';
      b.type = 'button';
      b.innerText = '✅ 标记已发';
      b.onclick = function() { window.markUsed(b); };
      el.appendChild(b);
    });
  }

  window.addEventListener('load', function() {
    injectButtons();
    applyFilter();
  });
})();

(function () {
  const NA_KEY = 'xyshop_newacc_v1';
  let naPool = [];

  function getUsed() {
    try {
      const used = JSON.parse(localStorage.getItem(NA_KEY) || '{}');
      return used && typeof used === 'object' && !Array.isArray(used) ? used : {};
    } catch (e) {
      return {};
    }
  }

  function saveUsed(used) {
    try {
      localStorage.setItem(NA_KEY, JSON.stringify(used));
    } catch (e) {}
  }

  function escapeNaHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function safeNaCardId(value) {
    const id = String(value == null ? '' : value);
    return /^\d{5,}$/.test(id) ? id : '';
  }

  function safeNaMusicUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' && url.hostname === 'www.douyin.com' ? url.href : '#';
    } catch (e) {
      return '#';
    }
  }

  function getVerifiedPool() {
    const vp = naPool.filter(function (item) { return item.boss_verified || item.friend_verified; });
    return vp.length ? vp : naPool; // 无实测爆过标记时兑底用全池，避免功能失效
  }

  function updateStatus() {
    const used = getUsed();
    const vp = getVerifiedPool();
    const usedCount = vp.reduce(function (count, item) {
      return count + (used[String(item.id)] ? 1 : 0);
    }, 0);
    const remaining = Math.max(0, vp.length - usedCount);
    document.getElementById('naCnt').textContent = String(remaining);
    document.getElementById('naStatus').textContent = '剩余 ' + remaining + ' 条';
    return remaining;
  }

  function pickTwo() {
    const used = getUsed();
    const vp = getVerifiedPool();
    const available = vp.filter(function (item) {
      return !used[String(item.id)];
    });
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = available[i];
      available[i] = available[j];
      available[j] = temp;
    }
    return available.slice(0, 2);
  }

  function renderCards(items) {
    const cards = document.getElementById('naCards');
    cards.innerHTML = items.map(function (item) {
      const id = safeNaCardId(item.id);
      if (!id) return '';
      const product = escapeNaHtml(item.product);
      const hook = escapeNaHtml(item.hook);
      const musicUrl = escapeNaHtml(safeNaMusicUrl(item.music_url));
      return '<div class="card" data-na-id="' + id + '" style="margin:12px 0;">' +
        '<div class="card-label">📦 商品：' + product + ' ｜ 音频ID：' + id + '</div>' +
        '<div class="card-label" style="margin-top:8px;">✍️ 钩子（照抄）</div>' +
        '<div class="copy-area" id="na-hook-' + id + '">' + hook + '</div>' +
        '' +
        '<a class="beat-btn" href="' + musicUrl + '" target="_blank" rel="noopener" style="margin-top:8px;">🎬 拍同款（' + product + '）→</a>' +
        '<button type="button" class="copy-btn" style="display:block;margin-top:8px;" onclick="copySportsPack(this)">📋 复制体育钩子内容包</button>' +
        '<button type="button" class="mark-used-btn" onclick="markNaUsed(\'' + id + '\', this)" style="display:block;margin-top:8px;">✅ 用掉了（本机不再推）</button>' +
        '</div>';
    }).join('');
    document.getElementById('naEmpty').style.display = items.length ? 'none' : 'block';
    document.getElementById('naNext').style.display = items.length || !updateStatus() ? 'none' : 'inline-block';
    updateStatus();
  }

  window.resetNaPool = function () {
    if (!confirm('确定重置新号池？本机已用的音频记录将全部清空，所有爆款音频可重新抽取。')) return;
    localStorage.removeItem(NA_KEY);
    document.getElementById('naNext').style.display = 'none';
    document.getElementById('naEmpty').style.display = 'none';
    renderCards(pickTwo());
  };

  window.markNaUsed = function (id, btn) {
    const used = getUsed();
    used[String(id)] = true;
    saveUsed(used);
    const card = btn.closest('.card');
    if (card) card.remove();
    const remaining = updateStatus();
    if (!document.querySelector('#naCards .card')) {
      document.getElementById('naEmpty').style.display = 'block';
      document.getElementById('naNext').style.display = remaining ? 'inline-block' : 'none';
    }
  };

  function loadPool() {
    return fetch('newacc_pool.json')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (pool) {
        naPool = Array.isArray(pool) ? pool : [];
        return naPool;
      })
      .catch(function () {
        document.getElementById('naStatus').textContent = '池子加载失败';
        return null;
      });
  }

  document.getElementById('naNext').addEventListener('click', function () {
    document.getElementById('naNext').style.display = 'none';
    document.getElementById('naEmpty').style.display = 'none';
    renderCards(pickTwo());
  });

  loadPool().then(function (pool) {
    if (pool) renderCards(pickTwo());
  });
})();

(function(){
  'use strict';
  const API_KEY="", API_URL='https://api.siliconflow.cn/v1/chat/completions', MODEL='deepseek-ai/DeepSeek-V3';  // KEY REMOVED 2026-09-03 security: public page must not embed paid API key
  const PRODUCT_GUIDES={"xingrenfen":{"name":"杏仁粉（纯杏仁）","eat":"温水冲一勺，早上空腹或早餐后喝，一天一次就行","suitable":"大便偏干、容易便秘、皮肤干、总干咳、想润肺的人","not_suitable":"正在拉肚子的人别吃（通便类会加重）；杏仁过敏的别碰；孕妇和3岁以下小孩不建议","note":"3岁以上小孩想喝，一次半勺少量试，观察大便情况"},"xingren_qibaiyin":{"name":"杏仁七白饮","eat":"开水或温水冲泡一包，当饮品喝，一天一到两杯","suitable":"想养肺润肤、脸色暗黄、皮肤干燥、爱美的女性；秋燥季节想润肺的人","not_suitable":"正在拉肚子的人别喝（润肠会加重）；杏仁过敏的别碰；孕妇和3岁以下小孩不建议","note":"七白饮偏滋润，脾胃虚寒容易拉肚子的人别天天喝；美白是慢功夫，坚持两三周看变化"},"wuzhimao":{"name":"五指毛桃茯苓糕","eat":"当小点心吃，一次一两块，一天两次","suitable":"舌苔厚、大便粘、容易累、虚胖、湿气重的人","not_suitable":"本身就严重腹泻的人先别吃；对豆类过敏的注意","note":"小孩可以少量吃，一次半块就行"},"danggui_heidou":{"name":"当归黑豆","eat":"当零食嚼，一次一小把，一天一次","suitable":"脸黄、气色差、头晕、月经量少、头发早白、手脚凉的血亏人群","not_suitable":"孕妇不能吃（当归活血）；月经量大、经期的人别吃；感冒发烧、嗓子疼的时候停","note":"小孩不需要吃这个，青少年以上再说"},"suanzaoren":{"name":"酸枣仁粉","eat":"睡前温水冲一勺，一天一次","suitable":"入睡难、半夜总醒、多梦、睡眠浅的人","not_suitable":"白天吃了犯困就别白天吃；孕妇慎用；小孩不建议","note":"搭配泡脚放松效果更好，别指望一口见效，坚持一两周"},"rougui":{"name":"肉桂粉","eat":"温水或蜂蜜水冲一小勺，一天一次","suitable":"手脚冰凉、怕冷、上热下寒、阳虚体寒的人","not_suitable":"孕妇不能吃（温燥活血）；小孩不建议（纯阳之体不受补）；正在上火、口腔溃疡、嗓子疼的别吃；阴虚火旺的别碰","note":"肉桂性热，一次别多，小半勺到一勺就够"},"jineijin":{"name":"鸡内金","eat":"温水冲服或拌粥里，一次一小勺，一天一次","suitable":"有结石、脾胃弱、积食、没胃口、胀气的人","not_suitable":"孕妇慎用；本身胃溃疡出血的别吃","note":"小孩积食可以少量吃，一次半勺，配老陈醋口感好"},"shihu_niubangcha":{"name":"石斛牛蒡茶","eat":"开水泡一包，当茶喝，一天一到两杯","suitable":"眼睛干涩、迎风流泪、熬夜多、肝血不足的人","not_suitable":"脾胃虚寒、一吃凉的就拉肚子的人少喝；孕妇慎用；小孩不需要","note":"泡的时候用开水闷几分钟，别当饭前空腹猛灌"},"sibaofen":{"name":"四宝粉","eat":"温水冲一小勺，一天一次，饭后吃","suitable":"血管堵、血脂高、血瘀、这里痛那里酸、上了年纪的人","not_suitable":"孕妇绝对不能吃（三七丹参活血）；月经量大、经期的人别吃；有出血倾向、刚手术完的别吃；低血压的慎用；小孩不用吃","note":"里面有西洋参，感冒发热的时候停一停"},"jiangzaocha":{"name":"姜枣茶","eat":"早上煮开泡一杯，上午喝，一天一杯","suitable":"怕冷、手脚凉、胃寒、夏天贪凉、大便不成形的人","not_suitable":"正在上火、口腔溃疡、嗓子痛的别喝；阴虚内热的人少喝","note":"小孩可以少量喝，半杯就行；下午晚上别喝，容易睡不着"},"wumei_pugongying":{"name":"乌梅蒲公英根茶","eat":"取蒲公英根、乌梅、山楂、红枣、重瓣玫瑰煮水喝，一天一杯，饭后温饮","suitable":"有结节（肺结节、乳腺结节、甲状腺结节）、肝气郁结、爱生气、痰多、喉咙有异物感的人","not_suitable":"孕妇慎用（蒲公英偏凉）；脾胃虚寒、容易拉肚子的人少喝；经期量大的别喝；正在感冒发热的停一停","note":"乌梅偏酸，胃酸多、反酸的人别空腹喝；调理是慢功夫，别指望一两天"}};
  const SYMPTOM_PRODUCT_MAP={
    xingrenfen:['便秘','拉不出','大便干','大便难','肺','咳嗽','咳','痰','气管','鼻','大便','拉屎','排便'],
    xingren_qibaiyin:['七白','养肺','润肺','美白','变白','皮肤','肤色','脸色','暗黄','黄气','气色','干燥','津液','秋燥','润肤','细腻','斑','女生','女性','胶原','白色食物','肺主皮毛'],
    wuzhimao:['湿气','舌苔','大便粘','齿痕','虚胖','水肿','浮肿','出油','长痘','痘痘','脾虚','祛湿','黏','粘马桶','困重','没精神','头昏沉'],
    danggui_heidou:['气血','血虚','贫血','脸黄','面色','苍白','头晕','头发','脱发','白发','早白','月经','经量','量少','血块','补血','手脚冰凉','气色','暗沉','黑眼圈','指甲','唇色'],
    suanzaoren:['失眠','睡不着','多梦','半夜醒','早醒','睡不好','安神','心火','睡眠','入睡','难睡','惊醒','睡眠浅','心悸','心慌'],
    rougui:['手脚冰凉','怕冷','畏寒','体寒','宫寒','上热下寒','阳虚','炎症','寒','引火归元','痛经','冻','冰','凉手','凉脚','膝盖凉'],
    jineijin:['结石','胆结石','肾结石','尿结石','脾胃','胃胀','积食','消化不良','没胃口','反酸','烧心','胀气','打嗝','食积','健脾','消食','胃'],
    shihu_niubangcha:['眼睛','眼干','眼涩','迎风流泪','视力','视物','肝','养肝','肝血','肝火','眼屎','红血丝','明目','熬夜'],
    sibaofen:['血管','血瘀','血栓','堵','痛','通则不痛','三高','血压','血脂','血糖','心梗','脑梗','中风','瘀','酸痛','腰酸','腿麻','手麻','血脂稠','血液'],
    jiangzaocha:['姜枣','温中','脾胃寒','寒湿','大便粘','空调','贪凉','冰饮','冷饮','胃寒','夏天','驱寒','暖胃'],
    wumei_pugongying:['结节','乳腺结节','肺结节','甲状腺结节','淋巴','瘰疬','瘿','痰核','硬块','增生','囊肿','肌瘤','散结','软坚','肝气郁结','气滞','郁结','爱生气','生气','乳腺','甲状腺','乌梅','蒲公英','喉咙异物感','梅核气']
  };
  const PRODUCT_PRIORITY=['xingrenfen','xingren_qibaiyin','suanzaoren','wuzhimao','danggui_heidou','rougui','jineijin','shihu_niubangcha','sibaofen','jiangzaocha','wumei_pugongying'];
  const PRODUCT_CONTRAINDICATIONS={xingrenfen:['拉肚子','腹泻','杏仁过敏','孕妇','怀孕','3岁以下'],xingren_qibaiyin:['拉肚子','腹泻','杏仁过敏','孕妇','怀孕','3岁以下','脾胃虚寒'],wuzhimao:['严重腹泻','豆类过敏'],danggui_heidou:['孕妇','怀孕','月经量大','经期','感冒','发烧','咽痛','嗓子疼'],suanzaoren:['孕妇','怀孕','小孩','宝宝','孩子'],rougui:['孕妇','怀孕','小孩','宝宝','孩子','上火','口腔溃疡','咽痛','嗓子疼','阴虚'],jineijin:['孕妇','怀孕','胃溃疡','出血'],shihu_niubangcha:['脾胃虚寒','拉肚子','腹泻','孕妇','怀孕','小孩','宝宝','孩子'],sibaofen:['孕妇','怀孕','月经量大','经期','出血','手术','低血压','小孩','宝宝','孩子','感冒','发热'],jiangzaocha:['上火','口腔溃疡','咽痛','嗓子疼','阴虚'],wumei_pugongying:['孕妇','怀孕','脾胃虚寒','拉肚子','腹泻','经期量大','感冒','发热','胃酸','反酸']};
  const URGENT_WORDS=['胸痛','胸闷喘不过气','呼吸困难','昏迷','晕厥','意识不清','大出血','呕血','便血','突发偏瘫','口角歪斜'];
  const HARD_BLOCK=['治愈','根治','治疗','特效','药到病除','包治','包好','百分百','100%','癌症','肿瘤','癌','化疗','放疗','糖尿病','高血压','冠心病','尿毒症','肾衰竭','白血病','血癌','艾滋病','绝症','仙丹','神药','妙手回春','死人','死亡','救命','救心','立竿见影','奇效','神效','保证','三天就好','几天就好','马上见效','立刻见效','永不复发','断根','除根','吃好','治好','痊愈','包好','无效退款','彻底消除','完全消失','神速'];
  const ECOMM_WORDS=['买','下单','购买','商品','链接','优惠','价格','多少钱','店铺','购物','秒杀','包邮','促销','带货','小黄车','拍下','付款','交易','订单','快递','发货','卖','客服','红包','橱窗'];
  const FORMULA_PAT=/[\d一二三四五六七八九十两]+[克钱两gG]|汤|丸|散剂|膏方|丹方|方子|煎服|水煎服|内服|处方|开方|麻黄|附子|大黄|芒硝|石膏|细辛|半夏|柴胡|朱砂|雄黄|硫磺|铅丹|轻粉|斑蝥|水蛭|虻虫|土鳖|蜈蚣|全蝎|僵蚕|蝉蜕|蛤蚧|麝香|牛黄|熊胆|虎骨|羚羊角/;
  const QUITUI_TEMPLATE='你这个情况，这个就先不要买/不要碰了。';
  const GUIDE_TEMPLATES=['感兴趣的朋友点我主页，简介里有介绍~','喜欢的话点进我主页，简介里能看到~'];
  const DISCLAIMER_TEMPLATES=['如有具体问题，还是结合医院的检查结果为准。','具体到个人情况，建议以医院检查结果为准。','个人体质不同，如症状持续，建议以医院检查结果为准。'];
  const SYSTEM_PROMPT="你是倪海厦风格的温和派中医养生博主，帮老板用亲切的口吻回答抖音评论区粉丝的养生健康问题，结尾带一句软性橱窗引导。\n\n【口吻要点】（倪师弟子/温和博主，不是倪师本尊！）\n- 语气亲切平和，像懂中医的邻家博主聊天，不拍桌子、不瞪眼、不凶人不教育人\n- 家常口语：\"对不？\"\"记住\"\"其实\"\"可以试试\"\n- 匹配到商品时：总共2-3句话，40-80字，短小精悍（评论区围观场景，短才有人看完）；全局模式（未匹配商品）时：总共4-5句话，150-250字，详细完整\n\n【开头多样化铁律】（防同质化！评论区一排回复不能全是\"倪师常说\"开头）\n开头句在下面几种里轮换，同一批回复不要重复用同一种：\n1. 直接摆中医原理型：如\"肺与大肠相表里，肺干了肠道也跟着干。\"（不说倪师，直接讲理）\n2. 古籍/内经引用型：如\"黄帝内经讲，脾为后天之本。\"（引书不引倪师）\n3. 倪师引用型：如\"倪师讲过，肝气郁结是结节的根。\"（只能占一部分，不要每次都用）\n4. 反问/共鸣型：如\"你是不是也总觉得身体发沉、睡不醒？\"\n5. 结论先行型：如\"结节这东西，中医看的不是切不切，是看为什么长。\"\n原则：每句开头尽量不同，专业感优先，倪师引用最多三分之一。\n\n【回答结构】（匹配到商品→总40-80字，主体1-2句+软引导，短小精悍；全局模式→总150-250字，主体3-4句+具体解决方法，不加引导）\n1. 第一句：按【开头多样化铁律】选一种开头，观点+一个具体知识点一气呵成（可以是中医理论/古籍/倪师引用，如\"黄帝内经讲肺与大肠相表里\"\"中医讲肝主疏泄，气顺了结才散\"）。第一句不要用\"但/不过/其实\"开头\n2. 第二句：直接回答他问的点——问怎么吃→给吃法；问能不能吃→\"能吃/不要吃\"直接表态+原因；**问\"有用吗/管用吗/真的吗\"→第一句就要明确表态（\"有调理作用，贵在坚持\"），再给具体方向**；问症状→给具体调理方向；不适合的人（孕妇/小孩/上火/拉肚子）直接劝退。匹配到商品时：主体最多2句，说完就上引导，别拖沓；全局模式时：主体3-4句，每句一个具体方法+理论依据\n3. 倒数第二句（仅匹配到商品时）：软引导——\"感兴趣的朋友点我主页，简介里有介绍~\"（一句话同时带主页+简介，绝对不提\"橱窗/下单/买\"）\n4. 责任声明——不用自己写，系统会自动在末尾附加\"以医院检查结果为准\"的声明（见【责任声明铁律】），避免重复。\n【引导规则】只有匹配到商品时才允许出现引导句，且只能出现一次、放在回复末尾；全局模式（未匹配到商品）绝对禁止任何引导，不提主页/简介/橱窗/商品，纯中医知识回答，能帮到人就好。责任声明由系统自动附加，不用自己写。\n\n【知识引用铁律】必须真的引用知识片段或产品话术里的具体内容（如\"肺与大肠相表里\"\"酸枣仁养心肝之血、安神\"\"肉桂温肾阳引火归元\"\"脾主运化\"），不要编造术语，不要用泛泛的健康建议凑数。至少保证回复里有一个具体的中医概念。\n【引用真实性铁律】凡是说\"倪师讲/倪师说/按倪师的说法/老师讲过\"的，具体内容必须能在【倪师知识库原文片段】里找到对应依据（如瘰疬、软坚、甲状腺大脖子用海藻牡蛎、肝气郁结用郁金疏肝、乌梅丸酸收等）；【知识库没有支撑的内容一律不许挂倪师名义】。即使开头没用倪师引用，正文也可以引用知识库原理，但同样必须真实。\n\n【异议/质疑回应规则】（评论区有人提不同见解、质疑、甚至抬杠时）\n- 先接住再讲理：不要怼人，先认可对方感受（\"你这么说我也理解\"\"确实很多人这么想\"），再温和地按中医思路讲\n- 用原理说话：讲清楚中医看这个问题的逻辑（如\"中医不只看那个疙瘩，看的是气顺不顺、痰化不化\"），用知识库里的真实理论回应\n- 不贬低西医：可以说\"西医有西医的治法，中医有中医的思路，各有各的适用\"，绝不贬低医院医生\n- 不绝对化：对方说\"西医检查没事\"，回\"检查没问题是好事，中医调理讲究的是日常的平衡\"，不反驳、不制造焦虑\n- 只讲调理方向，不跟对方争对错\n\n【劝退规则】用户是在当前产品（【产品说明】第一个）的视频底下提问的。如果用户的症状/体质不适合这个产品（如：拉肚子的人问杏仁粉、上火/口腔溃疡的人问肉桂、孕妇问四宝粉、小孩问肉桂），必须用一句话明确劝退：\"你这个情况，这个就先不要买/不要碰了\"，然后再给一句适合他体质的调理建议（如拉肚子先健脾止泻、饮食清淡）。这是对用户负责，必须直说，别为了卖货含糊。\n\n【全局模式】（当用户问题与任何商品都无关时，如问子宫脱垂、腰疼、脱发等本店没有对应产品的问题）\n- 不要因为匹配不到商品就不回答或硬往商品上靠。只要用户问了，就用中医知识好好回答\n- 知识优先级：优先引用【倪师知识库原文片段】里的倪海厦知识；知识库没有相关内容时，再用中医共识理论（脾主升清、肾主封藏、气血津液、湿寒热虚实等）给调理方向\n- 回答要具体、可操作：给出实际的调理方法（如食疗吃什么、穴位按哪里、动作怎么做、起居怎么调），不要只讲空洞的道理；每个方法尽量带上中医理论依据（如\"脾主升清，中气下陷\"）\n- 绝对禁止任何推销和引导：不提\"我们家的产品/可以试试我们家/橱窗里有\"，也不提主页/简介，纯知识回答，能帮到人就好\n- 给日常调理方向：饮食、作息、情绪、穴位、运动等温和建议\n\n【责任声明铁律】你不需要在回复里写责任声明，系统会自动在末尾附加\"以医院检查结果为准\"的声明。你只需要把中医知识回答好，不要自己加\"如有具体问题/以医院检查为准\"之类的话，避免重复。\n\n【格式铁律】禁止括号！禁止\"（笑）（拍桌）（叹气）\"等任何括号注释和动作描写，禁止【】等符号标记，全部用纯文字表达。\n\n【铁律】\n- 全程禁止：买、下单、购买、商品、链接、优惠、多少钱、店铺、购物、卖、小黄车、带货、拍下、付款\n- 回答吃法必须严格按【产品说明】里的吃法，禁止自己发明（禁止提咖啡）\n- 不出现具体药方、剂量（克/两/汤/丸）和\"治疗/治愈/根治/特效/百分百/保证\"等医疗宣称词\n- **绝对禁止夸大宣传**：不承诺疗效（不说\"三天就好\"\"保证消掉\"\"吃了就断根\"），不制造恐慌（不说\"再不调就晚了\"\"会癌变\"），不贬低医院医生，不诱导盲目购买。只能说\"调理/辅助/日常养护\"方向的温和表述\n- 口语化、短句，像真人博主回复，不像广告文案";
  let kb={}, lastReply='';

  const LLM_ENABLED = Boolean(API_KEY);
  function setStatus(msg){document.getElementById('p13Status').textContent=msg;}
  if (!LLM_ENABLED) {
    const generateButton = document.getElementById('p13Generate');
    generateButton.disabled = true;
    generateButton.title = '公网版不会保存或使用 API Key；请使用本地版 comment_tool。';
  }
  async function loadKB(){try{const r=await fetch('nishi_kb.json',{cache:'no-cache'});if(!r.ok)throw new Error();kb=await r.json();setStatus(LLM_ENABLED?'知识库已加载':'知识库已加载；公网版已关闭 AI 生成，请使用本地版 comment_tool');}catch(e){kb={};setStatus(LLM_ENABLED?'知识库加载失败，但仍可生成':'知识库加载失败；公网版已关闭 AI 生成');}}
  function matchProducts(q,forceId){
    if(forceId&&PRODUCT_GUIDES[forceId])return [{id:forceId,name:PRODUCT_GUIDES[forceId].name,hit:['当前视频产品'],guide:PRODUCT_GUIDES[forceId]}];
    return Object.keys(SYMPTOM_PRODUCT_MAP).map(function(id){return {id:id,hit:SYMPTOM_PRODUCT_MAP[id].filter(function(w){return q.indexOf(w)!==-1;})};})
      .filter(function(x){return x.hit.length;}).sort(function(a,b){return PRODUCT_PRIORITY.indexOf(a.id)-PRODUCT_PRIORITY.indexOf(b.id);}).slice(0,2)
      .map(function(x){return {id:x.id,name:PRODUCT_GUIDES[x.id].name,hit:x.hit,guide:PRODUCT_GUIDES[x.id]};});
  }
  function searchKB(q,productIds){
    const searchIds=(productIds&&productIds.length)?productIds:Object.keys(kb||{});
    const symptomWords=[];searchIds.forEach(function(id){(SYMPTOM_PRODUCT_MAP[id]||[]).forEach(function(w){if(q.indexOf(w)!==-1&&symptomWords.indexOf(w)<0)symptomWords.push(w);});});
    const fragments=(q.match(/[\u4e00-\u9fff]{2,}/g)||[]).reduce(function(a,s){for(let n=2;n<=Math.min(6,s.length);n++){for(let i=0;i+n<=s.length;i++){const x=s.slice(i,i+n);if(a.indexOf(x)<0)a.push(x);}}return a;},[]);
    const terms=symptomWords.concat(fragments.filter(function(x){return symptomWords.indexOf(x)<0;}));
    let rows=[];searchIds.forEach(function(id){(kb[id]||[]).forEach(function(row){let score=Number(row.score)||0;let hit=[];terms.forEach(function(t){let pos=0,count=0;while((pos=row.text.indexOf(t,pos))!==-1){count++;pos+=t.length;}if(count){score+=count*(symptomWords.indexOf(t)>=0?5:1)+Math.min(t.length,5);hit.push(t);}});if(score>0)rows.push({text:row.text,file:row.file||'',score:score,hit:hit});});});
    return rows.sort(function(a,b){return b.score-a.score;}).slice(0,3);
  }
  function buildPrompt(q,matched,kbParas,quitui){
    let user='【粉丝评论】'+q+'\n';
    if(matched.length){user+='【产品说明】（用户问到这个产品时，以此为准回答吃法和适宜性）\n'+matched.map(function(p){const g=p.guide||{};return '- 产品：'+p.name+'（用户问题涉及）\n  吃法：'+(g.eat||'')+'\n  适宜：'+(g.suitable||'')+'\n  禁忌：'+(g.not_suitable||'')+'\n  注意：'+(g.note||'');}).join('\n')+'\n';}else{user+='【全局模式】该问题未匹配到本店具体商品，请按【全局模式】规则用中医知识回答，禁止推销任何商品。\n';}
    if(kbParas.length)user+='【倪师知识库原文片段】\n'+kbParas.slice(0,3).map(function(r,i){return '〔片段'+(i+1)+'〕'+r.text.slice(0,300);}).join('\n')+'\n';
    if(quitui)user+='【强制指令】检测到该用户的症状与当前产品禁忌冲突！第一句必须明确劝退（如：你这个情况，这个就先不要买/不要碰了），然后给一句适合他体质的调理建议；绝对禁止给出该产品的吃法和任何推荐。\n';
    user+='【任务】请以倪师口吻生成回复。';return [SYSTEM_PROMPT,user];
  }
  async function callLLM(sysP,userP){
    if(!API_KEY){throw new Error('AI 回复服务维护中（公网不再内嵌密钥），请使用本地版 comment_tool');}
    let response;try{response=await fetch(API_URL,{method:'POST',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,messages:[{role:'system',content:sysP},{role:'user',content:userP}],max_tokens:500,temperature:.8})});}catch(e){throw new Error('生成服务暂时不可用，请稍后重试');}
    let data;try{data=await response.json();}catch(e){throw new Error(response.ok?'生成服务返回格式异常，请稍后重试':'生成服务请求失败（HTTP '+response.status+'）');}
    if(!response.ok)throw new Error('生成服务请求失败（HTTP '+response.status+'）');
    if(!data.choices||!data.choices[0]||!data.choices[0].message||typeof data.choices[0].message.content!=='string')throw new Error('生成服务返回格式异常，请稍后重试');
    return data.choices[0].message.content.trim();
  }
  function sanitize(text,guide,maxLen){
    const ecommPat=new RegExp(ECOMM_WORDS.join('|'));let kept=text.split(/(?<=[。！？!?])/).map(function(s){return s.trim();}).filter(function(s){if(!s||FORMULA_PAT.test(s))return false;if(ecommPat.test(s)&&!/(不要买|别买|先别买|别急着买|不用买|别碰|不要碰)/.test(s))return false;return true;});
    text=kept.join('');HARD_BLOCK.forEach(function(w){text=text.split(w).join('调理');});text=text.replace(/\n{2,}/g,'\n').trim().replace(/。。/g,'。').replace(/！！/g,'！').replace(/？？/g,'？').replace(/[（(][^（）()]{0,12}[)）]/g,'');
    if(text.length<50){const refuse=['不行','不能','别','不要','绝对','上火','孕妇','小孩','停'].some(function(w){return text.indexOf(w)!==-1;});if(text&&!refuse&&guide&&guide.eat)text=text.replace(/[。！？!?]+$/,'')+'。'+guide.eat;else if(text&&refuse)text=text.replace(/[。！？!?]+$/,'')+'。身体状态不对的时候先别碰，等调理好了再说。';else if(!text&&guide)text=guide.eat||'';}
    maxLen=maxLen||160;if(text.length>maxLen){text=text.slice(0,maxLen);const idx=Math.max(text.lastIndexOf('。'),text.lastIndexOf('！'),text.lastIndexOf('？'));if(idx>60)text=text.slice(0,idx+1);}return text;
  }
  function diversifyOpening(text){
    if(!text)return text;const pat=/^\s*(?:(?:按倪师的说法|倪师常说|倪师讲过|倪师说过|倪师说|倪师讲|老师常说|老师讲过|老师说过|老师说|老师讲|倪老师讲过|倪老师说过|倪老师说|师父常说|师父说|师傅说|常说|说|讲|讲过|说过|认为|提到))+(?:[，,:：]\s*)?/;let rest=text.replace(pat,'').trim();rest=rest.replace(pat,'').trim();return rest.length>=4?rest:text;
  }
  async function generateReply(q,forceId){
    if(URGENT_WORDS.some(function(w){return q.indexOf(w)!==-1;}))return {reply:'你描述的情况可能需要尽快处理，先不要自行用养生产品。请立即联系急救或尽快到医院就诊；若症状正在加重，请让身边人陪同。',products:[],kb_sources:[],safety:'urgent'};
    const matched=matchProducts(q,forceId);const quitui=matched.length>0&&(PRODUCT_CONTRAINDICATIONS[matched[0].id]||[]).some(function(w){return q.indexOf(w)!==-1;});
    const kbParas=searchKB(q,matched.map(function(p){return p.id;}));const prompts=buildPrompt(q,matched,kbParas,quitui);const raw=await callLLM(prompts[0],prompts[1]);
    let reply=diversifyOpening(sanitize(raw,matched.length?matched[0].guide:{},matched.length?100:280));reply=reply.replace(/[^。！？!?~]*(?:主页|简介)[^。！？!?~]*[。！？!?~]?/g,'');
    if(quitui&&!/(不要买|别买|别碰|不要碰|不要吃|先别碰|不能吃|不建议|别吃|不能碰|先别吃|尽量别碰)/.test(reply))reply=reply.replace(/[。！？!?~]+$/,'')+'。'+QUITUI_TEMPLATE;
    if(!reply)reply='中医讲求辨证论治，日常注意规律作息、清淡饮食，症状明显的话还是要结合医院检查结果来看。';
    if(matched.length)reply=reply.replace(/[。！？!?~]+$/,'')+'。'+GUIDE_TEMPLATES[0];
    if(!/(医院检查|检查结果为准|结合医院|就医为准)/.test(reply))reply=reply.replace(/[。！？!?~]+$/,'')+'。'+DISCLAIMER_TEMPLATES[Math.floor(Math.random()*DISCLAIMER_TEMPLATES.length)];
    return {reply:reply,products:matched,kb_sources:kbParas.slice(0,3).map(function(r){return {file:r.file,score:r.score};})};
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  document.querySelectorAll('.p13-example').forEach(function(el){el.addEventListener('click',function(){document.getElementById('p13Question').value=el.textContent;});});
  document.getElementById('p13Generate').addEventListener('click',async function(){
    const input=document.getElementById('p13Question'),q=input.value.trim();if(!q){setStatus('请先粘贴粉丝评论');return;}const btn=this;btn.disabled=true;setStatus('正在生成，请稍候…');
    try{const data=await generateReply(q,document.getElementById('p13Product').value);lastReply=data.reply;document.getElementById('p13Reply').textContent=data.reply;
      const ps=data.products.length?data.products.map(function(p){return escapeHtml(p.name)+'（命中：'+escapeHtml(p.hit.join('/'))+'）<br><span style="color:#b45309">⚠️ 禁忌：'+escapeHtml((p.guide||{}).not_suitable||'无')+'</span>';}).join('<br>'):'未匹配到具体商品（全局中医模式回复）';
      const src=data.kb_sources.map(function(s){return escapeHtml(String(s.file||'').split(/[\\/]/).pop());}).filter(Boolean).join('、')||'无';
      document.getElementById('p13Meta').innerHTML='<b>匹配产品：</b>'+ps+'<br><b>知识来源：</b>'+src;document.getElementById('p13Result').style.display='block';document.getElementById('p13Copy').style.display='block';setStatus('✅ 生成完成，检查后复制');input.value='';
    }catch(e){setStatus('❌ '+(e&&e.message?e.message:'生成失败，请稍后重试'));}finally{btn.disabled=false;}
  });
  document.getElementById('p13Copy').addEventListener('click',async function(){if(!lastReply)return;try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(lastReply);else{const ta=document.createElement('textarea');ta.value=lastReply;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}this.textContent='✅ 已复制';const b=this;setTimeout(function(){b.textContent='📋 复制';},1500);}catch(e){setStatus('复制失败，请长按回复文本手动复制');}});
  if (LLM_ENABLED) loadKB();
  else setStatus('公网版已关闭 AI 生成，请使用本地版 comment_tool');
})();
