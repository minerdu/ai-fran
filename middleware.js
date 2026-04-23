import { NextResponse } from 'next/server';

export function middleware(request) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (pathname === '/fran/settings' || pathname === '/settings') {
    const tab = nextUrl.searchParams.get('tab');

    if (tab === 'report' || tab === 'reports') {
      return NextResponse.redirect(new URL('/fran/settings/report', request.url));
    }

    if (tab === 'redline' || tab === 'redLineRules') {
      return NextResponse.redirect(new URL('/fran/settings/redline', request.url));
    }

    if (tab) {
      const target = new URL('/fran/me', request.url);
      target.searchParams.set('tab', tab);
      return NextResponse.redirect(target);
    }

    return NextResponse.redirect(new URL('/fran/me', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/settings', '/fran/settings'],
};
