import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const isDemoMode =
  process.env.DEMO_MODE === 'true' ||
  !process.env.AUTH0_DOMAIN ||
  !process.env.AUTH0_CLIENT_ID ||
  !process.env.AUTH0_SECRET;

let _auth0Client: Auth0Client | null = null;

function getAuth0Client(): Auth0Client {
  if (!_auth0Client) {
    _auth0Client = new Auth0Client({
      authorizationParameters: {
        scope: 'openid profile email',
        audience: process.env.AUTH0_AUDIENCE,
      },
    });
  }
  return _auth0Client;
}

export const auth0 = isDemoMode ? null : getAuth0Client();

export async function getSession() {
  if (isDemoMode) return null;
  return getAuth0Client().getSession();
}

export async function getAccessToken() {
  if (isDemoMode) return null;
  return getAuth0Client().getAccessToken();
}
