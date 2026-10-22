/* Shared content. Classic scripts intentionally support opening index.html offline. */
(function (root) {
  'use strict';
  const crops = {
    tomato: { name: '番茄', growTime: 30, sellPrice: 10, seedPrice: 5, color: '#dc6651' },
    carrot: { name: '胡萝卜', growTime: 45, sellPrice: 15, seedPrice: 8, color: '#e49b50' },
    corn: { name: '玉米', growTime: 60, sellPrice: 25, seedPrice: 12, color: '#eac76a' },
    strawberry: { name: '草莓', growTime: 90, sellPrice: 40, seedPrice: 20, color: '#ce5778' },
    watermelon: { name: '西瓜', growTime: 120, sellPrice: 60, seedPrice: 30, color: '#7ca466' },
  };
  const neighbors = [
    { id: 'rabbit', name: '棉棉', species: '兔子', color: '#e6cbb6', likes: 'carrot', x: 5, y: 10, greeting: '搬来这里的第一天，连风都是新鲜的。你也喜欢早餐时听鸟叫吗？' },
    { id: 'squirrel', name: '栗栗', species: '松鼠', color: '#b77c55', likes: 'corn', x: 10, y: 8, greeting: '我的口袋总有一颗松果。万一哪天想种一片森林呢？' },
    { id: 'bear', name: '蜜朵', species: '小熊', color: '#bd9a69', likes: 'strawberry', x: 17, y: 7, greeting: '果酱慢慢熬才会甜。交朋友也是一样。' },
    { id: 'hippo', name: '河河', species: '河马', color: '#9ba5b5', likes: 'watermelon', x: 22, y: 12, greeting: '池塘边的长椅是我的午休王座。要不要坐一会儿？' },
    { id: 'fox', name: '枫叶', species: '狐狸', color: '#d58a55', likes: 'tomato', x: 17, y: 15, greeting: '我在收集落叶，也在收集好喝的蔬菜汤配方。' },
    { id: 'owl', name: '星灯', species: '猫头鹰', color: '#8d82a1', likes: 'strawberry', x: 9, y: 15, greeting: '夜晚并不空荡，萤火虫会把路上的星星点亮。' },
  ];
  const orders = [
    { name: '兔兔的早餐', neighbor: 'rabbit', wants: { tomato: 2 } },
    { name: '松鼠的野餐', neighbor: 'squirrel', wants: { carrot: 2, corn: 1 } },
    { name: '小熊的果酱', neighbor: 'bear', wants: { strawberry: 2 } },
    { name: '河马的消暑派对', neighbor: 'hippo', wants: { watermelon: 1, tomato: 2 } },
    { name: '狐狸的蔬菜汤', neighbor: 'fox', wants: { tomato: 1, carrot: 1, corn: 2 } },
    { name: '森林水果节', neighbor: 'owl', wants: { strawberry: 2, watermelon: 2 } },
  ];
  const items = {
    flower_pot: { name: '陶土花盆', price: 50, kind: 'decor', sprite: 'flowerbox' },
    windmill: { name: '小风车', price: 80, kind: 'decor', sprite: 'windmill' },
    scarecrow: { name: '稻草人', price: 120, kind: 'decor', sprite: 'scarecrow' },
    fence: { name: '小栅栏', price: 100, kind: 'decor', sprite: 'fence' },
    candy: { name: '水果糖', price: 15, kind: 'snack' },
    cookie: { name: '黄油饼干', price: 25, kind: 'snack' },
    cake: { name: '小蛋糕', price: 50, kind: 'snack' },
    'ice cream': { name: '冰淇淋', price: 35, kind: 'snack' },
    teddy: { name: '小熊玩偶', price: 80, kind: 'gift' },
    bouquet: { name: '花束', price: 100, kind: 'gift' },
    star_bottle: { name: '星瓶', price: 150, kind: 'gift' },
    music_box: { name: '音乐盒', price: 200, kind: 'gift' },
  };
  const legacyDecor = { '🪴': 'flower_pot', '🌀': 'windmill', '🧑‍🌾': 'scarecrow', '🏠': 'fence' };
  root.ForestData = { crops, neighbors, orders, items, legacyDecor, dayLength: 720000 };
  if (typeof module !== 'undefined') module.exports = root.ForestData;
})(typeof globalThis !== 'undefined' ? globalThis : this);
