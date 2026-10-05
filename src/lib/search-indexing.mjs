/**
 * Keep search discovery on finished, maintained public tools and explanations.
 * noindex is not access control: excluded pages remain reachable by their links.
 * Remove a product's explicit exclusion only when its useful public offer exists.
 */
export function isIndexableRoute(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  return !/^\/(?:404(?:\.html)?|guides|topics|desk|trade)(?:\/|$)/.test(route)
    && route !== '/products/payday-planner';
}
