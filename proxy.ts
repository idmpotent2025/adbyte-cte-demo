export async function proxy(request: Request) {
  if (process.env.DEMO_MODE === 'true' || !process.env.AUTH0_DOMAIN) {
    return;
  }
  const { auth0 } = await import('./lib/auth0');
  return await auth0!.middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
