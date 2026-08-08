// Screens that belong to the "ask questions" flow — generating and taking a
// quiz requires a logged-in user. Enforced here, not just at the buttons that
// lead here, so there's a single place this rule can't be bypassed from.
const QUESTION_FLOW_SCREENS = ['setup', 'loading', 'quiz', 'results'];

function render(){
  const root = document.getElementById('root');

  if(QUESTION_FLOW_SCREENS.includes(state.screen) && !state.user){
    state.redirectAfterAuth = state.screen;
    state.screen = 'login';
  }

  const navHtml = renderNav();

  if(state.screen === 'home') root.innerHTML = navHtml + renderHome();
  else if(state.screen === 'login') root.innerHTML = navHtml + renderAppShell(renderLogin());
  else if(state.screen === 'signup') root.innerHTML = navHtml + renderAppShell(renderSignup());
  else if(state.screen === 'forgot') root.innerHTML = navHtml + renderAppShell(renderForgotPassword());
  else if(state.screen === 'update-password') root.innerHTML = navHtml + renderAppShell(renderUpdatePassword());
  else if(state.screen === 'setup') root.innerHTML = navHtml + renderAppShell(renderSetup());
  else if(state.screen === 'loading') root.innerHTML = navHtml + renderAppShell(renderLoading());
  else if(state.screen === 'quiz') root.innerHTML = navHtml + renderAppShell(renderQuiz());
  else if(state.screen === 'results') root.innerHTML = navHtml + renderAppShell(renderResults(state.answers, false));
  else if(state.screen === 'session') root.innerHTML = navHtml + renderAppShell(renderSessionView());

  document.body.classList.toggle('is-home', state.screen === 'home');
  if(state.screen === 'home') state.sidebarOpen = false;

  attachHandlers();
  renderSidebar();
  if(state.screen === 'results' || state.screen === 'session') drawChart(state.screen === 'session' ? getViewingSession().answers : state.answers);
}
