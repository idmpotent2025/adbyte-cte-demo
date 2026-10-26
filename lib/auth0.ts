import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0Client: Auth0Client | null = null;

function getAuth0Client(): Auth0Client {
  if (!_auth0Client) {
    _auth0Client = new Auth0Client({
      authorizationParameters: {
        scope: 'openid profile email manageAds',
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

// Proxy defers Auth0Client construction until first method call.
// Methods are bound to the real instance so private fields remain accessible.
export const auth0 = new Proxy({} as Auth0Client, {
  get(_: Auth0Client, prop: string | symbol) {
    const client = getAuth0Client();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(client) : value;
  },
});
