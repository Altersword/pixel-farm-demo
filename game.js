// ============ 游戏配置 ============
const CROPS = {
  tomato:    { name: '番茄',   icon: '🍅', growTime: 30,  sellPrice: 10,  seedPrice: 5,  stages: ['🌱','🌿','🍅'] },
  carrot:    { name: '胡萝卜', icon: '🥕', growTime: 45,  sellPrice: 15,  seedPrice: 8,  stages: ['🌱','🌿','🥕'] },
  corn:      { name: '玉米',   icon: '🌽', growTime: 60,  sellPrice: 25,  seedPrice: 12, stages: ['🌱','🌿','🌽'] },
  strawberry:{ name: '草莓',   icon: '🍓', growTime: 90,  sellPrice: 40,  seedPrice: 20, stages: ['🌱','🌿','🍓'] },
  watermelon:{ name: '西瓜',   icon: '🍉', growTime: 120, sellPrice: 60,  seedPrice: 30, stages: ['🌱','🌿','🍉'] },
};

const SHOP_ITEMS = {
  decorations: [
    { id: 'flower_pot',  name: '花盆',   icon: '🪴', price: 50,  desc: '漂亮的陶瓷花盆' },
    { id: 'windmill',    name: '风车',   icon: '🌀', price: 80,  desc: '随风转动的小风车' },
    { id: 'scarecrow',   name: '稻草人', icon: '🧑‍🌾', price: 120, desc: '守护农场的稻草人' },
    { id: 'fence',       name: '栅栏',   icon: '🏠', price: 100, desc: '温馨的小栅栏' },
  ],
  snacks: [
    { id: 'candy',  name: '糖果',   icon: '🍬', price: 15, desc: '甜甜的水果糖' },
    { id: 'cookie', name: '饼干',   icon: '🍪', price: 25, desc: '酥脆的黄油饼干' },
    { id: 'cake',   name: '蛋糕',   icon: '🍰', price: 50, desc: '精致的小蛋糕' },
    { id: 'ice cream', name: '冰淇淋', icon: '🍦', price: 35, desc: '清凉的夏日冰淇淋' },
  ],
  gifts: [
    { id: 'teddy',    name: '小熊',   icon: '🧸', price: 80,  desc: '毛茸茸的泰迪熊' },
    { id: 'bouquet',  name: '花束',   icon: '💐', price: 100, desc: '芬芳的鲜花花束' },
    { id: 'star_bottle', name: '星瓶', icon: '⭐', price: 150, desc: '装满星星的玻璃瓶' },
    { id: 'music_box', name: '音乐盒', icon: '🎵', price: 200, desc: '会唱歌的八音盒' },
  ],
};

// ============ 游戏状态 ============
let state = {
  coins: 100,
  tool: 'plant',
  selectedSeed: 'tomato',
  plots: [],
  inventory: {},   // { itemId: count }
  seeds: {},       // { cropId: count }
};

// 初始化15块地
for (let i = 0; i < 15; i++) {
  state.plots.push({ crop: null, stage: 0, progress: 0, watered: false, plantedAt: null });
}

// 初始种子 - 每种作物各2颗，方便开局
state.seeds = { tomato: 5, carrot: 3, corn: 2, strawberry: 2, watermelon: 2 };

// ============ DOM 引用 ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const farmGrid = $('#farm-grid');
const coinDisplay = $('#coin-amount');
const statusText = $('#status-text');
const notification = $('#notification');

// ============ 存档 ============
function saveGame() {
  localStorage.setItem('pixel_farm_save', JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem('pixel_farm_save');
  if (saved) {
    const loaded = JSON.parse(saved);
    Object.assign(state, loaded);
    // 确保 plots 数组长度一致
    while (state.plots.length < 15) {
      state.plots.push({ crop: null, stage: 0, progress: 0, watered: false, plantedAt: null });
    }
    // 旧存档补全：确保每种作物至少有2颗种子
    Object.keys(CROPS).forEach(key => {
      if (!state.seeds[key] || state.seeds[key] < 2) {
        state.seeds[key] = Math.max(state.seeds[key] || 0, 2);
      }
    });
  }
}

// ============ 工具函数 ============
function updateCoins() {
  coinDisplay.textContent = state.coins;
  saveGame();
}

function showNotification(text) {
  notification.textContent = text;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 2000);
}

