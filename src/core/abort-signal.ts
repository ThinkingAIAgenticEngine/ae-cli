/** Compose a caller cancellation with a bounded request on every supported Node 20 release. */
export function boundedRequestSignal(parent: AbortSignal | undefined, milliseconds: number): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, milliseconds);
  timer.unref();
  parent?.addEventListener('abort', abort, { once: true });
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }, { once: true });
  if (parent?.aborted) abort();
  return controller.signal;
}
