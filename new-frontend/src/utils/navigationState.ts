export const HAS_VISITED_BEFORE_KEY = 'resqnet-has-visited-before';
export const HAS_LOGGED_IN_BEFORE_KEY = 'resqnet-has-logged-in-before';

const getFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const setFlag = (key: string): void => {
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // Ignore storage failures and rely on current-session state.
  }
};

export const hasVisitedBefore = (): boolean => getFlag(HAS_VISITED_BEFORE_KEY);

export const hasLoggedInBefore = (): boolean => getFlag(HAS_LOGGED_IN_BEFORE_KEY);

export const markVisitedBefore = (): void => setFlag(HAS_VISITED_BEFORE_KEY);

export const markLoggedInBefore = (): void => setFlag(HAS_LOGGED_IN_BEFORE_KEY);
