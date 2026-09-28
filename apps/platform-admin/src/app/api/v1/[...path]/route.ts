import { proxyDemoPlatformApi } from '../../../../lib/demo-bff.server';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: { readonly path?: readonly string[] } };

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const path = context.params.path?.join('/') ?? '';
  return proxyDemoPlatformApi(request, path);
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}
