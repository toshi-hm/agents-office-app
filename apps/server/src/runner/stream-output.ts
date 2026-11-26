export async function consumeProcessStream(
  stream: ReadableStream<Uint8Array>, signal: AbortSignal, onText: (value: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      onText(decoder.decode(chunk.value, { stream: true }));
    }
    onText(decoder.decode());
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
