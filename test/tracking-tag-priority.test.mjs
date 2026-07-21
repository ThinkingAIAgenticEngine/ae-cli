import assert from 'node:assert/strict';
import { getTagPriority } from '../src/tracking/xlsx/tag-priority.js';

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

console.log('tracking tag-priority tests');

test('Basic tag has highest priority (1)', () => {
  assert.equal(getTagPriority('Basic'), 1);
});

test('Core gameplay tags are priority 10-13', () => {
  assert.equal(getTagPriority('Battle'), 10);
  assert.equal(getTagPriority('Stage'), 11);
  assert.equal(getTagPriority('Dungeon'), 12);
  assert.equal(getTagPriority('Gacha'), 13);
});

test('Growth and Resource have priority 20-21', () => {
  assert.equal(getTagPriority('Growth'), 20);
  assert.equal(getTagPriority('Resource'), 21);
});

test('Monetization tags have priority 30-32', () => {
  assert.equal(getTagPriority('Ads'), 30);
  assert.equal(getTagPriority('Payment'), 31);
  assert.equal(getTagPriority('Subscription'), 32);
});

test('Supporting system tags have priority 40-46', () => {
  assert.equal(getTagPriority('Shop'), 40);
  assert.equal(getTagPriority('Quest'), 41);
  assert.equal(getTagPriority('Achievement'), 42);
  assert.equal(getTagPriority('Check-in'), 43);
  assert.equal(getTagPriority('Leaderboard'), 44);
  assert.equal(getTagPriority('Guild'), 45);
  assert.equal(getTagPriority('Social'), 46);
});

test('Genre-specific (game) tags have priority 50-57', () => {
  assert.equal(getTagPriority('Building'), 50);
  assert.equal(getTagPriority('Alliance'), 51);
  assert.equal(getTagPriority('Equipment'), 52);
  assert.equal(getTagPriority('Trade'), 53);
  assert.equal(getTagPriority('Revive'), 54);
  assert.equal(getTagPriority('Slots'), 55);
  assert.equal(getTagPriority('Lottery'), 56);
  assert.equal(getTagPriority('Reward'), 57);
});

test('Non-game tags have priority 60-76', () => {
  assert.equal(getTagPriority('Discovery'), 60);
  assert.equal(getTagPriority('Product'), 61);
  assert.equal(getTagPriority('Order'), 62);
  assert.equal(getTagPriority('After-sales'), 63);
  assert.equal(getTagPriority('Content'), 64);
  assert.equal(getTagPriority('Interaction'), 65);
  assert.equal(getTagPriority('Relationship'), 66);
  assert.equal(getTagPriority('Live'), 67);
  assert.equal(getTagPriority('Onboarding'), 68);
  assert.equal(getTagPriority('Course'), 69);
  assert.equal(getTagPriority('Enrollment'), 70);
  assert.equal(getTagPriority('Quiz'), 71);
  assert.equal(getTagPriority('Creation'), 72);
  assert.equal(getTagPriority('Material'), 73);
  assert.equal(getTagPriority('Export'), 74);
  assert.equal(getTagPriority('Playback'), 75);
  assert.equal(getTagPriority('Withdraw'), 76);
});

test('Chinese canonical tag lookup works', () => {
  assert.equal(getTagPriority('战斗'), 10);   // Battle
  assert.equal(getTagPriority('关卡'), 11);   // Stage
  assert.equal(getTagPriority('支付'), 31);   // Payment
  assert.equal(getTagPriority('商城'), 40);   // Shop
  assert.equal(getTagPriority('签到'), 43);   // Check-in
  assert.equal(getTagPriority('订单'), 62);   // Order
  assert.equal(getTagPriority('提现'), 76);   // Withdraw
  assert.equal(getTagPriority('基础事件'), 1); // Basic
});

test('Japanese canonical tag lookup works', () => {
  assert.equal(getTagPriority('戦闘'), 10);       // Battle
  assert.equal(getTagPriority('ガチャ'), 13);     // Gacha
  assert.equal(getTagPriority('広告'), 30);       // Ads
  assert.equal(getTagPriority('支払い'), 31);     // Payment
  assert.equal(getTagPriority('ショップ'), 40);   // Shop
  assert.equal(getTagPriority('基本イベント'), 1); // Basic
});

test('Korean canonical tag lookup works', () => {
  assert.equal(getTagPriority('전투'), 10);        // Battle
  assert.equal(getTagPriority('가챠'), 13);        // Gacha
  assert.equal(getTagPriority('광고'), 30);        // Ads
  assert.equal(getTagPriority('결제'), 31);        // Payment
  assert.equal(getTagPriority('상점'), 40);        // Shop
  assert.equal(getTagPriority('기본 이벤트'), 1);  // Basic
});

test('Unknown tags default to priority 80', () => {
  assert.equal(getTagPriority('UnknownTag'), 80);
  assert.equal(getTagPriority(''), 80);
  assert.equal(getTagPriority('xyz'), 80);
});

test('Tag priority ordering is correct (Basic < Battle < Growth < Ads < Shop < Discovery)', () => {
  const tags = ['Discovery', 'Shop', 'Basic', 'Ads', 'Battle', 'Growth'];
  tags.sort((a, b) => getTagPriority(a) - getTagPriority(b));
  assert.deepEqual(tags, ['Basic', 'Battle', 'Growth', 'Ads', 'Shop', 'Discovery']);
});

test('Mixed language tag sorting works', () => {
  const tags = ['发现', 'Shop', '基础事件', 'Ads', '战斗'];
  tags.sort((a, b) => getTagPriority(a) - getTagPriority(b));
  assert.deepEqual(tags, ['基础事件', '战斗', 'Ads', 'Shop', '发现']);
});

console.log('All tracking tag-priority tests passed.');
