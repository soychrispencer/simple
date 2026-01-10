import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Minimal proxy hook that simply lets the request continue.
 * Extend this to add auth, rewrites or other cross-cutting logic later.
 */
export default function proxy(request: NextRequest) {
  void request;
  return NextResponse.next();
}
