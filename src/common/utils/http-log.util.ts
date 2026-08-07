import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

const NOISY_ROUTE_PATHS = new Set(['/favicon.ico', '/robots.txt', '/apple-touch-icon.png']);
const SLOW_HTTP_REQUEST_THRESHOLD_MS = 1000;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const requestStartTimes = new WeakMap<IncomingMessage, number>();

interface AuthenticatedRequest extends IncomingMessage {
  user?: {
    id?: string;
  };
}

/**
 * Generates a trace-safe request ID, preserving a valid upstream correlation ID
 * when one is supplied by a trusted gateway.
 */
export function createRequestId(request: IncomingMessage, response: ServerResponse): string {
  const incomingRequestId = request.headers['x-request-id'];
  const requestId =
    typeof incomingRequestId === 'string' && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  requestStartTimes.set(request, Date.now());
  response.setHeader('X-Request-Id', requestId);

  return requestId;
}

export function isNoisyRoute(request: IncomingMessage): boolean {
  return NOISY_ROUTE_PATHS.has(getRequestPath(request));
}

export function getHttpLogLevel(
  request: IncomingMessage,
  response: ServerResponse,
  error?: Error,
): 'info' | 'warn' | 'error' {
  if (error || response.statusCode >= 500) {
    return 'error';
  }

  if (response.statusCode >= 400 || getElapsedTime(request) > SLOW_HTTP_REQUEST_THRESHOLD_MS) {
    return 'warn';
  }

  return 'info';
}

export function getHttpLogDetails(
  request: IncomingMessage,
  response: ServerResponse,
  responseTime: number,
): Record<string, string | number> {
  const authenticatedRequest = request as AuthenticatedRequest;
  const userId = authenticatedRequest.user?.id;

  return {
    method: request.method ?? 'UNKNOWN',
    path: getRequestPath(request),
    statusCode: response.statusCode,
    responseTime,
    ip: request.socket.remoteAddress ?? 'unknown',
    ...(userId && { userId }),
  };
}

export function getRequestId(request: IncomingMessage): string {
  return typeof request.id === 'string' || typeof request.id === 'number'
    ? String(request.id)
    : 'unknown';
}

export function getRequestElapsedTime(request: IncomingMessage): number {
  return getElapsedTime(request);
}

export function formatHttpLogMessage(
  request: IncomingMessage,
  response: ServerResponse,
  responseTime: number,
): string {
  return `[${getRequestId(request)}] ${request.method ?? 'UNKNOWN'} ${getRequestPath(request)} ${response.statusCode} ${responseTime}ms`;
}

function getRequestPath(request: IncomingMessage): string {
  return request.url?.split('?')[0] || '/';
}

function getElapsedTime(request: IncomingMessage): number {
  const startTime = requestStartTimes.get(request);
  return startTime ? Date.now() - startTime : 0;
}
