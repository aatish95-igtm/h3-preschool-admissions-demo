import { newSession, prompt, respond, options, summary, labels, progress } from './engine.js';
const $ = (id) => document.getElementById(id);
let session = newSession();
let toastTimer;
const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function addMessage(text, sender) {
  const el = document.createElement('div');
  el.className = `message ${sender}`;
  const content = document.createElement('span'); content.textContent = text; el.append(content);
  const meta = document.createElement('span'); meta.className = 'message-meta'; meta.textContent = time();
  if (sender === 'user') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '#i-check'); svg.append(use); meta.append(svg);
  }
  el.append(meta); $('messages').append(el);
}
function render() {
  $('choices').replaceChildren();
  for (const text of options(session)) {
    const b = document.createElement('button'); b.className = 'choice'; b.textContent = text; b.type = 'button';
    b.addEventListener('click', () => send(text)); $('choices').append(b);
  }
  $('lead-summary').replaceChildren();
  for (const [key, label] of Object.entries(labels)) {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = session.lead[key] || '—'; if (!session.lead[key]) dd.className = 'empty-value';
    row.append(dt, dd); $('lead-summary').append(row);
  }
  if (session.lead.helpRequested) {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = 'Additional request'; dd.textContent = 'Speak with admissions team'; row.append(dt, dd); $('lead-summary').append(row);
  }
  const percent = progress(session);
  $('progress-percent').textContent = `${percent}%`; $('progress-fill').style.width = `${percent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', String(percent));
  $('progress-label').textContent = session.stage === 'complete' ? 'Enquiry prepared' : session.stage === 'consent' || session.stage === 'stopped' ? 'Waiting to begin' : 'Building your enquiry';
  const status = $('summary-status'); status.classList.toggle('confirmed', session.stage === 'complete');
  status.textContent = session.stage === 'complete' ? 'Demo summary confirmed. No enquiry sent or appointment booked.' : session.stage === 'review' ? 'Ready for the parent to review and confirm.' : session.consent ? 'Draft enquiry · awaiting confirmation' : 'A sample enquiry will appear here as you chat.';
  $('copy').disabled = !Object.keys(session.lead).length;
  $('message-input').placeholder = session.stage === 'parent' ? 'e.g. Priya Sharma' : session.stage === 'age' ? 'e.g. 2 years 6 months' : session.stage === 'phone' ? 'Sample number, or skip for now' : 'Type your reply…';
  requestAnimationFrame(() => { $('chat-scroll').scrollTop = $('chat-scroll').scrollHeight; });
}
function send(text) {
  if (!text.trim()) return;
  // Stop/restart removes the previous conversation from the visible DOM as well.
  if (/^(stop|cancel|delete|clear my data|restart|reset|start over|start again)$/i.test(text.trim())) $('messages').replaceChildren();
  addMessage(text, 'user');
  const result = respond(session, text); session = result.session;
  for (const text of result.messages) addMessage(text, 'bot');
  $('message-input').value = ''; render();
}
function reset() { session = newSession(); $('messages').replaceChildren(); $('message-input').value = ''; addMessage(prompt(session), 'bot'); render(); }
function notify(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('visible'); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
$('composer').addEventListener('submit', e => { e.preventDefault(); send($('message-input').value); });
$('reset').addEventListener('click', () => { reset(); notify('Conversation reset. Sample details cleared.'); });
$('sample').addEventListener('click', () => {
  reset();
  for (const answer of ['Start enquiry', 'Priya Sharma', '3 years', 'Still exploring', 'Request a visit', 'Weekday morning', 'Skip for now', 'Confirm details']) send(answer);
  notify('Sample enquiry ready. Scroll through the conversation to review it.');
});
$('copy').addEventListener('click', async () => {
  const text = `H3 Pre School — SAMPLE ENQUIRY\nStatus: ${session.stage === 'complete' ? 'Confirmed demo summary' : 'Draft'}\n${summary(session)}\n\nDemo only. Not sent to H3. No appointment booked.`;
  try { await navigator.clipboard.writeText(text); notify('Sample enquiry summary copied.'); }
  catch {
    const blob = new Blob([text], { type: 'text/plain' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'h3-sample-enquiry.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Sample summary downloaded.');
  }
});
$('connect').addEventListener('click', () => $('connection-dialog').showModal());
for (const id of ['close-dialog', 'dialog-done']) $(id).addEventListener('click', () => $('connection-dialog').close());
$('connection-dialog').addEventListener('click', e => { if (e.target === $('connection-dialog') && (e.clientX < e.target.getBoundingClientRect().left || e.clientX > e.target.getBoundingClientRect().right || e.clientY < e.target.getBoundingClientRect().top || e.clientY > e.target.getBoundingClientRect().bottom)) e.target.close(); });
reset();
