import { isDefined } from 'twenty-shared/utils';
import { type AuthTokenPair } from '~/generated/graphql';
import { cookieStorage } from '~/utils/cookie-storage';
import { isValidAuthTokenPair } from './isValidAuthTokenPair';

export const getTokenPair = (): AuthTokenPair | undefined => {
  // Primary source: cookie (works across tabs, honors secure/sameSite)
  const stringTokenPair =
    cookieStorage.getItem('tokenPair') ??
    // Fallbacks: storage copies to survive cases where cookies are blocked/cleared
    window.localStorage.getItem('tokenPair') ??
    window.sessionStorage.getItem('tokenPair');

  if (!isDefined(stringTokenPair)) {
    // eslint-disable-next-line no-console
    console.log('tokenPair is undefined');

    return undefined;
  }

  try {
    const parsedTokenPair = JSON.parse(stringTokenPair);

    if (!isValidAuthTokenPair(parsedTokenPair)) {
      cookieStorage.removeItem('tokenPair');
      return undefined;
    }

    return parsedTokenPair;
  } catch {
    cookieStorage.removeItem('tokenPair');
    return undefined;
  }
};
