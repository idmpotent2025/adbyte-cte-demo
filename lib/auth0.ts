import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0Client: Auth0Client | null = null;

function getAuth0Client(): Auth0Client {
  if (!_auth0Client) {
    _auth0Client = new Auth0Client({
      authorizationParameters: {
        scope: 'openid profile email',
        audience: process.env.AUTH0_AUDIENCE,
      },
      routes: {
        login: '/api/auth/login',
        callback: '/api/auth/callback',
        logout: '/api/auth/logout',
      },
    });
  }
  return _auth0Client;
}

export const auth0 = getAuth0Client();
