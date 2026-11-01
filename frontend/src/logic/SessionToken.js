const SESSION_TOKEN_KEY = "homekeeper_session_token";

export function readSessionToken() {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export function writeSessionToken(token) {
  if (token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }

  clearSessionToken();
}

export function subscribeSessionToken(getToken, { isLoaded, isSignedIn }, onTokenReady) {
  if (!isLoaded) {
    return () => {};
  }

  if (!isSignedIn) {
    clearSessionToken();
    onTokenReady(null);
    return () => {};
  }

  let isActive = true;

  getToken()
    .then((token) => {
      if (!isActive) {
        return;
      }

      writeSessionToken(token);
      onTokenReady(token);
    })
    .catch(() => {
      if (!isActive) {
        return;
      }

      clearSessionToken();
      onTokenReady(null);
    });

  return () => {
    isActive = false;
  };
}
