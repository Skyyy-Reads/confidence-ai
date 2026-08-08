// ---------------- state ----------------
const MAX_ATTACHMENTS = 6;

const state = {
  screen: 'home', // home | login | signup | forgot | update-password | setup | loading | quiz | results | session
  user: null,          // set by auth.js once a session is known
  authChecked: false,  // true once the initial session check has resolved
  authError: null,
  authLoading: false,
  signupConfirmMessage: null,
  resetSentMessage: null,
  redirectAfterAuth: null, // screen to jump to once login/signup succeeds
  source: '',
  count: 6,
  attachments: [],
  questions: [],
  current: 0,
  answers: [],
  selectedOpt: null,
  selectedConf: null,
  revealed: false,
  error: null,
  sidebarOpen: false,
  history: [],           // loaded from Supabase once a user is known, see history.js
  historyLoading: false,
  viewingSessionId: null
};
