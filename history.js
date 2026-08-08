// ---------------- history (Supabase-backed) ----------------
// Sessions are stored per-user in the `sessions` table (see README for the
// SQL / RLS policies). Since generating a quiz already requires login, every
// saved session is guaranteed to have a user attached.

function mapRow(row){
  return {
    id: row.id,
    topic: row.topic,
    timestamp: new Date(row.created_at).getTime(),
    total: row.total,
    correctCount: row.correct_count,
    blindspots: row.blindspots,
    answers: row.answers
  };
}

async function refreshHistory(){
  if(!state.user){
    state.history = [];
    return;
  }
  state.historyLoading = true;
  try{
    const { data, error } = await supabaseClient
      .from('sessions')
      .select('id, topic, total, correct_count, blindspots, answers, created_at')
      .order('created_at', { ascending: false });
    if(error) throw error;
    state.history = (data || []).map(mapRow);
  }catch(e){
    console.error('Failed to load history:', e.message);
    state.history = [];
  }
  state.historyLoading = false;
}

async function saveSession(){
  const total = state.answers.length;
  const correctCount = state.answers.filter(a => a.correct).length;
  const blindspots = state.answers.filter(a => !a.correct && a.confidence >= 4).length;
  const topic = state.source.length > 48 ? state.source.slice(0,48) + '\u2026' : state.source;

  try{
    const { error } = await supabaseClient.from('sessions').insert({
      user_id: state.user.id,
      topic,
      total,
      correct_count: correctCount,
      blindspots,
      answers: state.answers
    });
    if(error) throw error;
  }catch(e){
    console.error('Failed to save session:', e.message);
  }
  await refreshHistory();
}

async function clearHistory(){
  if(!state.user) return;
  try{
    const { error } = await supabaseClient.from('sessions').delete().eq('user_id', state.user.id);
    if(error) throw error;
  }catch(e){
    console.error('Failed to clear history:', e.message);
  }
  await refreshHistory();
  renderSidebar();
}

function getViewingSession(){
  return state.history.find(h => h.id === state.viewingSessionId);
}

function renderSidebar(){
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('history-overlay');
  const panel = document.getElementById('history-panel');
  if(!toggle || !overlay || !panel) return;

  const hideOnScreens = ['home', 'login', 'signup', 'forgot'];
  const onHiddenScreen = hideOnScreens.includes(state.screen);
  toggle.style.display = onHiddenScreen ? 'none' : 'flex';
  if(onHiddenScreen){
    overlay.classList.remove('open');
    panel.classList.remove('open');
    toggle.classList.remove('shifted');
    document.body.classList.remove('sidebar-open');
    return;
  }

  toggle.classList.toggle('shifted', state.sidebarOpen);
  overlay.classList.toggle('open', state.sidebarOpen);
  panel.classList.toggle('open', state.sidebarOpen);
  document.body.classList.toggle('sidebar-open', state.sidebarOpen);

  panel.innerHTML = `
    <div class="hist-head">History</div>
    <div class="hist-sub">${state.historyLoading ? 'Loading\u2026' : `${state.history.length} saved session${state.history.length===1?'':'s'}`}</div>
    <button class="hist-new" id="hist-new-btn">+ New session</button>
    <div class="hist-list">
      ${state.historyLoading
        ? `<div class="hist-empty">Loading your saved sessions\u2026</div>`
        : state.history.length === 0
          ? `<div class="hist-empty">Finish a quiz and it'll show up here, so you can revisit past blind spots.</div>`
          : state.history.map(h => `
            <button class="hist-item" data-session="${h.id}">
              <div class="h-topic">${h.topic || 'Untitled session'}</div>
              <div class="h-meta">
                <span>${h.correctCount}/${h.total} correct</span>
                <span class="${h.blindspots ? 'h-flag' : ''}">${h.blindspots} blind spot${h.blindspots===1?'':'s'}</span>
              </div>
            </button>
          `).join('')
      }
    </div>
    ${!state.historyLoading && state.history.length ? `<button class="hist-clear" id="clear-history-btn">Clear history</button>` : ''}
  `;

  toggle.onclick = () => { state.sidebarOpen = !state.sidebarOpen; renderSidebar(); };
  overlay.onclick = () => { state.sidebarOpen = false; renderSidebar(); };

  const newBtn = document.getElementById('hist-new-btn');
  if(newBtn) newBtn.onclick = () => {
    Object.assign(state, {
      source:'', count:6, attachments:[], questions:[], current:0,
      answers:[], selectedOpt:null, selectedConf:null, revealed:false, error:null,
      sidebarOpen: window.innerWidth > 900
    });
    requireAuthThen('setup');
    render();
  };

  panel.querySelectorAll('.hist-item').forEach(btn => {
    btn.onclick = () => {
      state.viewingSessionId = btn.dataset.session;
      state.screen = 'session';
      state.sidebarOpen = window.innerWidth > 900;
      render();
    };
  });
  const clearBtn = document.getElementById('clear-history-btn');
  if(clearBtn) clearBtn.onclick = () => { clearHistory(); };
}
