const supabaseUrl = window.__ENV__?.SUPABASE_URL;
const supabaseAnonKey = window.__ENV__?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration in window.__ENV__");
}

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

async function getAccessToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

async function signIn(email, password, remember = true) {
  if (!remember) {
    sessionStorage.setItem("gaffer_no_persist", "1");
  } else {
    sessionStorage.removeItem("gaffer_no_persist");
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw error;
  }
}

async function getCurrentSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function onAuthStateChange(callback) {
  const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}

async function signInWithGoogle() {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    throw error;
  }
  return data;
}

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
}

async function resetPassword(email) {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) {
    throw error;
  }
  return data;
}

window.getAccessToken = getAccessToken;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentSession = getCurrentSession;
window.onAuthStateChange = onAuthStateChange;
window.signInWithGoogle = signInWithGoogle;
window.signUp = signUp;
window.resetPassword = resetPassword;
window.supabaseAuth = supabaseClient;
