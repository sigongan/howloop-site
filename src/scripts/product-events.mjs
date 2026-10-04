import { ANALYTICS_CHOICE_KEY, parseAnalyticsChoice } from './analytics-consent.mjs';

// Explicit, bounded interaction events only. Never accept user-entered payloads.
const EVENTS = new Set(['planner_offer_open', 'planner_demo_open', 'planner_demo_calculate', 'planner_interest_yes', 'planner_interest_not_yet']);
const PLACEMENTS = new Set(['home', 'calculators', 'salary', 'emergency-fund', 'savings-goal', 'product', 'demo']);
export function trackPlannerEvent(event, placement, mode = 'sample', win = window) {
  if (!EVENTS.has(event) || !PLACEMENTS.has(placement) || !['sample', 'custom'].includes(mode)) return false;
  try {
    if (parseAnalyticsChoice(win.localStorage.getItem(ANALYTICS_CHOICE_KEY))?.choice !== 'accepted') return false;
    const measurementId = win.document?.querySelector('[data-analytics-consent]')?.dataset.measurementId;
    if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || typeof win.gtag !== 'function' || win[`ga-disable-${measurementId}`] !== false) return false;
    win.gtag('event', event, {
      product_id: 'payday_planner_v1', placement, mode,
      // Do not copy query strings, fragments, amounts, labels or dates.
      page_location: win.location.origin + win.location.pathname,
    });
    return true;
  } catch { return false; }
}

export function initProductLinks(doc = document, win = window) {
  doc.querySelectorAll('[data-planner-link]').forEach(link => {
    if (link.dataset.plannerBound) return;
    link.dataset.plannerBound = 'true';
    link.addEventListener('click', () => trackPlannerEvent(link.dataset.plannerLink, link.dataset.placement, 'sample', win));
  });
  const feedback = doc.querySelector('[data-planner-feedback]');
  if (!feedback || feedback.dataset.bound) return;
  feedback.dataset.bound = 'true';
  feedback.hidden = false;
  const status = feedback.querySelector('[data-feedback-status]');
  feedback.querySelectorAll('[data-feedback-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const sent = trackPlannerEvent(button.dataset.feedbackChoice === 'yes' ? 'planner_interest_yes' : 'planner_interest_not_yet', 'product', 'sample', win);
      status.textContent = sent ? 'Thanks. Your feedback helps us decide what to build. This is not an order.' : 'Nothing was sent because optional analytics is off or unavailable. You can still use the free preview.';
      if (sent) feedback.querySelectorAll('button').forEach(item => { item.disabled = true; });
    });
  });
}
if (typeof document !== 'undefined') initProductLinks();
