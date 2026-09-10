import { SAMPLE, STORAGE_KEY, validateProduct, calculate, dimensions, makeTitle, makeDescription, issues, reviewCsv, parseCatalog, sampleOrder, advanceOrder } from './engine.js';

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', currencyDisplay: 'code' }).format(value);
let catalog = [{ ...SAMPLE }], selected = 0, order = null;
const productForm = $('product-form'), costForm = $('cost-form');
function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
function dirty() { $('save-state').textContent = '변경 사항이 있습니다. 기기에 저장하거나 JSON으로 백업하세요.'; }
function readForm() {
  const p = validateProduct({ ...Object.fromEntries(new FormData(productForm)), ...Object.fromEntries(new FormData(costForm)) });
  if (catalog.some((item, index) => index !== selected && item.id === p.id)) throw new Error('이미 사용 중인 SKU입니다.');
  return p;
}
function commit(report = true) {
  try {
    if (report && (!productForm.reportValidity() || !costForm.reportValidity())) throw new Error('입력값을 확인해 주세요.');
    const p = readForm(); catalog[selected] = p; renderResults(); renderCatalog(); return true;
  } catch (error) { message(error.message, true); return false; }
}
function fillForms() {
  const p = catalog[selected];
  for (const form of [productForm, costForm]) for (const field of form.elements) if (field.name && field.name in p) field.value = p[field.name];
  renderResults(); renderCatalog();
}
function renderCatalog() {
  $('products').replaceChildren(); $('catalog-count').textContent = catalog.length;
  catalog.forEach((p, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'product-item'; button.setAttribute('aria-pressed', String(index === selected));
    const id = document.createElement('small'), name = document.createElement('strong'), model = document.createElement('span');
    id.textContent = p.id; name.textContent = p.name; model.textContent = p.equipment;
    button.append(id, name, model); button.addEventListener('click', () => { if (!commit()) return; selected = index; fillForms(); message('상품을 선택했습니다.'); });
    $('products').append(button);
  });
}
function renderResults() {
  const p = catalog[selected], m = calculate(p), title = makeTitle(p);
  $('metric-price').textContent = money(p.price); $('metric-landed').textContent = money(m.landed); $('metric-profit').textContent = money(m.profit);
  $('metric-margin').textContent = `예상 마진 ${m.margin.toFixed(1)}% · ${m.profit >= 20 ? '건당 $20 목표 충족' : '건당 $20 목표 미달'}`;
  $('metric-profit').classList.toggle('negative', m.profit < 0);
  $('fee-total').textContent = money(m.fee); $('reserve-total').textContent = money(m.reserve); $('cost-total').textContent = money(m.total);
  $('dimension-note').textContent = dimensions(p); $('listing-title').value = title; $('listing-html').value = makeDescription(p);
  $('title-count').textContent = `${[...title].length} / 80자`; $('title-count').classList.toggle('invalid', [...title].length > 80);
  $('issues').replaceChildren(...issues(p).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); message(`${name} 다운로드를 시작했습니다.`);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); message('복사했습니다.'); }
  catch { message('클립보드 접근이 허용되지 않았습니다. 텍스트를 직접 선택해 복사해 주세요.', true); }
}
function confirmAction(title, description) {
  return new Promise(resolve => {
    const dialog = $('confirm-dialog'); $('confirm-title').textContent = title; $('confirm-text').textContent = description;
    dialog.returnValue = 'cancel'; dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }); dialog.showModal();
  });
}
productForm.addEventListener('submit', event => { event.preventDefault(); if (commit()) { dirty(); message('상품 정보를 적용했습니다. 기기에 저장하면 다음에 이어서 쓸 수 있습니다.'); } });
productForm.addEventListener('input', () => { dirty(); message('입력 중입니다. 상품 정보 적용을 누르면 초안에 반영됩니다.'); });
costForm.addEventListener('submit', event => event.preventDefault());
costForm.addEventListener('input', () => { dirty(); if (commit(false)) message('입력한 비용으로 예상 이익을 다시 계산했습니다.'); });
$('save-catalog').addEventListener('click', () => {
  if (!commit()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, catalog })); $('save-state').textContent = `이 기기에 저장됨 · ${new Date().toLocaleTimeString('ko-KR')}`; message('상품 정보를 이 브라우저에 저장했습니다.'); }
  catch { message('기기에 저장하지 못했습니다. JSON 백업을 다운로드해 주세요.', true); }
});
$('clear-storage').addEventListener('click', async () => {
  if (!await confirmAction('기기 저장본을 삭제할까요?', '이 브라우저에 저장된 하드웨어 상품 백업만 삭제합니다. 현재 화면의 작업은 유지됩니다.')) return;
  try { localStorage.removeItem(STORAGE_KEY); $('save-state').textContent = '기기 저장본이 없습니다.'; message('기기 저장본을 삭제했습니다.'); } catch { message('기기 저장소에 접근할 수 없습니다.', true); }
});
$('export-json').addEventListener('click', () => { if (commit()) download('howloop-trade-catalog.json', JSON.stringify({ version: 1, catalog }, null, 2), 'application/json'); });
$('import-json').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('1MB 이하의 JSON 파일을 사용해 주세요.');
    const next = parseCatalog(await file.text());
    if (!await confirmAction('백업을 불러올까요?', `현재 화면의 상품 목록을 백업의 ${next.length}개 상품으로 바꿉니다. 저장하지 않은 작업이 있으면 먼저 JSON으로 백업하세요.`)) return;
    catalog = next; selected = 0; order = null; renderOrder(); fillForms(); dirty(); message('백업을 불러왔습니다. 기기에 저장하려면 저장 버튼을 누르세요.');
  } catch (error) { message(error.message, true); } finally { event.target.value = ''; }
});
$('add-product').addEventListener('click', () => {
  if (!commit()) return;
  if (catalog.length >= 100) { message('한 카탈로그에 최대 100개 상품을 저장할 수 있습니다.', true); return; }
  catalog.push({ ...SAMPLE, id: 'SKU-' + crypto.randomUUID().slice(0, 8), name: 'Replacement Part', equipment: 'Model to verify', reference: '', material: '', sourceCost: 0, shipping: 0, notes: '' });
  selected = catalog.length - 1; fillForms(); dirty(); productForm.elements.namedItem('name').focus(); message('새 상품을 추가했습니다. 공급처 정보를 입력하세요.');
});
$('load-sample').addEventListener('click', () => {
  if (!commit()) return;
  const index = catalog.findIndex(p => p.id === SAMPLE.id);
  if (index >= 0) selected = index;
  else { if (catalog.length >= 100) { message('상품을 하나 삭제한 뒤 샘플을 추가해 주세요.', true); return; } catalog.push({ ...SAMPLE }); selected = catalog.length - 1; dirty(); }
  fillForms(); message('샘플 상품을 열었습니다. 아래에서 샘플 주문을 만들 수 있습니다.');
});
$('delete-product').addEventListener('click', async () => {
  if (catalog.length === 1) { message('최소 한 개의 상품은 남겨 주세요.', true); return; }
  if (!await confirmAction('이 상품을 삭제할까요?', `${catalog[selected].id}를 현재 목록에서 삭제합니다. 저장 전까지 기기 백업에는 반영되지 않습니다.`)) return;
  catalog.splice(selected, 1); selected = 0; fillForms(); dirty(); message('상품을 삭제했습니다.');
});
$('copy-title').addEventListener('click', () => { if (!commit()) return; if ([...makeTitle(catalog[selected])].length > 80) { message('부품명 또는 호환 모델을 줄여 제목을 80자 이하로 만들어 주세요.', true); return; } copy(makeTitle(catalog[selected])); });
$('export-csv').addEventListener('click', () => {
  if (!commit()) return;
  if (catalog.some(p => [...makeTitle(p)].length > 80)) { message('80자를 초과한 상품 제목이 있습니다. 부품명 또는 호환 모델을 줄여 주세요.', true); return; }
  download('howloop-trade-REVIEW-ONLY.csv', reviewCsv(catalog), 'text/csv;charset=utf-8');
});
function renderOrder() {
  $('order-empty').hidden = !!order; $('order-detail').hidden = !order; if (!order) return;
  $('order-id').textContent = order.id; $('order-sku').textContent = `${order.sku} · ${order.quantity}개 · 가상 주문`;
  $('seller-note').value = order.note;
  const step = ['awaiting_manual_review','simulated_order_prepared','simulated_tracking_prepared'].indexOf(order.status);
  [...$('order-progress').children].forEach((li, i) => { li.classList.toggle('done', i <= step); if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  $('advance-order').disabled = step === 2;
  $('advance-order').textContent = ['수동 확인 · 테스트 계속','가상 송장 준비','테스트 완료'][step];
  $('order-status').textContent = ['수동 확인 대기. 실제 결제 페이지는 열리지 않습니다.','발주 준비 단계를 시뮬레이션했습니다. 실제 주문은 없습니다.','송장 준비 단계 완료 · TEST-NOT-A-CARRIER-ID · 실제 운송사 번호가 아니며 eBay에 전송되지 않았습니다.'][step];
}
$('create-order').addEventListener('click', async () => {
  if (!commit()) return;
  if (order && !await confirmAction('테스트를 다시 시작할까요?', '현재 샘플 주문 결과를 새 샘플 주문으로 바꿉니다.')) return;
  order = sampleOrder(catalog[selected]); renderOrder(); message('샘플 주문 생성 완료. 수동 확인 단계에서 멈췄습니다.');
});
$('advance-order').addEventListener('click', async () => {
  if (!order) return;
  if (order.status === 'awaiting_manual_review' && !await confirmAction('샘플 발주 내용을 확인했나요?', `${order.sku} · 1개. 상품 옵션·주소·무지 포장 메모를 확인하는 단계입니다. 계속해도 실제 구매나 결제는 발생하지 않습니다.`)) return;
  try { order = advanceOrder(order); renderOrder(); message('샘플 주문 단계를 진행했습니다.'); } catch (error) { message(error.message, true); }
});
$('copy-note').addEventListener('click', () => { if (order) copy(order.note); });
$('export-order').addEventListener('click', () => { if (order) download('howloop-TEST-order.json', JSON.stringify(order, null, 2), 'application/json'); });
try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { catalog = parseCatalog(saved); $('save-state').textContent = '이 기기에 저장된 상품 목록을 불러왔습니다.'; } }
catch { message('저장본을 읽지 못해 샘플을 열었습니다. 기존 저장본은 덮어쓰지 않았습니다.', true); }
fillForms(); renderOrder();
