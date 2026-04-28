export class SingleFlight {
  private current: Promise<void> | null = null;

  run(create: () => Promise<void>): Promise<void> {
    if (this.current) return this.current;
    const command = create();
    this.current = command;
    command.then(
      () => this.clear(command),
      () => this.clear(command),
    );
    return command;
  }

  reset(): void {
    this.current = null;
  }

  private clear(command: Promise<void>): void {
    if (this.current === command) this.current = null;
  }
}
