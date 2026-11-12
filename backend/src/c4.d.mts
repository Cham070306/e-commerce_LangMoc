import type { RequestHandler, Request } from 'express';
import type { Pool } from 'pg';

export interface C4Identity {
  id: string;
}

export interface C4HandlerOptions {
  pool: Pool;
  authenticate: (request: Request) => Promise<C4Identity | null>;
  quoteSecret: string;
  allowedOrigins?: string[];
  onError?: (error: unknown) => void;
}

export function createC4Handler(options: C4HandlerOptions): RequestHandler;
