import type { OfficeSnapshot, OfficeSseEvent } from '@agents-office-app/domain';

const encoder = new TextEncoder();
const eventData = (event: OfficeSseEvent) => encoder.encode('data: ' + JSON.stringify(event) + '\n\n');

export function createSseHub() {
  const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

  function publish(event: OfficeSseEvent) {
    if (!subscribers.size) return;
    const data = eventData(event);
    for (const subscriber of subscribers) {
      // Disconnect stalled clients so reconnecting can load the current snapshot.
      if ((subscriber.desiredSize ?? 0) < -256) {
        subscribers.delete(subscriber);
        subscriber.error(new Error('SSE client fell behind'));
      } else {
        subscriber.enqueue(data);
      }
    }
  }

  function events(headers: Headers, snapshot: () => OfficeSnapshot) {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(subscriber) {
        controller = subscriber;
        subscriber.enqueue(eventData({ type: 'snapshot', snapshot: snapshot() }));
        subscribers.add(subscriber);
      },
      cancel() {
        subscribers.delete(controller);
      },
    });
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    return new Response(stream, { headers });
  }

  function close() {
    for (const subscriber of subscribers) subscriber.close();
    subscribers.clear();
  }

  return { publish, events, close, hasSubscribers: () => subscribers.size > 0 };
}