function setStatus(text) {
  statusText.textContent = text;
}

function getOwnedCount(itemId) {
  return state.inventory[itemId] || 0;
}

// ============ 农田渲染 ============
function renderFarm() {
  farmGrid.innerHTML = '';
  state.plots.forEach((plot, index) => {
    const div = document.createElement('div');
    div.className = 'plot';
    div.dataset.index = index;

    if (plot.decoration) {
      div.innerHTML = `<div class="crop-icon">${plot.decoration}</div>`;
    } else if (plot.crop) {
      const crop = CROPS[plot.crop];
      const isReady = plot.progress >= 100;

      if (isReady) {
        div.classList.add('ready');
        div.innerHTML = `
          <div class="crop-icon">${crop.stages[2]}</div>
          <div class="stage-label">可收获!</div>
        `;
      } else {
        div.classList.add(plot.watered ? 'watered' : 'planted');
        const stageIdx = plot.progress > 66 ? 1 : 0;
        const fillPct = Math.min(plot.progress, 100);
        div.innerHTML = `
          <div class="crop-icon">${crop.stages[stageIdx]}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${fillPct}%"></div></div>
          <div class="stage-label">${Math.floor(fillPct)}%</div>
        `;
      }
    } else {
      div.innerHTML = `<div class="crop-icon" style="opacity:0.3">🟫</div>`;
    }

    div.addEventListener('click', () => handlePlotClick(index));
    farmGrid.appendChild(div);
  });
}

// ============ 种田逻辑 ============
function handlePlotClick(index) {
  const plot = state.plots[index];

  // 装饰品：点击移除
  if (plot.decoration) {
    const decoItem = Object.values(SHOP_ITEMS).flat().find(i => i.icon === plot.decoration);
    if (decoItem) {
      state.inventory[decoItem.id] = (state.inventory[decoItem.id] || 0) + 1;
      showNotification(`收回了${decoItem.name}`);
    }
    plot.decoration = null;
    renderFarm();
    renderInventory();
    return;
  }

  switch (state.tool) {
    case 'plant':
      if (plot.crop) { setStatus('这块地已经有作物了！'); return; }
      if (!state.selectedSeed) { setStatus('请先选择要种植的种子！'); return; }
      if (!state.seeds[state.selectedSeed] || state.seeds[state.selectedSeed] <= 0) {
        setStatus('种子不够了，去商店买一些吧！');
        return;
      }
      plot.crop = state.selectedSeed;
      plot.stage = 0;
      plot.progress = 0;
      plot.watered = false;
      plot.plantedAt = Date.now();
      state.seeds[state.selectedSeed]--;
      showNotification(`种下了${CROPS[state.selectedSeed].name}！`);
      setStatus(`种下了${CROPS[state.selectedSeed].name}，记得浇水哦~`);
      break;

    case 'water':
      if (!plot.crop) { setStatus('这里没有作物可以浇水！'); return; }
      if (plot.progress >= 100) { setStatus('作物已经成熟了，快收获吧！'); return; }
      if (plot.watered) { setStatus('已经浇过水了！'); return; }
      plot.watered = true;
      showNotification('浇水成功！生长速度加快~');
      setStatus('哗啦啦~ 作物喝饱了水，长得更快了！');
      break;

    case 'harvest':
      if (!plot.crop) { setStatus('这里没有作物可以收获！'); return; }
      if (plot.progress < 100) { setStatus('作物还没成熟呢，再等等~'); return; }
      const harvested = plot.crop;
      const cropData = CROPS[harvested];
      if (!state.seeds[harvested]) state.seeds[harvested] = 0;
      state.seeds[harvested] += Math.floor(Math.random() * 2) + 1;
      if (!state.inventory[harvested]) state.inventory[harvested] = 0;
      state.inventory[harvested]++;
      plot.crop = null;
      plot.stage = 0;
      plot.progress = 0;
      plot.watered = false;
      plot.plantedAt = null;
      showNotification(`收获了${cropData.name}！获得1-2颗种子`);
      setStatus(`收获了${cropData.icon} ${cropData.name}！去背包卖掉赚金币吧~`);
      break;
  }

  updateCoins();
  renderFarm();
  renderInventory();
}

