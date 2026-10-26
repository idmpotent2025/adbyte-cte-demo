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

// Proxy defers Auth0Client construction until first method call — env vars must be set by then
export const auth0 = new Proxy({} as Auth0Client, {
  get(_: Auth0Client, prop: string | symbol) {
    return (getAuth0Client() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
