// ---------------- auth ----------------
// Thin wrapper around Supabase Auth. Keeps state.user (and the per-user
// history list) in sync, and re-renders whenever auth state changes
// (login, logout, token refresh, password recovery).

async function initAuth(){
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session ? data.session.user : null;
  state.authChecked = true;
  if(state.user) await refreshHistory();

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
      // User followed the reset-password link from their email.
      state.screen = 'update-password';
      render();
      return;
    }
    const nextUser = session ? session.user : null;
    const userChanged = (nextUser && nextUser.id) !== (state.user && state.user.id);
    state.user = nextUser;
    if(userChanged) await refreshHistory();
    render();
  });
}

async function signUp(email, password){
  state.authLoading = true;
  state.authError = null;
  render();
  try{
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if(error) throw error;
    state.authLoading = false;
    if(!data.session){
      // Email confirmation is on for this project — no session yet.
      state.authError = null;
      state.screen = 'login';
      state.signupConfirmMessage = 'Check your inbox to confirm your email, then log in.';
    } else {
      state.user = data.session.user;
      await refreshHistory();
      goToPostAuthScreen();
    }
  }catch(e){
    state.authLoading = false;
    state.authError = e.message || 'Could not sign up. Try again.';
  }
  render();
}

async function signIn(email, password){
  state.authLoading = true;
  state.authError = null;
  render();
  try{
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error) throw error;
    state.user = data.session.user;
    state.authLoading = false;
    await refreshHistory();
    goToPostAuthScreen();
  }catch(e){
    state.authLoading = false;
    state.authError = e.message || 'Could not log in. Check your details and try again.';
  }
  render();
}

async function signOut(){
  await supabaseClient.auth.signOut();
  state.user = null;
  state.history = [];
  state.screen = 'home';
  render();
}

async function requestPasswordReset(email){
  state.authLoading = true;
  state.authError = null;
  state.resetSentMessage = null;
  render();
  try{
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.split('#')[0]
    });
    if(error) throw error;
    state.resetSentMessage = 'If that email has an account, a reset link is on its way.';
  }catch(e){
    state.authError = e.message || 'Could not send reset email. Try again.';
  }
  state.authLoading = false;
  render();
}

async function updatePassword(newPassword){
  state.authLoading = true;
  state.authError = null;
  render();
  try{
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if(error) throw error;
    state.authLoading = false;
    state.screen = 'home';
    render();
  }catch(e){
    state.authLoading = false;
    state.authError = e.message || 'Could not update password. Try again.';
    render();
  }
}

function goToPostAuthScreen(){
  state.screen = state.redirectAfterAuth || 'setup';
  state.redirectAfterAuth = null;
  state.authError = null;
}

function requireAuthThen(nextScreen){
  if(state.user){
    state.screen = nextScreen;
  } else {
    state.redirectAfterAuth = nextScreen;
    state.screen = 'login';
  }
}
