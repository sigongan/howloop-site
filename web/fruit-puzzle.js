import { renderFruitSymbol } from './scene/fruit-icons.js';

export const PUZZLE_PIECES = Object.freeze([0, 1, 2]);
const fruits = ['lemon', 'apple', 'watermelon'];
const validPiece = value => Number.isInteger(value) && PUZZLE_PIECES.includes(value);

export function initialPuzzleState(fruit = 'lemon') {
  if (!fruits.includes(fruit)) throw new RangeError(`Unknown puzzle fruit: ${fruit}`);
  return { fruit, selected: null, placed: [] };
}

export function updatePuzzleState(state, action) {
  if (action.type === 'reset') return initialPuzzleState(state.fruit);
  if (action.type === 'fruit') return initialPuzzleState(action.fruit);
  if (action.type === 'select') {
    if (!validPiece(action.piece) || state.placed.includes(action.piece)) return state;
    return { ...state, selected: action.piece };
  }
  if (action.type === 'place') {
    const piece = action.piece ?? state.selected;
    if (!validPiece(piece) || piece !== action.slot || state.placed.includes(piece)) return state;
    return { ...state, selected: null, placed: [...state.placed, piece].sort() };
  }
  return state;
}

export const isPuzzleComplete = state => PUZZLE_PIECES.every(piece => state.placed.includes(piece));

const copy = {
  en: {
    eyebrow: 'A little fruit puzzle', title: 'Put the fruit together!', done: 'You did it!',
    instruction: 'Drag a piece. Or tap a piece, then a space.',
    select: 'Now choose a space!', miss: 'Try another space!', match: 'A perfect fit!',
    complete: 'All 3 pieces are together!', again: 'Play again',
    board: 'Fruit puzzle spaces', tray: 'Fruit puzzle pieces', piece: 'Piece', space: 'Space',
    empty: 'Empty', placed: 'Piece in place', selected: 'Selected', progress: 'pieces in place',
  },
  ko: {
    eyebrow: '작은 과일 퍼즐', title: '과일을 맞춰 볼까요?', done: '정말 잘했어요!',
    instruction: '조각을 끌어 보세요. 조각과 빈칸을 차례로 눌러도 돼요.',
    select: '이제 빈칸을 골라요!', miss: '다른 칸에 놓아 볼까요?', match: '딱 맞아요!',
    complete: '세 조각을 모두 맞췄어요!', again: '한 번 더',
    board: '과일 퍼즐 빈칸', tray: '과일 퍼즐 조각', piece: '조각', space: '빈칸',
    empty: '비어 있음', placed: '조각 맞춤', selected: '선택됨', progress: '조각 완성',
  },
  es: {
    eyebrow: 'Un pequeño rompecabezas', title: '¡Junta las piezas de la fruta!', done: '¡Lo lograste!',
    instruction: 'Arrastra una pieza. O toca una pieza y luego un espacio.',
    select: '¡Ahora elige un espacio!', miss: '¡Prueba otro espacio!', match: '¡Encaja muy bien!',
    complete: '¡Las 3 piezas están juntas!', again: 'Jugar otra vez',
    board: 'Espacios del rompecabezas', tray: 'Piezas del rompecabezas', piece: 'Pieza', space: 'Espacio',
    empty: 'Vacío', placed: 'Pieza colocada', selected: 'Seleccionada', progress: 'piezas colocadas',
  },
};

function pieceSvg(fruit, piece) {
  const start = piece * 50 / 3;
  return `<svg viewBox="${start} 0 ${50 / 3} 50" preserveAspectRatio="none" overflow="hidden" aria-hidden="true" focusable="false">${renderFruitSymbol(fruit)}</svg>`;
}

