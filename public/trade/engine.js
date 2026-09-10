export const STORAGE_KEY = 'howloop.trade.catalog.v1';
export const SELLER_NOTE = 'Drop-shipping order. DO NOT include any invoice, receipt, promotional flyer, or branding. Neutral packaging only. Thank you.';
export const SAMPLE = Object.freeze({
  id: 'SAMPLE-001', category: 'Pool Cleaner', name: 'Pool Cleaner Diaphragm',
  equipment: 'Zodiac G2', reference: 'G2 (model only)', material: 'Rubber — unverified',
  sourceUrl: '', optionId: '', sourceCost: 4.5, shipping: 3.5, price: 39.9,
  feePercent: 14, fixedFee: 0.3, reservePercent: 5, otherCost: 1,
  weight: '', length: '', diameter: '', notes: '화면 테스트용 샘플. 실제 공급처·가격·재질·호환성·배송은 확인되지 않았습니다.',
});
const textFields = ['id','category','name','equipment','reference','material','sourceUrl','optionId','notes'];
const numberFields = ['sourceCost','shipping','price','feePercent','fixedFee','reservePercent','otherCost'];
const optionalNumbers = ['weight','length','diameter'];
export function validateProduct(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('상품 객체가 필요합니다.');
  const p = {};
  for (const key of textFields) {
    if (typeof value[key] !== 'string' || value[key].length > (key === 'notes' ? 3000 : 500)) throw new Error(`${key}: 텍스트 형식을 확인해 주세요.`);
    p[key] = value[key].trim();
  }
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(p.id) || !p.name || !p.equipment) throw new Error('SKU는 영문·숫자·밑줄·하이픈으로 입력하고 상품명과 호환 모델을 채워 주세요.');
  if (!['Garage Door','Pool Cleaner','Caravan / 4WD'].includes(p.category)) throw new Error('카테고리를 확인해 주세요.');
  if (p.sourceUrl) {
    let u; try { u = new URL(p.sourceUrl); } catch { throw new Error('상품 링크는 https://로 시작하는 전체 주소가 필요합니다.'); }
    if (u.protocol !== 'https:' || u.username || u.password) throw new Error('상품 링크는 로그인 정보가 없는 HTTPS 주소여야 합니다.');
  }
  for (const key of numberFields) {
    if (value[key] === '' || value[key] === null || !['number','string'].includes(typeof value[key])) throw new Error(`${key}: 숫자를 입력해 주세요.`);
    const n = Number(value[key]);
    if (!Number.isFinite(n) || n < 0 || n > 100000 || (key === 'price' && n === 0) || (key.endsWith('Percent') && n > 100)) throw new Error(`${key}: 숫자 범위를 확인해 주세요.`);
    p[key] = n;
  }
  for (const key of optionalNumbers) {
    if (value[key] === '' || value[key] === null || value[key] === undefined) { p[key] = ''; continue; }
    const n = Number(value[key]);
    if (!['number','string'].includes(typeof value[key]) || !Number.isFinite(n) || n <= 0 || n > 100000) throw new Error(`${key}: 0보다 큰 숫자를 입력해 주세요.`);
    p[key] = n;
  }
  return p;
}
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
export function calculate(value) {
  const p = validateProduct(value);
  const landed = round(p.sourceCost + p.shipping);
  const fee = round(p.price * p.feePercent / 100 + p.fixedFee);
  const reserve = round(p.price * p.reservePercent / 100);
  const profit = round(p.price - landed - fee - reserve - p.otherCost);
  return { landed, fee, reserve, profit, margin: round(profit / p.price * 100), total: round(landed + fee + reserve + p.otherCost) };
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function makeTitle(p) { return `Compatible with ${p.equipment} ${p.name}`; }
export function dimensions(p) {
  const measure = (n, label) => n === '' ? `${label}: not verified` : `${label}: ${n} mm (${(n / 25.4).toFixed(2)} in)`;
  return `${measure(p.length, 'Length')}; ${measure(p.diameter, 'Diameter')}`;
}
export function makeDescription(p) {
  const e = escapeHtml;
  return `<h2>${e(makeTitle(p))}</h2><p><strong>INTERNAL DRAFT — supplier, fitment and delivery not verified. Do not publish.</strong></p><p>Unbranded replacement candidate. Brand names identify the intended compatibility only; fitment must be confirmed before sale.</p><ul><li>Equipment: ${e(p.equipment)}</li><li>Reference supplied by seller: ${e(p.reference)}</li><li>Material: ${e(p.material)}</li><li>${e(dimensions(p))}</li></ul><p>Shipping service and delivery estimate: awaiting supplier confirmation.</p>`;
}
export function issues(p) {
  const out = ['공급처 가격·호환성·무지 포장·판매 방식 검증 필요'];
  if (!p.sourceUrl) out.push('실제 상품 링크 없음');
  if (!p.optionId) out.push('옵션 ID 없음');
  if (calculate(p).landed >= 10) out.push('원가 + 배송비가 AU $10 미만 조건을 벗어남');
  if (p.weight === '') out.push('중량 미확인'); else if (p.weight >= 400) out.push('중량이 400g 미만 조건을 벗어남');
  if (p.length === '' || p.diameter === '') out.push('치수 미확인');
  if ([...makeTitle(p)].length > 80) out.push('제목이 80자를 초과함');
  return out;
}
// Review CSV deliberately has no File Exchange Action column: it cannot create live listings.
export function reviewCsv(products) {
  const headers = ['SKU','Status','Category','Title','TitleLength','Brand','MPN','Equipment','Reference','Dimensions','WeightGrams','SourceURL','OptionID','SourcingAUD','ShippingAUD','PriceAUD','EstimatedProfitAUD','EstimatedMarginPercent','DescriptionHTML'];
  const rows = products.map(value => {
    const p = validateProduct(value), m = calculate(p), title = makeTitle(p);
    return [p.id,'DRAFT_NOT_FOR_UPLOAD',p.category,title,[...title].length,'Unbranded','Does Not Apply',p.equipment,p.reference,dimensions(p),p.weight,p.sourceUrl,p.optionId,p.sourceCost,p.shipping,p.price,m.profit,m.margin,makeDescription(p)];
  });
  const cell = value => {
    let v = String(value);
    if (/^[\s]*[=+@-]/.test(v) || /^[\t\r\n]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function parseCatalog(raw) {
  if (raw.length > 1000000) throw new Error('1MB 이하의 JSON 파일을 사용해 주세요.');
  let data; try { data = JSON.parse(raw); } catch { throw new Error('JSON 형식을 읽을 수 없습니다.'); }
  if (data.version !== 1 || !Array.isArray(data.catalog) || !data.catalog.length || data.catalog.length > 100) throw new Error('Howloop 버전 1 카탈로그(1~100개)가 필요합니다.');
  const products = data.catalog.map(validateProduct);
  if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('중복된 SKU가 있습니다.');
  return products;
}
export function sampleOrder(p) {
  validateProduct(p);
  return { id: 'TEST-ORDER-001', sku: p.id, quantity: 1, customer: 'TEST CUSTOMER', address: 'SYNTHETIC ADDRESS — DO NOT SHIP', suburb: 'TEST SUBURB', state: 'QLD', postcode: '0000', note: SELLER_NOTE, status: 'awaiting_manual_review', tracking: null, simulation: true };
}
export function advanceOrder(order) {
  if (!order || order.simulation !== true) throw new Error('샘플 주문만 지원합니다.');
  if (order.status === 'awaiting_manual_review') return { ...order, status: 'simulated_order_prepared' };
  if (order.status === 'simulated_order_prepared') return { ...order, status: 'simulated_tracking_prepared', tracking: 'TEST-NOT-A-CARRIER-ID' };
  throw new Error('이미 완료한 테스트입니다. 다시 시작하려면 샘플 주문을 새로 만들어 주세요.');
}