// ============ 成长计时器 ============
function growthTick() {
  const now = Date.now();
  let needsRender = false;

  state.plots.forEach(plot => {
    if (plot.crop && plot.progress < 100) {
      const crop = CROPS[plot.crop];
      let growTime = crop.growTime * 1000; // 转为毫秒
      if (plot.watered) growTime *= 0.7; // 浇水加速30%
      const elapsed = now - plot.plantedAt;
      plot.progress = Math.min((elapsed / growTime) * 100, 100);
      needsRender = true;

      if (plot.progress >= 100) {
        setStatus(`${crop.icon} ${crop.name}成熟了！快去收获吧~`);
      }
    }
  });

  if (needsRender) renderFarm();
}

// ============ UI 渲染 ============
function renderSeeds() {
  const panel = $('#seeds-panel');
  panel.innerHTML = '';

  const cropKeys = Object.keys(CROPS);
  if (cropKeys.length === 0) {
    panel.innerHTML = '<div style="color:#aaa;font-size:8px;text-align:center;padding:20px">没有种子了</div>';
    return;
  }

  cropKeys.forEach(key => {
    const crop = CROPS[key];
    const count = state.seeds[key] || 0;
    const div = document.createElement('div');
    div.className = `shop-item ${state.selectedSeed === key ? 'selected' : ''}`;
    div.innerHTML = `
      <div class="item-icon">${crop.icon}</div>
      <div class="item-info">
        <div class="item-name">${crop.name}</div>
        <div class="item-desc">生长: ${crop.growTime}s | 售价: ${crop.sellPrice}💰</div>
        <div class="item-owned">拥有: ${count}颗</div>
      </div>
    `;
    div.addEventListener('click', () => {
      state.selectedSeed = key;
      state.tool = 'plant';
      updateToolButtons();
      renderSeeds();
      setStatus(`选择了${crop.icon} ${crop.name}种子，点击空地种植~`);
    });
    panel.appendChild(div);
  });
}

