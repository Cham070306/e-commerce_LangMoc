import { mockApi } from '../../mock/server';

let sessionCookie = '';

export function requestBrowserMock(method: string, path: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => reject(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });

    const request = {
      method,
      url: '/api/v1' + path,
      headers: { ...Object.fromEntries(new Headers(headers)), cookie: sessionCookie },
      on(event: string, callback: (chunk?: string) => void) {
        if (event === 'data' && body !== undefined) callback(JSON.stringify(body));
        if (event === 'end') callback();
      }
    };
    const response = {
      statusCode: 200,
      setHeader(name: string, value: string) {
        if (name.toLowerCase() === 'set-cookie') sessionCookie = value.split(';', 1)[0];
      },
      end(payload?: string) {
        signal?.removeEventListener('abort', abort);
        resolve(new Response(payload, { status: this.statusCode }));
      }
    };
    void mockApi(request, response, () => response.end()).catch(error => {
      signal?.removeEventListener('abort', abort);
      reject(error);
    });
  });
}
