// Shared by the browser preview and the Twilio webhook. No school facts are invented.
export const school = Object.freeze({ name: 'H3 Pre School' });
const stages = ['consent', 'parent', 'age', 'start', 'followup', 'preference', 'phone', 'review', 'complete'];
export const labels = { parent: 'Parent / guardian', age: 'Child’s age', start: 'Preferred start', followup: 'Next step', preference: 'Preferred time', phone: 'Contact number' };
export function newSession(mode = 'preview') { return { mode, stage: 'consent', lead: {}, consent: false }; }
export function options(s) {
  switch (s.stage) {
    case 'consent': return ['Start enquiry', 'Just ask a question'];
    case 'age': return ['2 years', '3 years', '4 years', '5 years'];
    case 'start': return ['As soon as possible', 'Next academic year', 'Still exploring'];
    case 'followup': return ['Request a visit', 'Request a callback', 'Just information'];
    case 'preference': return ['Weekday morning', 'Weekday afternoon', 'No preference'];
    case 'phone': return ['Skip for now'];
    case 'review': return ['Confirm details', 'Edit details'];
    case 'complete': case 'stopped': return ['Start again'];
    default: return [];
  }
}
export function prompt(s) {
  switch (s.stage) {
    case 'consent': return `Hello! Welcome to ${school.name}. I’m the admissions assistant. I can help you prepare a preschool enquiry and answer admission questions.\n\nThis is a demo. Please use sample details. ${s.mode === 'preview' ? 'Your answers stay in this browser tab and are cleared when you reload.' : 'Your answers are held temporarily for this demo and cleared when the server restarts. No school staff are notified.'}\n\nWould you like to share a few details to prepare an enquiry?`;
    case 'parent': return 'Lovely to meet you. What is your name as the parent or guardian?';
    case 'age': return `Thanks, ${s.lead.parent}. How old is your child? You can tell me in years or months, for example “2 years 6 months”.`;
    case 'start': return 'When would you like your child to start preschool? You can choose below or enter a month and year.';
    case 'followup': return 'What would you like to do next: request a school visit, request a callback, or get information for now?';
    case 'preference': return `What day or time would suit you for ${s.lead.followup === 'Request a visit' ? 'a visit' : 'a callback'}? This is a preference; the school will need to confirm availability.`;
    case 'phone': return 'Which phone number should the team use for follow-up? Include the country code, or choose “Skip for now”. Use a sample number in this demo.';
    case 'review': return `Here is your enquiry summary:\n\n${summary(s)}\n\nAre these details correct?`;
    case 'complete': return `Your demo enquiry is ready. ${s.lead.followup === 'Just information' ? 'You can keep asking admission questions.' : 'Your preferred next step is included in the summary.'}\n\nNo enquiry has been sent to H3’s team, and no appointment is booked. When connected to the school’s system, confirmed enquiries can be passed to the admissions team.`;
    case 'stopped': return 'The demo conversation has stopped and your enquiry details have been cleared. You can start again whenever you like.';
  }
}
export function summary(s) {
  const rows = Object.entries(labels).filter(([key]) => s.lead[key]).map(([key, label]) => `${label}: ${s.lead[key]}`);
  if (s.lead.helpRequested) rows.push('Additional request: Speak with the admissions team');
  return rows.length ? rows.join('\n') : 'No enquiry details yet.';
}
export function progress(s) {
  if (s.stage === 'stopped') return 0;
  return Math.round(stages.indexOf(s.stage) / (stages.length - 1) * 100);
}
function faq(text) {
  if (/\b(fee|fees|cost|price|payment)\b/i.test(text)) return 'H3’s current fees have not been added to this demo. The admissions team will need to confirm tuition, any one-time charges, and payment options. I won’t guess an amount.';
  if (/\b(document|documents|certificate|paperwork)\b/i.test(text)) return 'H3’s admission document checklist has not been confirmed yet. The team will provide the official list before you submit an application. You do not need to upload documents in this demo.';
  if (/\b(location|address|where|transport|bus)\b/i.test(text)) return 'H3’s address and transport details have not been added to this demo. Please confirm these with the admissions team before planning a visit.';
  if (/\b(hours|timings|opening|closing|schedule|curriculum|activities|teachers|safety)\b/i.test(text)) return 'Those school details have not been confirmed for this demo. The H3 admissions team can explain the daily routine, learning approach, and school arrangements.';
  if (/\b(eligible|eligibility|age limit|minimum age|criteria|seat|seats|availability)\b/i.test(text) || /how (old|young)/i.test(text)) return 'H3’s age criteria and seat availability need confirmation from the school. I can record your child’s age for the team to review; this demo does not decide eligibility or guarantee admission.';
  if (/\b(process|apply|application|admission steps|how to enrol|how to enroll)\b/i.test(text)) return 'We can start by recording your basic enquiry, then note whether you want a visit or a callback. H3’s team will confirm availability, eligibility, fees, required documents, and the next application steps. This enquiry is not a confirmed admission.';
  return null;
}
export function respond(session, input) {
  const s = { ...session, lead: { ...session.lead } };
  const raw = String(input ?? '').trim();
  if (!raw || raw.length > 300) return { session: s, messages: ['Please enter a short message of up to 300 characters.'], choices: options(s) };
  const selected = options(s).find(c => c.toLowerCase() === raw.toLowerCase()) || (s.mode === 'whatsapp' && s.stage !== 'age' && /^\d+$/.test(raw) ? options(s)[Number(raw) - 1] : undefined);
  const text = selected || raw;
  if (/^(start again|restart|reset|start over)$/i.test(text)) {
    const fresh = newSession(s.mode);
    return { session: fresh, messages: [prompt(fresh)], choices: options(fresh) };
  }
  if (/^(stop|cancel|delete|clear my data)$/i.test(text)) {
    const stopped = { ...newSession(s.mode), stage: 'stopped' };
    return { session: stopped, messages: [prompt(stopped)], choices: options(stopped) };
  }
  if (s.stage === 'stopped') return { session: s, messages: [prompt(s)], choices: options(s) };
  const answer = faq(text);
  if (answer) return { session: s, messages: [answer, s.stage === 'consent' ? 'You can ask another question, or choose “Start enquiry” when you’re ready.' : prompt(s)], choices: options(s) };
  if (/\b(human|person|speak to|talk to|counsellor|counselor|admissions team)\b/i.test(text)) {
    if (s.consent) s.lead.helpRequested = true;
    return { session: s, messages: ['You can request a conversation with H3’s admissions team. This demo cannot notify a staff member or connect a live call. Complete your enquiry to include that request in the summary.', prompt(s)], choices: options(s) };
  }
  if (/^(hi|hello|hey|help|menu|just ask a question)$/i.test(text)) {
    return { session: s, messages: ['You can ask about fees, documents, eligibility, or the admission process. Type “stop” to clear your details, or “restart” to begin again.', prompt(s)], choices: options(s) };
  }
  if (text.includes('?') || /^(what|why|how|where|when|can you|do you|does|is there|are there)\b/i.test(text)) {
    return { session: s, messages: ['I can help prepare a preschool enquiry and answer questions about the admission process. That specific answer hasn’t been added to the demo yet; H3’s team will need to confirm it.', prompt(s)], choices: options(s) };
  }
  let error;
  switch (s.stage) {
    case 'consent':
      if (/^(start enquiry|yes|agree|i agree|start)$/i.test(text)) { s.consent = true; s.stage = 'parent'; }
      else error = 'Choose “Start enquiry” to share your details, or ask an admission question first.';
      break;
    case 'parent':
      if (text.length < 2 || !/\p{L}/u.test(text) || /[\d@<>]|https?:/i.test(text) || text.length > 70 || /\b(what|why|how|when|can you|is it)\b/i.test(text)) error = 'Please enter a name, for example “Priya Sharma”. You can use a sample name for the demo.';
      else { s.lead.parent = text; s.stage = 'age'; }
      break;
    case 'age': {
      const match = text.match(/^(\d{1,2}(?:\.\d)?)\s*(?:years?|yrs?|y)?(?:\s+(\d{1,2})\s*(?:months?|mos?|m))?$/i);
      const monthsOnly = text.match(/^(\d{1,3})\s*(?:months?|mos?|m)$/i);
      const total = monthsOnly ? Number(monthsOnly[1]) : match ? Number(match[1]) * 12 + Number(match[2] || 0) : NaN;
      if (!Number.isFinite(total) || total <= 0 || total > 216 || (match?.[2] && Number(match[2]) > 11)) error = 'Please enter an age in years or months, for example “3 years”, “30 months”, or “2 years 6 months”.';
      else { s.lead.age = /^\d+(\.\d)?$/.test(text) ? `${text} years` : text; s.stage = 'start'; }
      break;
    }
    case 'start':
      if (!options(s).includes(text) && !/^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}$/i.test(text)) error = 'Choose a start preference, or enter a month and year, for example “June 2027”.';
      else { s.lead.start = text; s.stage = 'followup'; }
      break;
    case 'followup': {
      const choice = /visit|tour/i.test(text) ? 'Request a visit' : /callback|call back|call/i.test(text) ? 'Request a callback' : /information|exploring|info/i.test(text) ? 'Just information' : null;
      if (!choice) error = 'Please choose a visit, a callback, or information for now.';
      else { s.lead.followup = choice; s.stage = choice === 'Just information' ? 'review' : 'preference'; }
      break;
    }
    case 'preference':
      if (text.length < 3 || /[<>]|https?:/i.test(text) || /\b(what|why|how|can you)\b/i.test(text)) error = 'Please enter a day or time preference, or choose “No preference”.';
      else { s.lead.preference = text; s.stage = 'phone'; }
      break;
    case 'phone':
      if (/^(skip|skip for now|no|prefer not to say)$/i.test(text)) { s.lead.phone = 'Not provided'; s.stage = 'review'; }
      else if (!/^\+?[\d\s()-]+$/.test(text) || text.replace(/\D/g, '').length < 8 || text.replace(/\D/g, '').length > 15) error = 'Please enter a valid number with 8–15 digits, or choose “Skip for now”.';
      else { s.lead.phone = text; s.stage = 'review'; }
      break;
    case 'review':
      if (/^(confirm details|confirm|yes|correct)$/i.test(text)) s.stage = 'complete';
      else if (/^(edit details|edit|no)$/i.test(text)) { s.lead = {}; s.stage = 'parent'; }
      else error = 'Choose “Confirm details” or “Edit details”.';
      break;
    case 'complete': error = 'Your demo enquiry is ready. You can ask an admission question, or choose “Start again”.'; break;
  }
  return { session: s, messages: [error || prompt(s)], choices: options(s) };
}
