// === Utils ===
function whyHasAnswers(arr) {
  return Array.isArray(arr) && arr.some(x => x && x.trim() !== "");
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function escapeHTML(str) {
  return (str || "").replace(/&/g,"&amp;")
                    .replace(/</g,"&lt;")
                    .replace(/>/g,"&gt;")
                    .replace(/"/g,"&quot;");
}

// === Help overlay (auto-åben ved load) ===
document.addEventListener('DOMContentLoaded', () => {
  const helpBtn = document.getElementById('helpBtn');
  const helpOverlay = document.getElementById('helpOverlay');
  const closeHelpBtn = document.querySelector('#helpOverlay .closeHelp');
  if (!helpBtn || !helpOverlay || !closeHelpBtn) return;

  helpBtn.addEventListener('click', () => helpOverlay.classList.toggle('hidden'));
  closeHelpBtn.addEventListener('click', () => helpOverlay.classList.add('hidden'));
  helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) helpOverlay.classList.add('hidden'); });

  // Vis hjælpen automatisk ved load
  helpOverlay.classList.remove('hidden');
});

// === Ishikawa: robust tegning af fiskebenet ===
(function drawFishbone() {
  function doDraw() {
    const svg = document.getElementById('fishboneSvg');
    const g = document.getElementById('ishikawa');
    if (!svg && !g) return;

    if (svg) {
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 1200 800');
      svg.setAttribute('preserveAspectRatio', 'none');
    }

    const rygX0 = 370, rygX1 = 900, rygY = 396;
    const boneLen = 230 + 76;
    const step = (rygX1 - rygX0) / 2;
    const boneAngle = 60 * Math.PI / 180;
    const mNames = ["Metode","Maskine","Miljø","Menneske","Måling","Materiale"];

    let svgBones = "";
    svgBones += `<line x1="${rygX0-283}" y1="${rygY}" x2="${rygX1+13}" y2="${rygY}" stroke="black" stroke-width="10" />`;
    svgBones += `<polygon points="${rygX1+14},${rygY-14} ${rygX1+74},${rygY} ${rygX1+14},${rygY+14}" fill="crimson"/>`;
    for (let i = 0; i < 3; i++) {
      const xBase = rygX0 + i * step;

      const x2top = xBase - boneLen * Math.cos(boneAngle);
      const y2top = rygY - boneLen * Math.sin(boneAngle);
      svgBones += `<line x1="${xBase}" y1="${rygY}" x2="${x2top}" y2="${y2top}" stroke="black" stroke-width="6"/>`;
      svgBones += `<text x="${x2top-50}" y="${y2top-20}" font-size="28" font-weight="bold" fill="#283c6c">${mNames[i]}</text>`;

      const x2bot = xBase - boneLen * Math.cos(boneAngle);
      const y2bot = rygY + boneLen * Math.sin(boneAngle);
      svgBones += `<line x1="${xBase}" y1="${rygY}" x2="${x2bot}" y2="${y2bot}" stroke="black" stroke-width="6"/>`;
      svgBones += `<text x="${x2bot-50}" y="${y2bot+38}" font-size="28" font-weight="bold" fill="#283c6c">${mNames[i+3]}</text>`;
    }

    if (g && g.tagName.toLowerCase() === 'g') g.innerHTML = svgBones;
    else if (svg) svg.innerHTML = svgBones;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', doDraw);
  else doDraw();
})();

// === M-positionsmåling og kategorisering ===
function getMPositions() {
  const topPositions = [];
  const bottomPositions = [];
  const texts = Array.from(document.querySelectorAll('#ishikawa text'));
  const diagramRect = document.getElementById('diagramArea').getBoundingClientRect();
  const rygYpx = diagramRect.top + (diagramRect.height / 2);
  texts.forEach((txt) => {
    const rect = txt.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    if (centerY < rygYpx) topPositions.push(centerX);
    else bottomPositions.push(centerX);
  });
  topPositions.sort((a, b) => a - b);
  bottomPositions.sort((a, b) => a - b);
  return { topPositions, bottomPositions };
}
function getMCatFromPos(div) {
  const rect = div.getBoundingClientRect();
  const boxCenterX = rect.left + (rect.width / 2);
  const boxLeft = rect.left;
  const boxRight = rect.right;
  const { topPositions, bottomPositions } = getMPositions();
  const diagramRect = document.getElementById('diagramArea').getBoundingClientRect();
  const topHalf = rect.top < (diagramRect.top + (diagramRect.height / 2));
  const positions = topHalf ? topPositions : bottomPositions;
  const offsetIndex = topHalf ? 0 : 3;
  let nearestIndex = 0;
  let nearestDist = Math.abs(boxCenterX - positions[0]);
  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(boxCenterX - positions[i]);
    if (dist < nearestDist) { nearestDist = dist; nearestIndex = i; }
  }
  if (nearestIndex > 0) {
    const leftNeighborX = positions[nearestIndex - 1];
    const midpoint = (positions[nearestIndex] + leftNeighborX) / 2;
    if (boxLeft < midpoint && boxRight > midpoint) {
      const overlapLeft = midpoint - boxLeft;
      const overlapRight = boxRight - midpoint;
      if (overlapRight <= overlapLeft) nearestIndex -= 1;
    }
  }
  return ["Metode","Maskine","Miljø","Menneske","Måling","Materiale"][nearestIndex + offsetIndex];
}

