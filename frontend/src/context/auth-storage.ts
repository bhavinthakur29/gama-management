export function clearStoredAuth() {
  localStorage.removeItem('gama_token');
  localStorage.removeItem('gama_refresh_token');
  localStorage.removeItem('gama_token_expires_at');
  localStorage.removeItem('gama_auth_user_id');
}

export function getInitialAuthState() {
  const tokenExpiresAt = localStorage.getItem('gama_token_expires_at');
  const tokenExpired = tokenExpiresAt ? Date.parse(tokenExpiresAt) <= Date.now() : false;

  if (tokenExpired) {
    clearStoredAuth();
    return {
      token: null,
      userId: null,
    };
  }

  return {
    token: localStorage.getItem('gama_token'),
    userId: localStorage.getItem('gama_auth_user_id'),
  };
}