function renderShop() {
  const panel = $('#shop-panel');
  panel.innerHTML = '';

  // 种子购买区 - 放在最顶部
  const seedHeader = document.createElement('div');
  seedHeader.style.cssText = 'color:#FFD700;font-size:16px;text-align:center;padding:10px 0 6px;font-family:Press Start 2P,monospace';
  seedHeader.textContent = '--- 种子 ---';
  panel.appendChild(seedHeader);

  Object.keys(CROPS).forEach(key => {
    const crop = CROPS[key];
    const count = state.seeds[key] || 0;
    const canBuy = state.coins >= crop.seedPrice;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.style.opacity = canBuy ? '1' : '0.5';
    div.innerHTML = `
      <div class="item-icon">${crop.icon}</div>
      <div class="item-info">
        <div class="item-name">${crop.name}种子</div>
        <div class="item-desc">生长${crop.growTime}s | 售价${crop.sellPrice}💰</div>
        <div class="item-owned">拥有: ${count}颗</div>
      </div>
      <div class="item-price">${crop.seedPrice}💰/颗</div>
    `;
    div.addEventListener('click', () => {
      if (state.coins < crop.seedPrice) {
        showNotification('金币不够啦！');
        return;
      }
      state.coins -= crop.seedPrice;
      state.seeds[key] = (state.seeds[key] || 0) + 1;
      updateCoins();
      renderShop();
      renderSeeds();
      showNotification(`购买了${crop.name}种子！`);
    });
    panel.appendChild(div);
  });

  const categories = [
    { key: 'decorations', label: '--- 装饰 ---' },
    { key: 'snacks', label: '--- 零食 ---' },
    { key: 'gifts', label: '--- 礼物 ---' },
  ];

  categories.forEach(cat => {
    const header = document.createElement('div');
    header.style.cssText = 'color:#FFD700;font-size:16px;text-align:center;padding:10px 0 6px;font-family:Press Start 2P,monospace';
    header.textContent = cat.label;
    panel.appendChild(header);

    SHOP_ITEMS[cat.key].forEach(item => {
      const owned = getOwnedCount(item.id);
      const canBuy = state.coins >= item.price;
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.opacity = canBuy ? '1' : '0.5';
      div.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
          ${owned > 0 ? `<div class="item-owned">拥有: ${owned}</div>` : ''}
        </div>
        <div class="item-price">${item.price}💰</div>
      `;
      div.addEventListener('click', () => {
        if (state.coins < item.price) {
          showNotification('金币不够啦！');
          setStatus(`${item.icon} ${item.name}需要${item.price}金币，你的金币不够哦~`);
          return;
        }
        state.coins -= item.price;
        state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
        updateCoins();
        renderShop();
        renderInventory();
        showNotification(`购买了${item.name}！`);
        setStatus(`获得了${item.icon} ${item.name}！${item.desc}`);
      });
      panel.appendChild(div);
    });
  });
}

function renderInventory() {
  const panel = $('#inventory-panel');
  panel.innerHTML = '';

  const hasItems = Object.values(state.inventory).some(v => v > 0);
  if (!hasItems) {
    panel.innerHTML = '<div style="color:#aaa;font-size:11px;text-align:center;padding:20px">背包空空的~<br>去收获作物吧！</div>';
    return;
  }

  // 农作物 - 可点击出售
  const cropKeys = Object.keys(CROPS);
  cropKeys.forEach(key => {
    if (state.inventory[key] && state.inventory[key] > 0) {
      const crop = CROPS[key];
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div class="item-icon">${crop.icon}</div>
        <div class="item-info">
          <div class="item-name">${crop.name}</div>
          <div class="item-desc">点击出售 ${crop.sellPrice}💰/个</div>
        </div>
        <div class="item-price">x${state.inventory[key]}</div>
      `;
      div.addEventListener('click', () => {
        state.inventory[key]--;
        state.coins += crop.sellPrice;
        updateCoins();
        renderInventory();
        showNotification(`卖掉了${crop.name}，+${crop.sellPrice}💰`);
      });
      panel.appendChild(div);
    }
  });

  // 装饰品 - 可点击摆放
  SHOP_ITEMS.decorations.forEach(item => {
    if (state.inventory[item.id] && state.inventory[item.id] > 0) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">点击摆放到农田</div>
        </div>
        <div class="item-price">x${state.inventory[item.id]}</div>
      `;
      div.addEventListener('click', () => {
        const emptyPlot = state.plots.findIndex(p => !p.crop && !p.decoration);
        if (emptyPlot === -1) { showNotification('农田满了，没有空位！'); return; }
        state.inventory[item.id]--;
        state.plots[emptyPlot] = { crop: null, stage: 0, progress: 0, watered: false, plantedAt: null, decoration: item.icon };
        renderFarm();
        renderInventory();
        showNotification(`在农田摆放了${item.name}！`);
      });
      panel.appendChild(div);
    }
  });

  // 零食 - 可点击食用，获得金币
  SHOP_ITEMS.snacks.forEach(item => {
    if (state.inventory[item.id] && state.inventory[item.id] > 0) {
      const refund = Math.floor(item.price * 0.5);
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">点击食用，获得${refund}💰</div>
        </div>
        <div class="item-price">x${state.inventory[item.id]}</div>
      `;
      div.addEventListener('click', () => {
        state.inventory[item.id]--;
        state.coins += refund;
        updateCoins();
        renderInventory();
        showNotification(`吃掉了${item.name}，回复${refund}💰`);
      });
      panel.appendChild(div);
    }
  });

  // 礼物 - 可点击送出，获得金币
  SHOP_ITEMS.gifts.forEach(item => {
    if (state.inventory[item.id] && state.inventory[item.id] > 0) {
      const refund = Math.floor(item.price * 0.6);
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">点击送出，获得${refund}💰</div>
        </div>
        <div class="item-price">x${state.inventory[item.id]}</div>
      `;
      div.addEventListener('click', () => {
        state.inventory[item.id]--;
        state.coins += refund;
        updateCoins();
        renderInventory();
        showNotification(`送出了${item.name}，获得${refund}💰`);
      });
      panel.appendChild(div);
    }
  });
}

// ============ 工具栏 ============
function updateToolButtons() {
  $$('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === state.tool);
  });
}

// ============ Tab 切换 ============
function setupTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#${btn.dataset.tab}-panel`).classList.add('active');
    });
  });
}