// === Liste over årsager grupperet efter M ===
function buildCausesListHTML() {
  const categories = { "Metode": [], "Maskine": [], "Miljø": [], "Menneske": [], "Måling": [], "Materiale": [] };
  document.querySelectorAll('#causes .causeBox').forEach(div => {
    const cat = getMCatFromPos(div) || "Ukendt";
    categories[cat].push(getCauseText(div));
  });
  let html = '<div style="font-size:22px; font-weight:bold; margin-bottom:10px;">Liste over alle årsager (grupperet efter M)</div>';
  for (const m of ["Metode","Maskine","Miljø","Menneske","Måling","Materiale"]) {
    if (categories[m].length) {
      html += `<div style="margin-top:12px; font-size:20px; font-weight:bold; color:#253c7c;">${m}</div>`;
      categories[m].forEach(txt => { html += `<div style="margin-left:16px;">- ${escapeHTML(txt)}</div>`; });
    }
  }
  return html;
}

// === Problemfelt (placeholder, autohøjde) ===
const problemBox = document.getElementById('problemBox');
function adjustProblemBoxHeight() {
  problemBox.style.height = "auto";
  problemBox.style.height = problemBox.scrollHeight + "px";
}
function sanitizeProblemBox() {
  const txt = problemBox.innerText;
  problemBox.textContent = txt;
}
problemBox.addEventListener('focus', function () {
  if (problemBox.classList.contains('placeholder')) {
    problemBox.textContent = "";
    problemBox.classList.remove('placeholder');
  }
});
problemBox.addEventListener('blur', function () {
  sanitizeProblemBox();
  if (problemBox.textContent.trim() === "") {
    problemBox.classList.add('placeholder');
    problemBox.textContent = problemBox.getAttribute('data-placeholder');
    problemBox.style.height = "80px";
  } else {
    adjustProblemBoxHeight();
  }
});
problemBox.addEventListener('input', function () { adjustProblemBoxHeight(); });

// Stop event-bobling i problem-boksen, så diagram-handlere ikke trigges
document.addEventListener('DOMContentLoaded', () => {
  const pb = document.getElementById('problemBox');
  if (pb) {
    ['mousedown','click','mouseup','touchstart','pointerdown'].forEach(evt =>
      pb.addEventListener(evt, ev => ev.stopPropagation())
    );
  }
});

// Første init for problemBox-højde/placeholder
if (problemBox.textContent.trim() === "") {
  problemBox.classList.add('placeholder');
  problemBox.textContent = problemBox.getAttribute('data-placeholder');
  problemBox.style.height = "80px";
} else {
  adjustProblemBoxHeight();
}

