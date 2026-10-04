import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_CHOICE_KEY,
  analyticsPageLocation,
  analyticsPageReferrer,
  clearAnalyticsCookies,
  initAnalyticsConsent,
} from '../src/scripts/analytics-consent.mjs';

const MEASUREMENT_ID = 'G-LD0HE7HZ62';
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;
const recordFor = choice => JSON.stringify({ version: 1, choice, recordedAt: '2026-09-30T00:00:00Z' });

function element(dataset = {}) {
  return {
    dataset, hidden: false, disabled: true, listeners: {}, attrs: {}, textContent: '',
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(key, value) { this.attrs[key] = value; },
    focus() { this.focused = true; },
    click() { this.listeners.click?.({}); },
  };
}

function fixture({ choice = null, blockedStorage = false, readOnlyStorage = false } = {}) {
  const nodes = Object.fromEntries(['panel', 'title', 'open', 'close', 'status', 'notice', 'reload'].map(key => [key, element()]));
  const accept = element({ analyticsChoice: 'accepted' });
  const essentials = element({ analyticsChoice: 'essential' });
  const selectors = {
    '#analytics-consent-panel': nodes.panel,
    '#analytics-consent-title': nodes.title,
    '[data-analytics-open]': nodes.open,
    '[data-analytics-close]': nodes.close,
    '[data-analytics-status]': nodes.status,
    '[data-analytics-reload-notice]': nodes.notice,
    '[data-analytics-reload]': nodes.reload,
  };
  const root = element({
    measurementId: MEASUREMENT_ID,
    copy: JSON.stringify({ allowed: 'allowed', off: 'off', unsaved: 'unsaved', loadError: 'load failed' }),
  });
  root.querySelector = selector => selectors[selector];
  root.querySelectorAll = () => [accept, essentials];

  const cookies = new Map([['_ga', 'old'], [`_ga_${MEASUREMENT_ID.slice(2)}`, 'old'], ['unrelated', 'keep']]);
  const cookieWrites = [];
  const doc = {
    head: { appended: [], append(script) { this.appended.push(script); } },
    querySelector: () => root,
    createElement: () => element(),
  };
  Object.defineProperty(doc, 'cookie', {
    get() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
    set(value) { cookieWrites.push(value); cookies.delete(value.split('=')[0]); },
  });

  const saved = new Map([['howloop-saved-plan', '{"principal":10000}']]);
  if (choice) saved.set(ANALYTICS_CHOICE_KEY, recordFor(choice));
  const storage = {
    getItem(key) { return saved.get(key) || null; },
    setItem(key, value) {
      if (readOnlyStorage) throw new Error('Storage is read-only');
      saved.set(key, value);
    },
    removeItem(key) {
      if (readOnlyStorage) throw new Error('Storage is read-only');
      saved.delete(key);
    },
  };
  const win = {
    location: { hostname: 'howloop.how', pathname: '/tax-return/', protocol: 'https:', reload() { this.reloaded = true; } },
    listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
  };
  Object.defineProperty(win, 'localStorage', {
    get() {
      if (blockedStorage) throw new Error('Storage access denied');
      return storage;
    },
  });
  initAnalyticsConsent(doc, win);
  const commands = () => (win.dataLayer || []).map(command => Array.from(command));
  const fromOtherTab = newValue => {
    if (newValue === null) saved.delete(ANALYTICS_CHOICE_KEY);
    else saved.set(ANALYTICS_CHOICE_KEY, newValue);
    win.listeners.storage({ key: ANALYTICS_CHOICE_KEY, newValue, storageArea: storage });
  };
  return { nodes, accept, essentials, root, doc, win, saved, cookies, cookieWrites, commands, fromOtherTab };
}

test('fresh visits and essential-only choices never load or initialize Google Analytics', () => {
  const firstVisit = fixture();
  assert.equal(firstVisit.doc.head.appended.length, 0);
  assert.equal(firstVisit.win.gtag, undefined);
  assert.equal(firstVisit.win.dataLayer, undefined);
  assert.equal(firstVisit.win[DISABLE_KEY], true);
  firstVisit.essentials.click();
  assert.equal(firstVisit.doc.head.appended.length, 0);
  assert.equal(firstVisit.win.gtag, undefined);
  assert.equal(JSON.parse(firstVisit.saved.get(ANALYTICS_CHOICE_KEY)).choice, 'essential');

  const returningVisit = fixture({ choice: 'essential' });
  assert.equal(returningVisit.doc.head.appended.length, 0);
  assert.equal(returningVisit.win.gtag, undefined);
  assert.equal(returningVisit.nodes.panel.hidden, true);
});

