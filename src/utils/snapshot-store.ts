export type SnapshotListener<S> = (snapshot: S) => void;

export class SnapshotStore<S> {
  private readonly listeners = new Set<SnapshotListener<S>>();

  constructor(protected snapshot: S) {}

  getSnapshot = (): S => this.snapshot;

  subscribe(listener: SnapshotListener<S>): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  protected updateSnapshot = (patch: Partial<S>): void => this.replaceSnapshot({ ...this.snapshot, ...patch });

  protected replaceSnapshot = (snapshot: S): void =>
    void ((this.snapshot = snapshot), this.listeners.forEach((listener) => listener(this.snapshot)));

  protected clearSnapshotListeners = (): void => this.listeners.clear();
}