// === Hjælpere til årsagstekst og boksstruktur ===
function getCauseText(div) {
  const span = div.querySelector('.causeText');
  if (span) return span.textContent;
  const clone = div.cloneNode(true);
  const btn = clone.querySelector('.why-icon');
  if (btn) btn.remove();
  return clone.textContent.trim();
}
function setCauseText(div, txt) {
  let span = div.querySelector('.causeText');
  if (!span) {
    span = document.createElement('span');
    span.className = 'causeText';
    div.insertBefore(span, div.firstChild || null);
  }
  span.textContent = txt;
}
function reserveSpaceForWhy(div) {
  const btn = div.querySelector('.why-icon');
  if (!btn) return;
  requestAnimationFrame(() => {
    const pt = Math.max(24, btn.offsetHeight + 8);
    div.style.paddingTop = pt + 'px';
  });
}
function addWhyIcon(div) {
  let btn = document.createElement('button');
  btn.type = "button";
  btn.className = "why-icon";
  btn.setAttribute('aria-label', '5xWhy');
  btn.innerHTML = '5x<span style="font-size:86%">WHY?</span>';
  btn.onclick = function (ev) { ev.stopPropagation(); showWhyPopup(div); };
  div.appendChild(btn);
  updateWhyIcon(div);
}
function updateWhyIcon(div) {
  let btn = div.querySelector('.why-icon');
  if (!btn) return;
  if (whyHasAnswers(div._why)) { btn.setAttribute("data-filled", "yes"); btn.title = "5xWhy udfyldt"; }
  else { btn.removeAttribute("data-filled"); btn.title = "Åben 5xWhy"; }
}
function ensureAllWhyIcons() {
  document.querySelectorAll('#causes .causeBox').forEach((div) => { ensureCauseStructure(div); });
}
function ensureCauseStructure(div) {
  const btn = div.querySelector('.why-icon');
  const txt = getCauseText(div);
  if (!div.querySelector('.causeText')) {
    div.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'causeText';
    span.textContent = txt;
    div.appendChild(span);
    if (btn) div.appendChild(btn);
  } else {
    setCauseText(div, txt);
  }
  if (!div.ondblclick) div.ondblclick = () => openEditCauseInput(div);
  if (!div.querySelector('.why-icon')) addWhyIcon(div);
  updateWhyIcon(div);
  reserveSpaceForWhy(div);
}

