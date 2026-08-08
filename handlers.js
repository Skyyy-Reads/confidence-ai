// ---------------- handlers ----------------
function attachHandlers(){
  const logoHome = document.getElementById('logo-home');
  if(logoHome) logoHome.onclick = () => { state.screen = 'home'; render(); };

  const navOpen = document.getElementById('nav-open');
  if(navOpen) navOpen.onclick = () => { requireAuthThen('setup'); render(); };

  const navLogin = document.getElementById('nav-login');
  if(navLogin) navLogin.onclick = () => { state.authError = null; state.screen = 'login'; render(); };

  const navSignup = document.getElementById('nav-signup');
  if(navSignup) navSignup.onclick = () => { state.authError = null; state.screen = 'signup'; render(); };

  const navLogout = document.getElementById('nav-logout');
  if(navLogout) navLogout.onclick = () => { signOut(); };

  const heroCta = document.getElementById('hero-cta');
  if(heroCta) heroCta.onclick = () => { requireAuthThen('setup'); render(); };

  // ---- auth forms ----
  const loginForm = document.getElementById('login-form');
  if(loginForm) loginForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    signIn(email, password);
  };

  const signupForm = document.getElementById('signup-form');
  if(signupForm) signupForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-password-confirm').value;
    if(password !== confirm){
      state.authError = "Passwords don't match.";
      render();
      return;
    }
    signUp(email, password);
  };

  const goSignup = document.getElementById('go-signup');
  if(goSignup) goSignup.onclick = () => { state.authError = null; state.screen = 'signup'; render(); };

  const goLogin = document.getElementById('go-login');
  if(goLogin) goLogin.onclick = () => { state.authError = null; state.screen = 'login'; render(); };

  const goForgot = document.getElementById('go-forgot');
  if(goForgot) goForgot.onclick = () => { state.authError = null; state.resetSentMessage = null; state.screen = 'forgot'; render(); };

  const goLoginFromForgot = document.getElementById('go-login-from-forgot');
  if(goLoginFromForgot) goLoginFromForgot.onclick = () => { state.authError = null; state.screen = 'login'; render(); };

  const forgotForm = document.getElementById('forgot-form');
  if(forgotForm) forgotForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    requestPasswordReset(email);
  };

  const updatePasswordForm = document.getElementById('update-password-form');
  if(updatePasswordForm) updatePasswordForm.onsubmit = (e) => {
    e.preventDefault();
    const password = document.getElementById('update-password').value;
    const confirm = document.getElementById('update-password-confirm').value;
    if(password !== confirm){
      state.authError = "Passwords don't match.";
      render();
      return;
    }
    updatePassword(password);
  };

  // ---- quiz setup ----
  const startBtn = document.getElementById('start-btn');
  if(startBtn) startBtn.onclick = async () => {
    state.source = document.getElementById('source').value.trim();
    state.count = parseInt(document.getElementById('count').value, 10);
    if(!state.source && state.attachments.length === 0){
      state.error = 'Give me something to work with \u2014 notes, a topic, or a photo of your notes.';
      render();
      return;
    }
    state.error = null;
    state.screen = 'loading';
    render();
    try{
      const qs = await generateQuestions(state.source, state.count, state.attachments);
      state.questions = qs;
      state.current = 0;
      state.answers = [];
      state.selectedOpt = null;
      state.selectedConf = null;
      state.revealed = false;
      state.screen = 'quiz';
    }catch(e){
      state.screen = 'setup';
      state.error = e.message || 'Something went wrong generating questions. Try again.';
    }
    render();
  };

  const cameraInput = document.getElementById('camera-input');
  if(cameraInput) cameraInput.onchange = (e) => { handleFiles(e.target.files); };

  const fileInput = document.getElementById('file-input');
  if(fileInput) fileInput.onchange = (e) => { handleFiles(e.target.files); };

  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = () => {
      state.attachments = state.attachments.filter(a => a.id !== btn.dataset.remove);
      render();
    };
  });

  document.querySelectorAll('.opt').forEach(btn => {
    btn.onclick = () => { if(!state.revealed){ state.selectedOpt = parseInt(btn.dataset.opt,10); render(); } };
  });
  document.querySelectorAll('.conf-btn').forEach(btn => {
    btn.onclick = () => { if(!state.revealed){ state.selectedConf = parseInt(btn.dataset.conf,10); render(); } };
  });

  const revealBtn = document.getElementById('reveal-btn');
  if(revealBtn) revealBtn.onclick = () => {
    const q = state.questions[state.current];
    state.revealed = true;
    state.answers.push({
      question: q.question,
      confidence: state.selectedConf,
      correct: state.selectedOpt === q.correctIndex,
      correctText: q.options[q.correctIndex]
    });
    render();
  };

  const nextBtn = document.getElementById('next-btn');
  if(nextBtn) nextBtn.onclick = async () => {
    if(state.current === state.questions.length - 1){
      state.screen = 'results';
      render();
      await saveSession(); // persists to Supabase, then refreshes the sidebar list
      renderSidebar();
    } else {
      state.current += 1;
      state.selectedOpt = null;
      state.selectedConf = null;
      state.revealed = false;
      render();
    }
  };

  const backHomeBtn = document.getElementById('back-home-btn');
  if(backHomeBtn) backHomeBtn.onclick = () => { state.screen = 'home'; render(); };

  const restartBtn = document.getElementById('restart-btn');
  if(restartBtn) restartBtn.onclick = () => {
    Object.assign(state, {
      source:'', count:6, attachments:[], questions:[], current:0,
      answers:[], selectedOpt:null, selectedConf:null, revealed:false, error:null
    });
    requireAuthThen('setup');
    render();
  };
}

// ---------------- attachments (camera / scan) ----------------
function handleFiles(fileList){
  // preserve in-progress typing before we re-render for each file
  const srcEl = document.getElementById('source');
  if(srcEl) state.source = srcEl.value;
  const countEl = document.getElementById('count');
  if(countEl) state.count = parseInt(countEl.value, 10);

  const files = Array.from(fileList || []).slice(0, MAX_ATTACHMENTS - state.attachments.length);
  if(files.length === 0) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      state.attachments.push({
        id: 'a' + Date.now() + Math.random().toString(36).slice(2, 7),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        dataUrl: reader.result
      });
      render();
    };
    reader.readAsDataURL(file);
  });
}
