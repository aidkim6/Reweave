// 확장 프로그램 밖(파일로 직접 열기)에서도 미리볼 수 있게 chrome API 대체
const hasChrome = typeof chrome !== 'undefined' && chrome.tabs && chrome.storage;
const ext = hasChrome ? chrome : {
  tabs: { query: (_q, cb) => cb([{ url: location.href, title: document.title }]), create: ({ url }) => window.open(url) },
  storage: { local: (() => {
    const mem = {};
    return {
      get: (keys, cb) => cb(Object.fromEntries([].concat(keys).filter(k => k in mem).map(k => [k, mem[k]]))),
      set: (values, cb) => { Object.assign(mem, values); cb && cb(); },
      remove: (keys, cb) => { [].concat(keys).forEach(k => delete mem[k]); cb && cb(); },
    };
  })() },
};

// ---------- 화면 전환 ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message || '';
}

// ---------- 토큰 저장소 ----------
const storageGet = (keys) => new Promise(resolve => ext.storage.local.get(keys, resolve));
const storageSet = (values) => new Promise(resolve => ext.storage.local.set(values, resolve));
const storageRemove = (keys) => new Promise(resolve => ext.storage.local.remove(keys, resolve));

const saveTokens = (t) => storageSet({ accessToken: t.accessToken, refreshToken: t.refreshToken });
const clearTokens = () => storageRemove(['accessToken', 'refreshToken']);

// ---------- 백엔드 API ----------
// 응답 형식: { success, code, message, data }
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('서버에 연결할 수 없어요.');
  }

  let json = null;
  try { json = await res.json(); } catch { /* 본문이 없는 응답 */ }

  if (!res.ok || (json && json.success === false)) {
    const error = new Error((json && json.message) || '요청에 실패했어요.');
    error.status = res.status;
    error.code = json && json.code;
    throw error;
  }
  return json ? json.data : null;
}

// 로그인이 필요한 API. accessToken이 만료(401)되면 refreshToken으로 한 번 재발급해서 다시 시도
async function authRequest(path, options = {}) {
  const { accessToken, refreshToken } = await storageGet(['accessToken', 'refreshToken']);
  try {
    return await request(path, { ...options, token: accessToken });
  } catch (error) {
    if (error.status !== 401 || !refreshToken) throw error;
  }

  let tokens;
  try {
    tokens = await request('/api/auth/reissue', {
      method: 'POST',
      body: { refreshToken, clientType: 'EXTENSION' },
    });
  } catch {
    // 재발급도 실패하면 다시 로그인해야 함
    await clearTokens();
    showScreen('screen-login');
    throw new Error('로그인이 만료됐어요. 다시 로그인해주세요.');
  }
  await saveTokens(tokens);
  return request(path, { ...options, token: tokens.accessToken });
}

// ---------- 현재 탭 ----------
let currentTab = { url: '', title: '' };

ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTab = { url: tabs[0].url || '', title: tabs[0].title || '' };
    document.getElementById('current-url').textContent = currentTab.url;
  }
});

// ---------- 카테고리 칩 ----------
const chipRow = document.getElementById('category-chips');

function makeChip(label, categoryId) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.dataset.categoryId = categoryId === null ? '' : String(categoryId);
  chip.textContent = label;
  return chip;
}

function selectChip(chip) {
  chipRow.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-selected'));
  chip.classList.add('chip-selected');
}

// '미분류'(categoryId 없음) + 내 카테고리 목록
async function loadCategories(selectId) {
  const data = await authRequest('/api/categories');
  chipRow.replaceChildren(makeChip('미분류', null));
  (data.categories || []).forEach(c => chipRow.appendChild(makeChip(c.categoryName, c.categoryId)));

  const target = selectId != null
    ? chipRow.querySelector(`[data-category-id="${selectId}"]`)
    : null;
  selectChip(target || chipRow.firstElementChild);
}

chipRow.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) selectChip(chip);
});

