export class AsyncOperationQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.catch(() => undefined).then(operation);
    this.tail = next.catch(() => undefined);
    return next;
  }

  wait(): Promise<void> {
    return this.tail.catch(() => undefined).then(() => undefined);
  }

  reset(): void {
    this.tail = Promise.resolve();
  }
}
