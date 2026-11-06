import {localDayKey} from './analytics.js';
import {icon} from './views.js';

export function createHistoryCalendar(onChange) {
  const button = document.querySelector('#toggle-history-date');
  const panel = document.querySelector('#history-date-panel');
  const value = document.querySelector('#history-date');
  button.setAttribute('aria-haspopup', 'dialog');
  const months = Array.from({length:12}, (_, month) => new Date(2024, month, 1).toLocaleDateString('pt-BR', {month:'long'}));
  panel.innerHTML = `<div class="calendar-heading">
    <button type="button" class="icon-button" data-month-step="-1" aria-label="Mês anterior">${icon('arrow')}</button>
    <label class="sr-only" for="history-calendar-month">Mês</label><select id="history-calendar-month">${months.map((month,i) => `<option value="${i}">${month}</option>`).join('')}</select>
    <label class="sr-only" for="history-calendar-year">Ano</label><input id="history-calendar-year" type="number" min="1" max="9999" inputmode="numeric" aria-label="Ano">
    <button type="button" class="icon-button" data-month-step="1" aria-label="Próximo mês">${icon('arrow')}</button>
    </div><div class="calendar-weekdays" aria-hidden="true">${['D','S','T','Q','Q','S','S'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-days" role="group" aria-label="Dias do mês"></div>`;
  const monthInput = panel.querySelector('select');
  const yearInput = panel.querySelector('input');
  const days = panel.querySelector('.calendar-days');
  let focusedDate = new Date();

  function dateAt(year, month, day) {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(12, 0, 0, 0);
    return date;
  }
  function position() {
    if (panel.hidden) return;
    const anchor = button.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(anchor.right-panel.offsetWidth, innerWidth-panel.offsetWidth-8))}px`;
    panel.style.bottom = `${innerHeight-anchor.top+8}px`;
    panel.style.maxHeight = `${Math.max(0, anchor.top-16)}px`;
  }
  function draw(focus = false) {
    const year = focusedDate.getFullYear(), month = focusedDate.getMonth();
    monthInput.value = String(month);
    yearInput.value = String(year);
    panel.querySelector('[data-month-step="-1"]').disabled = year===1 && month===0;
    panel.querySelector('[data-month-step="1"]').disabled = year===9999 && month===11;
    const first = dateAt(year, month, 1).getDay();
    const count = dateAt(year, month+1, 0).getDate();
    const today = localDayKey(new Date()), focused = localDayKey(focusedDate);
    days.innerHTML = '<span aria-hidden="true"></span>'.repeat(first) + Array.from({length:count}, (_, i) => {
      const date = dateAt(year, month, i+1), key = localDayKey(date);
      return `<button type="button" data-history-day="${key}" tabindex="${key===focused ? 0 : -1}" aria-label="${date.toLocaleDateString('pt-BR', {dateStyle:'full'})}" aria-pressed="${key===value.value}" ${key===today ? 'aria-current="date"' : ''}>${i+1}</button>`;
    }).join('');
    position();
    if (focus) days.querySelector('[tabindex="0"]').focus({preventScroll:true});
  }
  function close(returnFocus = true) {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus({preventScroll:true});
  }
  button.onclick = () => {
    if (!panel.hidden) { close(); return; }
    focusedDate = value.value ? new Date(`${value.value}T12:00:00`) : new Date();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    draw(true);
  };
  function changeMonth(year, month) {
    const next = dateAt(year, month, 1);
    if (next.getFullYear()<1 || next.getFullYear()>9999) return;
    focusedDate = next;
    draw();
  }
  monthInput.onchange = () => changeMonth(focusedDate.getFullYear(), Number(monthInput.value));
  yearInput.oninput = () => {
    if (yearInput.value && yearInput.validity.valid) changeMonth(Number(yearInput.value), focusedDate.getMonth());
  };
  yearInput.onchange = () => {
    if (!yearInput.value || !yearInput.validity.valid) yearInput.value = String(focusedDate.getFullYear());
  };
  panel.onclick = event => {
    const day = event.target.closest('[data-history-day]');
    if (day) { value.value = day.dataset.historyDay; onChange(); close(); return; }
    const step = event.target.closest('[data-month-step]');
    if (step) changeMonth(focusedDate.getFullYear(), focusedDate.getMonth()+Number(step.dataset.monthStep));
  };
  panel.onkeydown = event => {
    if (event.key==='Escape') { event.preventDefault(); close(); return; }
    if (!event.target.matches('[data-history-day]')) return;
    const offsets = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7, Home:-focusedDate.getDay(), End:6-focusedDate.getDay()};
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    const next = dateAt(focusedDate.getFullYear(), focusedDate.getMonth(), focusedDate.getDate()+offsets[event.key]);
    if (next.getFullYear()<1 || next.getFullYear()>9999) return;
    focusedDate = next;
    draw(true);
  };
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close(false);
  });
  document.addEventListener('focusin', event => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close(false);
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position);
  document.querySelector('#clear-history-date').onclick = () => { value.value = ''; onChange(); close(); };
}
