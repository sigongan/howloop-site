// Basic consent mode: the Google library itself is absent until analytics opt-in.
// This controls analytics only; it is not an advertising consent platform.
export const ANALYTICS_CHOICE_KEY = 'howloop-analytics-choice-v1';

export function parseAnalyticsChoice(raw) {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (record.version !== 1 || !['accepted', 'essential'].includes(record.choice)) return null;
    if (typeof record.recordedAt !== 'string' || !Number.isFinite(Date.parse(record.recordedAt))) return null;
    return record;
  } catch {
    return null;
  }
}

export function analyticsCookiePaths(pathname) {
  const paths = new Set(['/']);
  let path = '';
  for (const part of pathname.split('/').filter(Boolean)) {
    // Cookie attributes cannot safely contain these delimiters.
    if (/[;\r\n]/.test(part)) break;
    path += `/${part}`;
    paths.add(path);
    paths.add(`${path}/`);
  }
  return [...paths];
}

export function clearAnalyticsCookies(doc, location) {
  let names;
  try {
    names = doc.cookie.split(';').map(cookie => cookie.trim().split('=')[0])
      .filter(name => /^_ga(?:_[A-Za-z0-9_-]+)?$/.test(name));
  } catch {
    return;
  }
  const domains = new Set(['']); // An omitted Domain expires a host-only cookie.
  const hostname = location.hostname.toLowerCase();
  if (/^[a-z0-9.-]+$/.test(hostname) && hostname.includes('.')) {
    domains.add(hostname);
    domains.add(`.${hostname}`);
    if (hostname === 'howloop.how' || hostname.endsWith('.howloop.how')) {
      domains.add('howloop.how');
      domains.add('.howloop.how');
    }
  }
  for (const name of new Set(names)) {
    for (const path of analyticsCookiePaths(location.pathname)) {
      for (const domain of domains) {
        try {
          doc.cookie = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}${domain ? `; Domain=${domain}` : ''}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        } catch {
          // Browsers which deny cookie access must still be able to opt out.
        }
      }
    }
  }
}

export function initAnalyticsConsent(doc = document, win = window) {
  const root = doc.querySelector('[data-analytics-consent]');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  const measurementId = root.dataset.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '')) return;
  const copy = JSON.parse(root.dataset.copy);
  const panel = root.querySelector('#analytics-consent-panel');
  const title = root.querySelector('#analytics-consent-title');
  const open = root.querySelector('[data-analytics-open]');
  const close = root.querySelector('[data-analytics-close]');
  const status = root.querySelector('[data-analytics-status]');
  const reloadNotice = root.querySelector('[data-analytics-reload-notice]');
  const choices = root.querySelectorAll('[data-analytics-choice]');
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  const disableKey = `ga-disable-${measurementId}`;
  let storage = null;
  let storageFailed = false;
  let record = null;
  let analyticsStarted = false;
  let loadFailed = false;
  let consentGranted = false;

  // A denied/unknown choice does not create a Google data layer or load a tag.
  win[disableKey] = true;
  try {
    storage = win.localStorage;
    record = parseAnalyticsChoice(storage.getItem(ANALYTICS_CHOICE_KEY));
    // A read-only browser must not resurrect an old grant after an unsaved opt-out.
    // Echo only an existing grant; an unknown choice never writes a preference.
    if (record?.choice === 'accepted') storage.setItem(ANALYTICS_CHOICE_KEY, JSON.stringify(record));
  } catch {
    record = null;
    storageFailed = true;
  }

  function showStatus() {
    status.textContent = [loadFailed && consentGranted ? copy.loadError : consentGranted ? copy.allowed : copy.off, storageFailed ? copy.unsaved : ''].filter(Boolean).join(' ');
  }

  function setPanel(isOpen, focus = false) {
    panel.hidden = !isOpen;
    open.setAttribute('aria-expanded', String(isOpen));
    close.hidden = !record;
    if (focus) (isOpen ? title : open).focus();
  }

  function allowAnalytics() {
    consentGranted = true;
    win[disableKey] = false;
    reloadNotice.hidden = true;
    if (analyticsStarted) {
      win.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
      return;
    }
    analyticsStarted = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = function () { win.dataLayer.push(arguments); };
    // Queue consent before config so the first measurement has the user's choice.
    win.gtag('consent', 'default', denied);
    win.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
    win.gtag('js', new Date());
    win.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.howloopAnalytics = 'true';
    script.addEventListener('error', () => {
      loadFailed = true;
      showStatus();
    });
    doc.head.append(script);
  }

  function denyAnalytics() {
    consentGranted = false;
    // The GA opt-out flag blocks further measurements from already loaded code.
    win[disableKey] = true;
    if (analyticsStarted && typeof win.gtag === 'function') {
      win.gtag('consent', 'update', denied);
      reloadNotice.hidden = false;
    }
    clearAnalyticsCookies(doc, win.location);
  }

  function applyChoice() {
    if (record?.choice === 'accepted') allowAnalytics();
    else denyAnalytics();
    showStatus();
  }

  function choose(choice) {
    record = { version: 1, choice, recordedAt: new Date().toISOString() };
    storageFailed = false;
    try {
      if (!storage) storage = win.localStorage;
      storage.setItem(ANALYTICS_CHOICE_KEY, JSON.stringify(record));
    } catch {
      storageFailed = true;
      if (choice === 'essential') {
        try { storage?.removeItem(ANALYTICS_CHOICE_KEY); } catch { /* Storage may be entirely read-only. */ }
      }
      // The choice remains in memory for this document only; no fallback cookies.
    }
    applyChoice();
    setPanel(false, true);
  }

  choices.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => choose(button.dataset.analyticsChoice));
  });
  open.disabled = false;
  open.addEventListener('click', () => setPanel(true, true));
  close.addEventListener('click', () => setPanel(false, true));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && record) {
      event.preventDefault();
      setPanel(false, true);
    }
  });
  root.querySelector('[data-analytics-reload]').addEventListener('click', () => win.location.reload());
  win.addEventListener('storage', event => {
    if (event.storageArea && event.storageArea !== storage) return;
    if (event.key !== ANALYTICS_CHOICE_KEY && event.key !== null) return;
    record = parseAnalyticsChoice(event.newValue);
    storageFailed = false;
    applyChoice();
    setPanel(!record);
  });
  applyChoice();
  setPanel(!record);
}

if (typeof document !== 'undefined') initAnalyticsConsent();
