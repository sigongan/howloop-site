/**
 * Keep search discovery on all finished public tools, guides, and explanations.
 * Unblocks /guides and /topics so Google AdSense and Search can index all 16+ long-form guides.
 */
export function isIndexableRoute(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  return !/^\/(?:404(?:\.html)?|desk|trade)(?:\/|$)/.test(route)
    && route !== '/products/payday-planner';
}
