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

async function signIn(emailOrUsername, password, remember = true) {
  if (!remember) {
    sessionStorage.setItem("gaffer_no_persist", "1");
  } else {
    sessionStorage.removeItem("gaffer_no_persist");
  }

  let email = emailOrUsername;
  if (!emailOrUsername.includes("@")) {
    const base = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
      ? "http://127.0.0.1:8000/api"
      : "/api";
    const res = await fetch(`${base}/lookup-username?username=${encodeURIComponent(emailOrUsername)}`);
    if (!res.ok) {
      throw new Error("Username not found");
    }
    const data = await res.json();
    email = data.email;
    if (!email) throw new Error("Username not found");
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

async function signUp(email, password, username) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
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