async function enterSaveScreen() {
  showError('save-error', '');
  showScreen('screen-save');
  chipRow.replaceChildren(makeChip('미분류', null));
  selectChip(chipRow.firstElementChild);
  try {
    await loadCategories();
  } catch (error) {
    // 목록을 못 불러와도 '미분류'로는 저장할 수 있게 둠
    chipRow.replaceChildren(makeChip('미분류', null));
    selectChip(chipRow.firstElementChild);
    showError('save-error', error.message);
  }
}

// ---------- 닫기 / 이동 ----------
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => window.close());
});

document.getElementById('btn-goto-signup').addEventListener('click', () => {
  ext.tabs.create({ url: `${WEB_BASE_URL}/#/signup` });
});

document.getElementById('btn-add-category').addEventListener('click', () => {
  showError('category-error', '');
  showScreen('screen-category');
});

document.getElementById('btn-back-to-save').addEventListener('click', () => {
  showScreen('screen-save');
});

document.getElementById('btn-complete-action').addEventListener('click', () => {
  ext.tabs.create({ url: `${WEB_BASE_URL}/#/bookmark` });
});

// ---------- 로그인 ----------
document.getElementById('btn-login').addEventListener('click', async (e) => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showError('login-error', '이메일과 비밀번호를 입력해주세요.');
    return;
  }

  const button = e.currentTarget;
  button.disabled = true;
  showError('login-error', '');
  try {
    const tokens = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password, clientType: 'EXTENSION' },
    });
    await saveTokens(tokens);
    await enterSaveScreen();
  } catch (error) {
    showError('login-error', error.message);
  } finally {
    button.disabled = false;
  }
});

// ---------- 카테고리 만들기 ----------
document.getElementById('btn-create-category').addEventListener('click', async (e) => {
  const categoryName = document.getElementById('category-title').value.trim();
  const description = document.getElementById('category-desc').value.trim();
  if (!categoryName) {
    showError('category-error', '카테고리 제목을 입력해주세요.');
    return;
  }

  const button = e.currentTarget;
  button.disabled = true;
  showError('category-error', '');
  try {
    const created = await authRequest('/api/categories', {
      method: 'POST',
      body: { categoryName, description: description || null },
    });
    document.getElementById('category-title').value = '';
    document.getElementById('category-desc').value = '';
    await loadCategories(created.categoryId);
    showScreen('screen-save');
  } catch (error) {
    showError('category-error', error.message);
  } finally {
    button.disabled = false;
  }
});

// ---------- 저장하기 ----------
document.getElementById('btn-save').addEventListener('click', async (e) => {
  const selected = chipRow.querySelector('.chip-selected');
  const memo = document.getElementById('memo-input').value.trim();

  const button = e.currentTarget;
  button.disabled = true;
  showError('save-error', '');
  try {
    await authRequest('/api/bookmarks', {
      method: 'POST',
      body: {
        url: currentTab.url,
        memo: memo || null,
        categoryId: selected && selected.dataset.categoryId ? Number(selected.dataset.categoryId) : null,
        saveSource: 'EXTENSION',
        title: currentTab.title || null,
      },
    });
    showScreen('screen-complete');
    // 3초 후 자동 종료 (디자인 명시사항 반영)
    setTimeout(() => window.close(), 3000);
  } catch (error) {
    showError('save-error', error.message);
  } finally {
    button.disabled = false;
  }
});

// ---------- 시작 ----------
// 저장된 토큰이 있으면 바로 저장 화면, 없으면 로그인 화면
storageGet(['accessToken', 'refreshToken']).then(({ accessToken, refreshToken }) => {
  if (accessToken || refreshToken) enterSaveScreen();
});

// 미리보기용: popup.html#save / #category / #complete 로 해당 화면 바로 열기
const previewScreen = location.hash.slice(1);
if (previewScreen && document.getElementById('screen-' + previewScreen)) {
  showScreen('screen-' + previewScreen);
}