// === 5xWhy popup og backdrop ===
let activeWhyDiv = null;
(function initWhyBackdrop() {
  function setup() {
    let bd = document.getElementById('whyBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'whyBackdrop';
      bd.className = 'hidden';
      document.body.appendChild(bd);
    }
    bd.addEventListener('click', () => closeWhyPopup(true));
    window._whyBackdrop = bd;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
function showWhyPopup(forDiv) {
  activeWhyDiv = forDiv;
  const popup = document.getElementById('whyPopup');
  popup.innerHTML = "";
  popup.classList.add('active');
  if (window._whyBackdrop) window._whyBackdrop.classList.remove('hidden');
  if (!forDiv._why) forDiv._why = [];
  const whyArr = forDiv._why.slice();
  if (whyArr.length === 0) whyArr.push("");
  popup._whyArr = whyArr;

  let html = `
    <h2>5xWhy på valgt årsag</h2>
    <div><b>Årsag:</b> ${escapeHTML(getCauseText(forDiv))}</div>
    <div id="whyRows"></div>
    <div style="margin-top:13px">
      <button class="pluswhy" title="Tilføj endnu et hvorfor?" type="button">+</button>
    </div>
    <div class="popup-controls">
      <button class="save savewhy">Gem</button>
      <button class="close closewhy">Luk</button>
    </div>
  `;
  popup.innerHTML = html;
  renderWhyRows(popup, whyArr);

  popup.querySelector('.pluswhy').onclick = function () {
    saveCurrentWhyInputs(popup, whyArr);
    whyArr.push("");
    renderWhyRows(popup, whyArr);
  };
  popup.querySelector('.savewhy').onclick = function () { closeWhyPopup(true); };
  popup.querySelector('.closewhy').onclick = function () { closeWhyPopup(true); };

  popup.onclick = (e) => e.stopPropagation();
}
function closeWhyPopup(save = true) {
  const popup = document.getElementById('whyPopup');
  if (!popup || !popup.classList.contains('active')) return;
  if (save && activeWhyDiv) {
    const arr = popup._whyArr || [];
    saveCurrentWhyInputs(popup, arr);
    activeWhyDiv._why = [...arr];
    updateWhyIcon(activeWhyDiv);
  }
  popup.classList.remove('active');
  popup._whyArr = null;
  if (window._whyBackdrop) window._whyBackdrop.classList.add('hidden');
}
document.addEventListener('mousedown', (e) => {
  const popup = document.getElementById('whyPopup');
  if (popup && popup.classList.contains('active') && !popup.contains(e.target)) {
    closeWhyPopup(true);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const popup = document.getElementById('whyPopup');
  if (popup && popup.classList.contains('active')) closeWhyPopup(true);
});
function autoSizeTA(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + 'px';
}
function renderWhyRows(popupDiv, arr) {
  saveCurrentWhyInputs(popupDiv, arr);
  const rows = arr.map((v, i) => `
    <div class="whyrow">
      <label style="min-width:85px;">Hvorfor ${i + 1}?</label>
      <textarea autocomplete="off" maxlength="600" placeholder="Skriv dit hvorfor her...">${v ? escapeHTML(v) : ''}</textarea>
      <button class="delrow" title="Slet denne" type="button">×</button>
    </div>
  `).join('');
  popupDiv.querySelector("#whyRows").innerHTML = rows;
  const tas = Array.from(popupDiv.querySelectorAll('.whyrow textarea'));
  tas.forEach((ta, idx) => {
    autoSizeTA(ta);
    ta.addEventListener('input', () => autoSizeTA(ta));
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        if (idx + 1 < tas.length) tas[idx + 1].focus();
      }
    });
  });
  Array.from(popupDiv.querySelectorAll('.whyrow .delrow')).forEach((btn, idx) => {
    btn.onclick = function () {
      saveCurrentWhyInputs(popupDiv, arr);
      arr.splice(idx, 1);
      if (arr.length === 0) arr.push("");
      renderWhyRows(popupDiv, arr);
    };
  });
}
function saveCurrentWhyInputs(popupDiv, arr) {
  const curInputs = popupDiv.querySelectorAll('.whyrow textarea');
  curInputs.forEach((el, idx) => { if (idx < arr.length) arr[idx] = el.value; });
}

// === ESC-luk prioritet ===
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const whyPopupEl = document.getElementById('whyPopup');
  if (whyPopupEl && whyPopupEl.classList.contains('active')) { closeWhyPopup(true); return; }
  const addPopup = document.getElementById('popup');
  if (addPopup && addPopup.style.display === 'block') { closePopup(); }
});

// === Årsagsbokse: add, drag, edit ===
const diagram = document.getElementById('diagramArea');
const causesDiv = document.getElementById('causes');
let clickCoords = { x: 0, y: 0 };
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let editInput = null;

// Klik-udenfor: luk add-popup og indsæt ved tekst
let addPopupMayClose = false;
document.addEventListener('mousedown', function (e) {
  // Klik i problem-boksen skal ikke tælle som "klik udenfor"
  const pb = document.getElementById('problemBox');
  if (pb && pb.contains(e.target)) return;

  const popupEl = document.getElementById('popup');
  if (!popupEl) return;
  const isOpen = popupEl.style.display === 'block';
  const clickedOutside = !popupEl.contains(e.target);
  if (isOpen && addPopupMayClose && clickedOutside) {
    const popupTextEl = document.getElementById('popupText');
    const val = (popupTextEl ? popupTextEl.value : '').trim();
    if (val) { submitText(); } else { closePopup(); }
  }
});

