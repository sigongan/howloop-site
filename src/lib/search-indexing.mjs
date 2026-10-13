/**
 * Keep search discovery on finished, maintained public tools and explanations.
 */
export function isIndexableRoute(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  return !/^\/(?:404(?:\.html)?|guides|topics|desk|trade)(?:\/|$)/.test(route)
    && route !== '/products/payday-planner';
}
