export async function GET() {
  const encoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      const log = (msg: string) => {
        if (isClosed || !controllerRef || controllerRef.desiredSize === null) return;
        try {
          controllerRef.enqueue(encoder.encode(`data: ${msg}\n\n`));
        } catch (err: any) {
          if (!`${err?.message}`.includes('closed')) {
            console.error('Stream write failed:', err);
          }
        }
      };

      const originalLog = console.log;
      console.log = (...args) => {
        const msg = args.join(' ');
        originalLog(...args);
        log(msg);
      };

      const interval = setInterval(() => log('[💡 heartbeat]'), 5000);

    
    },

    cancel() {
      isClosed = true;
      controllerRef = null;
      console.log('[🔌 Stream cancelled]');
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  });
}