// Tilføj årsag: klik i tomt område -> popup
diagram.addEventListener('mousedown', function (e) {
  // Ignorér klik i problem-boksen
  if (e.target.closest('#problemBox')) return;

  if (window._whyBackdrop) window._whyBackdrop.classList.add('hidden');
  const whyEl = document.getElementById('whyPopup');
  if (whyEl && whyEl.classList.contains('active')) {
    e.preventDefault();
    if (typeof closeWhyPopup === 'function') closeWhyPopup(true);
  }
  if (e.target.closest(".causeBox")) return;

  // Klik i hele diagrammet er ok (SVG er klik-gennemsigtig via CSS)
  if (!diagram.contains(e.target)) return;

  const rect = diagram.getBoundingClientRect();
  clickCoords = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popupText');
  if (popupText) popupText.value = "";
  popup.style.display = 'block';
  popup.style.left = (e.pageX + 5) + 'px';
  popup.style.top = (e.pageY - 20) + 'px';
  popup.style.transform = 'none';

  addPopupMayClose = false;
  setTimeout(() => { addPopupMayClose = true; }, 0);
  e.stopPropagation();
  setTimeout(() => { if (popupText) popupText.focus(); }, 30);
});

// Klik i popup må ikke lukke den
document.addEventListener('DOMContentLoaded', () => {
  const popupEl = document.getElementById('popup');
  if (popupEl) popupEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
});

// Drag vs rediger: klik/hold for drag, klik for rediger
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragMoved = false;
diagram.addEventListener('mousedown', function (e) {
  // Ignorér klik i problem-boksen
  if (e.target.closest('#problemBox')) return;

  const whyEl = document.getElementById('whyPopup');
  if (whyEl && whyEl.classList.contains('active')) { e.preventDefault(); return; }
  if (e.target.classList.contains("why-icon")) return;
  const targetBox = e.target.closest(".causeBox");
  if (!targetBox) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragMoved = false;

  function onMouseMove(moveEvent) {
    const dx = moveEvent.clientX - dragStartX;
    const dy = moveEvent.clientY - dragStartY;
    // Hæv tærskel lidt (6 px) for at undgå trackpad-fejlklassifisering
    if (!dragMoved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      dragMoved = true;
      isDragging = true;
      dragTarget = targetBox;
      const rect = dragTarget.getBoundingClientRect();
      dragOffset.x = moveEvent.clientX - rect.left;
      dragOffset.y = moveEvent.clientY - rect.top;
      diagram.style.cursor = "grabbing";
    }
    if (isDragging && dragTarget) {
      const rect = diagram.getBoundingClientRect();
      let x = moveEvent.clientX - rect.left - dragOffset.x;
      let y = moveEvent.clientY - rect.top - dragOffset.y;
      x = Math.max(0, Math.min(rect.width - dragTarget.offsetWidth, x));
      y = Math.max(0, Math.min(rect.height - dragTarget.offsetHeight, y));
      dragTarget.style.left = x + "px";
      dragTarget.style.top = y + "px";
    }
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    diagram.style.cursor = "crosshair";
    if (!dragMoved) { openEditCauseInput(targetBox); }
    isDragging = false;
    dragTarget = null;
  }
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

// === Indsæt årsagsboks fra popup ===
function submitText() {
  let text = document.getElementById('popupText').value.trim();
  if (!text) return;
  if (text.length > 1000) text = text.substring(0, 1000) + "…";
  const div = document.createElement("div");
  div.className = "causeBox";
  div.style.left = clickCoords.x + "px";
  div.style.top = clickCoords.y + "px";
  div.title = "Dobbeltklik for at redigere";
  div.ondblclick = () => openEditCauseInput(div);
  const span = document.createElement('span');
  span.className = 'causeText';
  span.textContent = text;
  div.appendChild(span);
  addWhyIcon(div);
  causesDiv.appendChild(div);
  reserveSpaceForWhy(div);
  closePopup();
}
function closePopup() {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
  popup.style.left = '50%';
  popup.style.top = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
}

// === Åbn redigering af årsagsboks ===
function openEditCauseInput(div) {
  // Luk 5xWhy hvis åben
  const whyEl = document.getElementById('whyPopup');
  if (whyEl && whyEl.classList.contains('active')) {
    if (typeof closeWhyPopup === 'function') closeWhyPopup(true);
  }

  div.classList.add('editing');

  const causeText = getCauseText(div);
  const rect = div.getBoundingClientRect();

  editInput = document.createElement('textarea');
  editInput.value = causeText;
  editInput.className = "edit-cause-input";
  editInput.maxLength = 1000;
  editInput.style.left   = (rect.left + window.scrollX) + "px";
  editInput.style.top    = (rect.top + window.scrollY) + "px";
  editInput.style.width  = div.offsetWidth + "px";
  editInput.style.height = div.offsetHeight + "px";
  editInput.style.resize = "vertical";

  let hasSaved = false;
  function saveEditOnce() {
    if (hasSaved) return;
    hasSaved = true;

    const nyTekst = editInput.value.trim();
    div.innerHTML = "";
    setCauseText(div, nyTekst);
    addWhyIcon(div);
    ensureAllWhyIcons();
    reserveSpaceForWhy(div);

    div.classList.remove('editing');
    if (document.body.contains(editInput)) document.body.removeChild(editInput);
    editInput = null;
  }

  editInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      saveEditOnce();
    }
    if (ev.key === 'Escape') {
      div.classList.remove('editing');
      if (document.body.contains(editInput)) document.body.removeChild(editInput);
      editInput = null;
    }
  });

  editInput.addEventListener('blur', function () {
    saveEditOnce();
  });

  document.body.appendChild(editInput);
  editInput.focus();
}