/** A short matching game. Every drag has the same tap / keyboard alternative. */
export function createFruitPuzzle({ root, onSound = () => {}, onComplete = () => {} }) {
  if (!root?.ownerDocument) throw new TypeError('A puzzle container is required.');
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const titleId = 'puzzle-title';
  let state = initialPuzzleState(), language = 'en', message = '';
  let pointer = null, ghost = null, ignoreClickUntil = 0, feedbackTimer = null;
  let destroyed = false;

  root.classList.add('fruit-puzzle');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', titleId);
  root.innerHTML = `<header class="puzzle-header">
    <span class="puzzle-eyebrow"></span><h2 class="puzzle-title" id="${titleId}"></h2>
    <p class="puzzle-instruction"></p></header>
    <div class="puzzle-board" role="group">${PUZZLE_PIECES.map(piece => `<button type="button" class="puzzle-slot" data-puzzle-slot="${piece}"><span class="puzzle-art"></span><span class="puzzle-space-number" aria-hidden="true">${piece + 1}</span></button>`).join('')}</div>
    <div class="puzzle-tray" role="group">${[2, 0, 1].map(piece => `<button type="button" class="puzzle-piece" data-puzzle-piece="${piece}" aria-pressed="false"><span class="puzzle-art"></span><span class="puzzle-piece-number" aria-hidden="true">${piece + 1}</span></button>`).join('')}</div>
    <p class="puzzle-message" role="status" aria-live="polite" aria-atomic="true"></p>
    <div class="puzzle-footer"><span class="puzzle-progress"></span><button type="button" class="puzzle-replay" data-puzzle-reset></button></div>`;

  const get = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const slots = all('[data-puzzle-slot]'), pieces = all('[data-puzzle-piece]');
  const strings = () => copy[language];

  function updateArt() {
    for (const slot of slots) slot.querySelector('.puzzle-art').innerHTML = pieceSvg(state.fruit, Number(slot.dataset.puzzleSlot));
    for (const piece of pieces) piece.querySelector('.puzzle-art').innerHTML = pieceSvg(state.fruit, Number(piece.dataset.puzzlePiece));
  }

  function render() {
    const text = strings(), complete = isPuzzleComplete(state);
    root.lang = language;
    root.classList.toggle('is-complete', complete);
    root.dataset.fruit = state.fruit;
    get('.puzzle-eyebrow').textContent = text.eyebrow;
    get('.puzzle-title').textContent = complete ? text.done : text.title;
    get('.puzzle-instruction').textContent = text.instruction;
    get('.puzzle-board').setAttribute('aria-label', text.board);
    get('.puzzle-tray').setAttribute('aria-label', text.tray);
    get('.puzzle-replay').textContent = text.again;
    get('.puzzle-progress').textContent = `${state.placed.length} / 3`;
    get('.puzzle-progress').setAttribute('aria-label', `${state.placed.length} / 3 ${text.progress}`);
    get('.puzzle-message').textContent = text[message] || '';
    for (const slot of slots) {
      const piece = Number(slot.dataset.puzzleSlot), placed = state.placed.includes(piece);
      slot.classList.toggle('is-placed', placed);
      slot.disabled = placed;
      slot.setAttribute('aria-label', `${text.space} ${piece + 1}. ${placed ? text.placed : text.empty}.`);
    }
    for (const element of pieces) {
      const piece = Number(element.dataset.puzzlePiece), placed = state.placed.includes(piece);
      const selected = state.selected === piece;
      element.classList.toggle('is-placed', placed);
      element.classList.toggle('is-selected', selected);
      element.disabled = placed;
      element.setAttribute('aria-pressed', String(selected));
      element.setAttribute('aria-label', `${text.piece} ${piece + 1}${selected ? `. ${text.selected}` : ''}`);
    }
  }

  function clearFeedback() {
    win.clearTimeout(feedbackTimer);
    for (const slot of slots) slot.classList.remove('puzzle-mistake', 'puzzle-match', 'is-target');
  }

  function feedback(slot, className) {
    clearFeedback();
    slot?.classList.add(className);
    feedbackTimer = win.setTimeout(() => slot?.classList.remove(className), 650);
  }

  function select(piece) {
    const next = updatePuzzleState(state, { type: 'select', piece });
    if (next === state) return;
    state = next;
    message = 'select';
    render();
    onSound('puzzlePick');
    slots.find(slot => !slot.disabled)?.focus({ preventScroll: true });
  }

  function place(piece, slot) {
    const next = updatePuzzleState(state, { type: 'place', piece, slot });
    if (next === state) {
      if (!validPiece(piece)) return;
      message = 'miss';
      render();
      feedback(slots[slot], 'puzzle-mistake');
      onSound('puzzleMiss');
      return;
    }
    state = next;
    const complete = isPuzzleComplete(state);
    message = complete ? 'complete' : 'match';
    render();
    feedback(slots[slot], 'puzzle-match');
    onSound(complete ? 'puzzleComplete' : 'puzzleMatch');
    (complete ? get('.puzzle-replay') : pieces.find(element => !element.disabled))?.focus({ preventScroll: true });
    if (complete) onComplete(state.fruit);
  }

  function click(event) {
    if (Date.now() < ignoreClickUntil) { event.preventDefault(); return; }
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.hasAttribute('data-puzzle-reset')) { reset(); return; }
    if (button.hasAttribute('data-puzzle-piece')) select(Number(button.dataset.puzzlePiece));
    else if (button.hasAttribute('data-puzzle-slot')) place(state.selected, Number(button.dataset.puzzleSlot));
  }

  function slotAt(x, y) {
    const target = doc.elementFromPoint(x, y)?.closest('[data-puzzle-slot]');
    return target && root.contains(target) && !target.disabled ? target : null;
  }

  function cleanDrag() {
    if (pointer?.button.hasPointerCapture?.(pointer.id)) pointer.button.releasePointerCapture(pointer.id);
    pointer?.button.classList.remove('puzzle-dragging');
    pointer = null;
    ghost?.remove();
    ghost = null;
    root.classList.remove('puzzle-dragging');
    for (const slot of slots) slot.classList.remove('is-target');
  }

  function pointerDown(event) {
    const button = event.target.closest('[data-puzzle-piece]');
    if (pointer || !button || !root.contains(button) || button.disabled || event.button > 0) return;
    const bounds = button.getBoundingClientRect();
    pointer = { id: event.pointerId, piece: Number(button.dataset.puzzlePiece), button,
      x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, moved: false };
    button.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7) return;
    if (event.cancelable) event.preventDefault();
    if (!pointer.moved) {
      pointer.moved = true;
      select(pointer.piece);
      ghost = doc.createElement('div');
      ghost.className = 'puzzle-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.width = `${pointer.width}px`;
      ghost.style.height = `${pointer.height}px`;
      ghost.innerHTML = pieceSvg(state.fruit, pointer.piece);
      (root.closest('dialog') || root).append(ghost);
      root.classList.add('puzzle-dragging');
      pointer.button.classList.add('puzzle-dragging');
    }
    ghost.style.transform = `translate3d(${event.clientX - pointer.width / 2}px, ${event.clientY - pointer.height / 2}px, 0)`;
    const target = slotAt(event.clientX, event.clientY);
    for (const slot of slots) slot.classList.toggle('is-target', slot === target);
  }

  function pointerUp(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const { moved, piece } = pointer;
    const target = moved ? slotAt(event.clientX, event.clientY) : null;
    cleanDrag();
    if (!moved) return;
    ignoreClickUntil = Date.now() + 350;
    if (target) place(piece, Number(target.dataset.puzzleSlot));
  }

  function pointerCancel(event) {
    if (pointer && event.pointerId === pointer.id) cleanDrag();
  }

  function keyDown(event) {
    if (event.key !== 'Escape') return;
    cleanDrag();
    state = { ...state, selected: null };
    message = '';
    render();
  }

  function reset() {
    if (destroyed) return;
    cleanDrag();
    clearFeedback();
    ignoreClickUntil = 0;
    state = updatePuzzleState(state, { type: 'reset' });
    message = '';
    render();
  }

  root.addEventListener('click', click);
  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('keydown', keyDown);
  doc.addEventListener('pointermove', pointerMove, { passive: false });
  doc.addEventListener('pointerup', pointerUp);
  doc.addEventListener('pointercancel', pointerCancel);
  updateArt();
  render();

  return {
    setFruit(fruit) {
      if (destroyed || fruit === state.fruit) return;
      const next = initialPuzzleState(fruit);
      cleanDrag();
      clearFeedback();
      state = next;
      message = '';
      updateArt();
      render();
    },
    setLanguage(value) {
      if (destroyed) return;
      language = Object.hasOwn(copy, value) ? value : 'en';
      render();
    },
    reset,
    destroy() {
      if (destroyed) return;
      cleanDrag();
      clearFeedback();
      destroyed = true;
      root.removeEventListener('click', click);
      root.removeEventListener('pointerdown', pointerDown);
      root.removeEventListener('keydown', keyDown);
      doc.removeEventListener('pointermove', pointerMove);
      doc.removeEventListener('pointerup', pointerUp);
      doc.removeEventListener('pointercancel', pointerCancel);
      root.replaceChildren();
    },
  };
}