// ============ 背景音乐 ============
let audioCtx = null;
let musicPlaying = false;
let musicInterval = null;
let masterGain = null;
let activeOscillators = [];
let currentMelodyIndex = 0;

// 多首轻松旋律 (频率, 持续时间秒)
const SONGS = [
  {
    name: '晨光',
    melody: [
      [523, 0.4], [587, 0.4], [659, 0.4], [523, 0.4],
      [659, 0.4], [698, 0.4], [784, 0.8],
      [784, 0.3], [698, 0.3], [659, 0.4], [587, 0.4],
      [523, 0.4], [587, 0.4], [523, 0.8],
      [440, 0.4], [494, 0.4], [523, 0.4], [440, 0.4],
      [523, 0.4], [587, 0.4], [659, 0.8],
      [698, 0.4], [659, 0.4], [587, 0.4], [523, 0.4],
      [587, 0.6], [523, 0.6],
    ],
    bass: [
      [262, 1.6], [330, 1.6], [392, 1.6], [349, 1.6],
      [262, 1.6], [330, 1.6], [392, 1.6], [262, 1.6],
    ],
  },
  {
    name: '微风',
    melody: [
      [392, 0.5], [440, 0.3], [494, 0.5], [523, 0.3],
      [494, 0.4], [440, 0.4], [392, 0.8],
      [349, 0.5], [392, 0.3], [440, 0.5], [392, 0.3],
      [349, 0.4], [330, 0.4], [294, 0.8],
      [330, 0.4], [349, 0.4], [392, 0.4], [440, 0.4],
      [494, 0.6], [440, 0.6],
      [392, 0.4], [349, 0.4], [330, 0.4], [294, 0.4],
      [330, 0.6], [392, 0.6],
    ],
    bass: [
      [196, 1.6], [220, 1.6], [262, 1.6], [220, 1.6],
      [196, 1.6], [175, 1.6], [165, 1.6], [196, 1.6],
    ],
  },
  {
    name: '小溪',
    melody: [
      [659, 0.3], [698, 0.3], [784, 0.6], [659, 0.3], [698, 0.3],
      [784, 0.4], [880, 0.4], [784, 0.8],
      [698, 0.3], [659, 0.3], [587, 0.6], [523, 0.3], [587, 0.3],
      [659, 0.4], [587, 0.4], [523, 0.8],
      [494, 0.3], [523, 0.3], [587, 0.6], [659, 0.3], [587, 0.3],
      [523, 0.4], [494, 0.4], [440, 0.8],
    ],
    bass: [
      [330, 1.2], [262, 1.2], [294, 1.2], [330, 1.2],
      [349, 1.2], [294, 1.2], [262, 2.4],
    ],
  },
  {
    name: '星空',
    melody: [
      [440, 0.6], [523, 0.6], [659, 0.6], [784, 0.6],
      [659, 0.4], [523, 0.4], [440, 0.8],
      [392, 0.6], [494, 0.6], [659, 0.6], [587, 0.6],
      [494, 0.4], [392, 0.4], [349, 0.8],
      [330, 0.6], [440, 0.6], [587, 0.6], [523, 0.6],
      [440, 0.4], [330, 0.4], [294, 0.8],
    ],
    bass: [
      [220, 2.4], [196, 2.4], [175, 2.4], [165, 2.4],
      [220, 2.4], [196, 2.4], [262, 2.4],
    ],
  },
  {
    name: '午后',
    melody: [
      [523, 0.5], [587, 0.5], [523, 0.5], [494, 0.5],
      [440, 0.5], [523, 0.5], [587, 1.0],
      [659, 0.5], [587, 0.5], [523, 0.5], [494, 0.5],
      [440, 0.5], [392, 0.5], [440, 1.0],
      [330, 0.5], [392, 0.5], [440, 0.5], [523, 0.5],
      [587, 0.5], [523, 0.5], [440, 1.0],
    ],
    bass: [
      [262, 2.0], [220, 2.0], [196, 2.0], [220, 2.0],
      [175, 2.0], [196, 2.0], [262, 2.0],
    ],
  },
];

