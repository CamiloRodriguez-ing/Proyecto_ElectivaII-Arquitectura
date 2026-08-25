const API_BASE_URL =  'https://7v1igehfu2.execute-api.us-east-1.amazonaws.com/';
let preparedRequest = null;
let demoRequests = [];

const requestForm = document.querySelector('#request-form');
const feedback = document.querySelector('#request-feedback');
const requestResult = document.querySelector('#request-result');
const reviewSummary = document.querySelector('#review-summary');
const reviewForm = document.querySelector('#review-form');
const reviewResult = document.querySelector('#review-result');

async function callApi(path, options = {}) {
  const headers = {};
  if (options.body) headers['X-Request-Id'] = crypto.randomUUID();
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers: {...headers, ...options.headers}});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'La API devolvió un error.');
  return body.data;
}

function requestFromForm() {
  const data = new FormData(requestForm);
  return {student: {student_code: data.get('student_code'), name: data.get('name'), email: data.get('email')}, type: 'CREDIT_TRANSFER', academic_data: {source_course: data.get('source_course'), target_course: data.get('target_course'), source_credits: Number(data.get('source_credits')), target_credits: Number(data.get('target_credits'))}, documents: []};
}

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = 'VALIDANDO...';
  try {
    const payload = requestFromForm();
    const validation = await callApi('/v1/requests/validate', {method: 'POST', body: JSON.stringify(payload)});
    if (!validation.valid) throw new Error(validation.errors.map((item) => item.reason).join('. '));
    preparedRequest = await callApi('/v1/requests/prepare', {method: 'POST', body: JSON.stringify(payload)});
    demoRequests = [preparedRequest];
    feedback.textContent = 'SOLICITUD PREPARADA';
    requestResult.classList.remove('hidden');
    requestResult.textContent = `Solicitud ${preparedRequest.request_id} lista · estado ${preparedRequest.status} · versión ${preparedRequest.version}`;
    reviewSummary.textContent = `${preparedRequest.student.name} · ${preparedRequest.academic_data.source_course} → ${preparedRequest.academic_data.target_course} · versión ${preparedRequest.version}`;
    reviewForm.classList.remove('hidden');
  } catch (error) { feedback.textContent = error.message.toUpperCase(); }
});

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(reviewForm);
  try {
    const evaluated = await callApi('/v1/reviews/evaluate', {method: 'POST', body: JSON.stringify({request: preparedRequest, evaluation: {decision: data.get('decision'), observation: data.get('observation'), actor: {id: 'admin-demo', role: 'ADMINISTRATOR'}}})});
    preparedRequest = evaluated.request;
    demoRequests = [preparedRequest];
    reviewResult.classList.remove('hidden');
    reviewResult.textContent = `Estado actualizado: ${preparedRequest.status} · evento ${evaluated.event.event_type}`;
    await callApi('/v1/notifications/preview', {method: 'POST', body: JSON.stringify({event: evaluated.event, recipient: preparedRequest.student})});
  } catch (error) { reviewResult.textContent = error.message; reviewResult.classList.remove('hidden'); }
});

async function refreshAnalytics() {
  const result = await callApi('/v1/analytics/summary', {method: 'POST', body: JSON.stringify({requests: demoRequests})});
  document.querySelector('#analytics-result').innerHTML = `<div class="metric"><span>Total solicitudes</span><strong>${result.total}</strong></div><div class="metric"><span>Aprobación</span><strong>${result.approval_percentage}%</strong></div><div class="metric"><span>Requieren ajustes</span><strong>${result.changes_requested}</strong></div>`;
}

document.querySelector('#refresh-analytics').addEventListener('click', () => refreshAnalytics().catch((error) => { document.querySelector('#analytics-result').textContent = error.message; }));
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.tab, .view').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); document.querySelector(`#${tab.dataset.view}-view`).classList.add('active'); }));
callApi('/v1/health').then(() => { document.querySelector('#api-status').textContent = 'API conectada'; document.querySelector('.status-dot').classList.add('ready'); }).catch(() => { document.querySelector('#api-status').textContent = 'API desconectada'; });
