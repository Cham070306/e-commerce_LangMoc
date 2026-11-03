/** Serialize writes per product; checkout can wait until every pending write settles. */
export class CartUpdates {
  private pending = new Map<string, Promise<unknown>>();

  run<T>(id: string, write: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(id) || Promise.resolve();
    const next = previous.catch(() => undefined).then(write);
    this.pending.set(id, next);
    const clear = () => { if (this.pending.get(id) === next) this.pending.delete(id); };
    next.then(clear, clear);
    return next;
  }

  has(id: string): boolean { return this.pending.has(id); }

  async wait(): Promise<void> {
    while (this.pending.size) await Promise.all([...this.pending.values()]);
  }
}