function stopAllOscillators() {
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  activeOscillators = [];
}

function startMusic() {
  if (musicPlaying) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(audioCtx.destination);

  musicPlaying = true;
  currentMelodyIndex = Math.floor(Math.random() * SONGS.length);
  $('#music-btn').classList.add('playing');
  playMelodyLoop();
}

function stopMusic() {
  musicPlaying = false;
  $('#music-btn').classList.remove('playing');
  if (musicInterval) { clearTimeout(musicInterval); musicInterval = null; }
  stopAllOscillators();
  if (masterGain) { masterGain.disconnect(); masterGain = null; }
}

function playMelodyLoop() {
  if (!musicPlaying) return;

  const song = SONGS[currentMelodyIndex];
  let time = audioCtx.currentTime;

  song.melody.forEach(([freq, dur]) => {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.3, time + 0.02);
    env.gain.linearRampToValueAtTime(0.2, time + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur);
    activeOscillators.push(osc);
    time += dur;
  });

  let bassTime = audioCtx.currentTime;
  song.bass.forEach(([freq, dur]) => {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, bassTime);
    env.gain.linearRampToValueAtTime(0.15, bassTime + 0.05);
    env.gain.linearRampToValueAtTime(0.08, bassTime + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, bassTime + dur);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(bassTime);
    osc.stop(bassTime + dur);
    activeOscillators.push(osc);
    bassTime += dur;
  });

  const totalDur = song.melody.reduce((sum, [, d]) => sum + d, 0);
  musicInterval = setTimeout(() => {
    currentMelodyIndex = (currentMelodyIndex + 1) % SONGS.length;
    playMelodyLoop();
  }, totalDur * 1000);
}

// ============ 初始化 ============
function init() {
  loadGame();
  updateCoins();
  setupTabs();

  // 工具栏
  $$('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.tool;
      updateToolButtons();
      const toolNames = { plant: '种植', water: '浇水', harvest: '收获' };
      setStatus(`切换到${toolNames[state.tool]}模式`);
    });
  });

  renderFarm();
  renderSeeds();
  renderShop();
  renderInventory();

  // 音乐按钮
  $('#music-btn').addEventListener('click', () => {
    if (musicPlaying) {
      stopMusic();
      showNotification('背景音乐已关闭');
    } else {
      startMusic();
      showNotification('背景音乐已开启~');
    }
  });

  // 成长计时器
  setInterval(growthTick, 1000);

  // 自动保存
  setInterval(saveGame, 10000);

  setStatus('欢迎来到像素农场！选择种子开始种植吧~');
}

init();