// === Saml diagram og bilag i én PDF (kræver html2pdf.bundle) ===
function buildWhySupplementsHTML() {
  let html = '';
  let count = 0;
  document.querySelectorAll('#causes .causeBox').forEach(div => {
    if (!(div._why && whyHasAnswers(div._why))) return;
    const whyArr = div._why;
    const whyHtml = whyArr.map((v, i) =>
      v && v.trim()
        ? `<div style="margin-left:24px;margin-top:12px"><b>Hvorfor ${i + 1}:</b> <span style="white-space:pre-wrap">${escapeHTML(v)}</span></div>`
        : ''
    ).join('');
    if (!whyHtml) return;
    const pagebreak = (count > 0 ? 'page-break-before:always;' : '');
    html += `<div class="why-bilag" style="${pagebreak} width:882px; max-width:100%; margin:60px auto; font-size:19px;">
      <div style="font-size:36px;font-weight:bold;color:#253c7c;padding-bottom:18px;text-align:center; border-bottom:1.5px solid #a8a7a7;">Årsagsanalyse: 5xWhy</div>
      <div style="font-size:22px;font-weight:bold;color:#c23;text-align:center;margin:22px 0 10px 0;">
        Årsag:<br><span style="white-space:pre-wrap">${escapeHTML(getCauseText(div))}</span>
      </div>
      ${whyHtml}
    </div>`;
    count++;
  });
  return count > 0 ? html : '';
}
function buildCausesListHTML() {
  const categories = { "Metode": [], "Maskine": [], "Miljø": [], "Menneske": [], "Måling": [], "Materiale": [] };
  document.querySelectorAll('#causes .causeBox').forEach(div => {
    const cat = getMCatFromPos(div) || "Ukendt";
    categories[cat].push(getCauseText(div));
  });
  let html = '<div style="font-size:22px; font-weight:bold; margin-bottom:10px;">Liste over alle årsager (grupperet efter M)</div>';
  for (const m of ["Metode","Maskine","Miljø","Menneske","Måling","Materiale"]) {
    if (categories[m].length) {
      html += `<div style="margin-top:12px; font-size:20px; font-weight:bold; color:#253c7c;">${m}</div>`;
      categories[m].forEach(txt => { html += `<div style="margin-left:16px;">- ${escapeHTML(txt)}</div>`; });
    }
  }
  return html;
}
function saveAllAsPDF() {
  if (typeof adjustProblemBoxHeight === 'function') adjustProblemBoxHeight();
  const wrapper = document.createElement('div');
  wrapper.style.width = '1122px';
  wrapper.style.background = '#fff';
  const diagramClone = document.getElementById('diagramArea').cloneNode(true);
  diagramClone.style.margin = '0';
  wrapper.appendChild(diagramClone);

  const suppHTML = buildWhySupplementsHTML();
  if (suppHTML.trim().length > 0) {
    const suppDiv = document.createElement('div');
    suppDiv.innerHTML = suppHTML;
    wrapper.appendChild(suppDiv);
    const listHTML = buildCausesListHTML();
    if (listHTML.trim().length) {
      const listDiv = document.createElement('div');
      listDiv.style = "page-break-before:always; width:882px; max-width:100%; margin:60px auto; font-size:18px;";
      listDiv.innerHTML = listHTML;
      wrapper.appendChild(listDiv);
    }
  } else {
    const listHTML = buildCausesListHTML();
    if (listHTML.trim().length) {
      const listDiv = document.createElement('div');
      listDiv.style = "width:882px; max-width:100%; margin:60px auto; font-size:18px;";
      listDiv.innerHTML = listHTML;
      wrapper.appendChild(listDiv);
    }
  }
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${day}-${month}-${year}`;
  html2pdf().from(wrapper).set({
    margin: 0,
    pagebreak: { mode: ['css','legacy'] },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'px', format: [1122, 793], orientation: 'landscape' }
  }).save(`fiskeben-samlet-${dateString}.pdf`);
}

// === HTML-bilag (vis i siden) ===
function whyBilagHTMLstring() {
  let html = ''; let count = 0;
  document.querySelectorAll("#causes .causeBox").forEach(function (div) {
    if (!(div._why && whyHasAnswers(div._why))) return;
    const whyArr = div._why;
    const whyHtml = whyArr.map((v, i) =>
      v && v.trim()
        ? `<div style="margin-left:24px;margin-top:11px"><b>Hvorfor ${i + 1}:</b> <span style="white-space:pre-wrap">${escapeHTML(v)}</span></div>`
        : ""
    ).join('');
    if (whyHtml) {
      const pb = (count > 0 ? 'page-break-before:always;' : '');
      html += `<div style="${pb} width:820px; max-width:100%; margin:auto; margin-bottom:44px; font-size:19px;">
        <div style="font-size:32px;font-weight:bold;color:#253c7c;padding-bottom:20px;text-align:center; border-bottom:1.5px solid #a8a7a7;">Årsagsanalyse: 5xWhy</div>
        <div style="font-size:22px;font-weight:bold;color:#c23;text-align:center;margin:28px 0 14px 0;">Årsag:<br><span style="white-space:pre-wrap">${escapeHTML(getCauseText(div))}</span></div>
        ${whyHtml}
      </div>`;
      count++;
    }
  });
  return html;
}
function showWhyAsHtml() {
  const html = whyBilagHTMLstring();
  if (!html.trim()) { alert("Ingen bilag med udfyldt 5xWhy!"); return; }
  const win = document.getElementById('whyBilagHtml');
  win.innerHTML = `
    <div style="font-weight:bold; font-size:24px; color:#2856a6; text-align:center; margin-bottom:12px;">
      Bilag med udfyldt 5xWhy
    </div>
    <div>${html}</div>
    <div style="text-align:right; margin-top:11px;">
      <button class="closeWhyHtml" style="font-size:18px; background:#c32e32;color:#fff; border-radius:8px;padding:5px 16px; border:none;">
        Luk
      </button>
    </div>
  `;
  win.style.display = "block";
  const closeBtn = win.querySelector('.closeWhyHtml');
  if (closeBtn) closeBtn.addEventListener('click', () => { win.style.display = 'none'; }, { once: true });
}

// === Gem/Åbn projekt ===
function saveProject() {
  const causes = [];
  document.querySelectorAll("#causes .causeBox").forEach(div => {
    causes.push({
      x: parseInt(div.style.left, 10) || 0,
      y: parseInt(div.style.top, 10) || 0,
      text: getCauseText(div),
      why: Array.isArray(div._why) ? div._why : []
    });
  });
  const data = {
    problem: (problemBox.classList.contains('placeholder') ? "" : problemBox.textContent),
    causes
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = "ishikawa-projekt.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('loadProjectFile');
  if (!fileInput) return;
  fileInput.addEventListener('change', function (evt) {
    const f = evt.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        // Problemfelt
        if (data.problem !== undefined) {
          const txt = data.problem || "";
          if (!txt.trim()) {
            problemBox.classList.add('placeholder');
            problemBox.textContent = problemBox.getAttribute('data-placeholder');
            problemBox.style.height = "80px";
          } else {
            problemBox.classList.remove('placeholder');
            problemBox.textContent = txt;
            adjustProblemBoxHeight();
          }
        }
        // Årsager
        causesDiv.innerHTML = '';
        if (Array.isArray(data.causes)) {
          data.causes.forEach(cause => {
            const div = document.createElement("div");
            div.className = "causeBox";
            div.style.left = (cause.x || 0) + "px";
            div.style.top = (cause.y || 0) + "px";
            div.title = "Dobbeltklik for at redigere";
            div.ondblclick = () => openEditCauseInput(div);
            const span = document.createElement('span');
            span.className = 'causeText';
            span.textContent = (cause.text || "");
            div.appendChild(span);
            div._why = Array.isArray(cause.why) ? cause.why : [];
            addWhyIcon(div);
            causesDiv.appendChild(div);
            reserveSpaceForWhy(div);
          });
        }
        ensureAllWhyIcons();
      } catch (e) {
        alert("Kunne ikke indlæse projektfilen! (" + e.message + ")");
      }
    };
    reader.readAsText(f);
    evt.target.value = "";
  });
});

// === Init ===
ensureAllWhyIcons();
window.addEventListener('resize', () => {
  document.querySelectorAll('#causes .causeBox').forEach(div => reserveSpaceForWhy(div));
});

// Én samlet init-blok til topknapper + popup
document.addEventListener('DOMContentLoaded', () => {
  const savePdfBtn     = document.getElementById('savePdfBtn');
  const showWhyBtn     = document.getElementById('showWhyBtn');
  const saveProjectBtn = document.getElementById('saveProjectBtn');
  const openProjectBtn = document.getElementById('openProjectBtn');
  const fileInput      = document.getElementById('loadProjectFile');

  if (savePdfBtn)     savePdfBtn.addEventListener('click', saveAllAsPDF);
  if (showWhyBtn)     showWhyBtn.addEventListener('click', showWhyAsHtml);
  if (saveProjectBtn) saveProjectBtn.addEventListener('click', saveProject);
  if (openProjectBtn) openProjectBtn.addEventListener('click', () => fileInput && fileInput.click());

  const addBtn    = document.getElementById('addCauseBtn');
  const cancelBtn = document.getElementById('cancelCauseBtn');
  const popupText = document.getElementById('popupText');

  if (addBtn)    addBtn.addEventListener('click', submitText);
  if (cancelBtn) cancelBtn.addEventListener('click', closePopup);
  if (popupText) popupText.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitText(); });

  const popupEl = document.getElementById('popup');
  if (popupEl) popupEl.addEventListener('mousedown', (ev) => ev.stopPropagation());
});