test('grant initializes consent before measurements and withdrawal disables it without duplicate tags on regrant', () => {
  const f = fixture();
  f.accept.click();
  assert.equal(f.doc.head.appended.length, 1);
  assert.equal(f.doc.head.appended[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
  const commands = f.commands();
  assert.deepEqual(commands[0], ['consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  }]);
  assert.equal(commands[1][0], 'consent');
  assert.equal(commands[1][2].analytics_storage, 'granted');
  assert.equal(commands[1][2].ad_storage, 'denied');
  assert.ok(commands.findIndex(command => command[0] === 'config') > 1);
  assert.equal(f.win[DISABLE_KEY], false);

  f.nodes.open.click();
  assert.equal(f.nodes.panel.hidden, false);
  f.cookies.set('_ga', 'accepted');
  f.essentials.click();
  assert.equal(f.win[DISABLE_KEY], true);
  assert.equal(f.commands().at(-1)[2].analytics_storage, 'denied');
  assert.equal(f.cookies.has('_ga'), false);
  assert.equal(f.nodes.notice.hidden, false);
  assert.equal(JSON.parse(f.saved.get(ANALYTICS_CHOICE_KEY)).choice, 'essential');

  f.nodes.open.click();
  f.accept.click();
  assert.equal(f.win[DISABLE_KEY], false);
  assert.equal(f.doc.head.appended.length, 1);
  assert.equal(f.commands().at(-1)[2].analytics_storage, 'granted');
});

test('another tab withdrawing or deleting consent disables an already allowed page', () => {
  const f = fixture({ choice: 'accepted' });
  assert.equal(f.doc.head.appended.length, 1);
  f.fromOtherTab(recordFor('essential'));
  assert.equal(f.win[DISABLE_KEY], true);
  assert.equal(f.commands().at(-1)[2].analytics_storage, 'denied');
  assert.equal(f.nodes.notice.hidden, false);

  f.fromOtherTab(recordFor('accepted'));
  assert.equal(f.win[DISABLE_KEY], false);
  assert.equal(f.doc.head.appended.length, 1);
  f.fromOtherTab(null);
  assert.equal(f.win[DISABLE_KEY], true);
  assert.equal(f.commands().at(-1)[2].analytics_storage, 'denied');
  assert.equal(f.nodes.panel.hidden, false);
});

test('blocked storage still applies explicit choices for this visit without fallback consent cookies', () => {
  const f = fixture({ blockedStorage: true });
  assert.equal(f.doc.head.appended.length, 0);
  f.accept.click();
  assert.equal(f.doc.head.appended.length, 1);
  assert.equal(f.win[DISABLE_KEY], false);
  assert.match(f.nodes.status.textContent, /unsaved/);
  assert.equal(f.saved.has(ANALYTICS_CHOICE_KEY), false);
  f.essentials.click();
  assert.equal(f.win[DISABLE_KEY], true);
  assert.match(f.nodes.status.textContent, /unsaved/);
  assert.ok(f.cookieWrites.every(value => value.includes('Max-Age=0')));
  assert.equal(fixture({ blockedStorage: true }).doc.head.appended.length, 0);
});

test('read-only storage does not automatically revive a previously stored grant', () => {
  const f = fixture({ choice: 'accepted', readOnlyStorage: true });
  assert.equal(f.doc.head.appended.length, 0);
  assert.equal(f.win[DISABLE_KEY], true);
  assert.equal(f.nodes.panel.hidden, false);
  f.essentials.click();
  assert.equal(f.doc.head.appended.length, 0);
  assert.equal(f.win[DISABLE_KEY], true);
  assert.match(f.nodes.status.textContent, /unsaved/);
});

test('cookie cleanup only expires accessible GA cookies at current paths and known domain scopes', () => {
  const writes = [];
  const doc = {};
  Object.defineProperty(doc, 'cookie', {
    get() { return '_ga=one; _ga_LD0HE7HZ62=two; _gat=other; _ga_extra_name=three; session=keep'; },
    set(value) { writes.push(value); },
  });
  clearAnalyticsCookies(doc, { hostname: 'www.howloop.how', pathname: '/languages/ko/', protocol: 'https:' });
  assert.deepEqual(new Set(writes.map(value => value.split('=')[0])), new Set(['_ga', '_ga_LD0HE7HZ62', '_ga_extra_name']));
  assert.ok(writes.every(value => value.includes('Max-Age=0') && value.endsWith('; Secure')));
  assert.deepEqual(new Set(writes.map(value => /; Path=([^;]+)/.exec(value)[1])), new Set(['/', '/languages', '/languages/', '/languages/ko', '/languages/ko/']));
  assert.deepEqual(new Set(writes.map(value => /; Domain=([^;]+)/.exec(value)?.[1] || 'host-only')), new Set(['host-only', 'www.howloop.how', '.www.howloop.how', 'howloop.how', '.howloop.how']));

  const f = fixture();
  assert.equal(f.cookies.get('unrelated'), 'keep');
  assert.equal(f.saved.get('howloop-saved-plan'), '{"principal":10000}');
});


test('initial page configuration strips URL query/hash and reduces referrer to origin', () => {
  const f = fixture();
  f.win.location.href = 'https://howloop.how/tools/cash-flow/?balance=123&email=private#bills';
  f.doc.referrer = 'https://example.com/private-path?amount=100#details';
  f.accept.click();
  const config = f.commands().find(command => command[0] === 'config')[2];
  assert.equal(config.page_location, 'https://howloop.how/tools/cash-flow/');
  assert.equal(config.page_referrer, 'https://example.com/');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
});
test('analytics URL helpers fail closed and remove URL credentials', () => {
  assert.equal(analyticsPageLocation({href:'https://username:secret@howloop.how/tools/?x=1#x'}),'https://howloop.how/tools/');
  assert.equal(analyticsPageLocation({href:'javascript:alert(1)'}),'https://howloop.how/');
  assert.equal(analyticsPageReferrer('not a url'),'');
  assert.equal(analyticsPageReferrer('file:///private/file'),'');
  assert.equal(analyticsPageReferrer('https://user:secret@example.com/private'),'https://example.com/');
});
