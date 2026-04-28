import { dismissCard, pinCard, unpinCard } from "../card-stack";
import type { CardState } from "../session-types";
import type { SessionRuntimeSnapshotPatch } from "./runtime-types";

type RuntimeCardActionsOptions = {
  getCards: () => CardState[];
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
};

export class RuntimeCardActions {
  constructor(private readonly options: RuntimeCardActionsOptions) {}

  pin = (instanceId: string): void => this.updateCards(pinCard(this.options.getCards(), instanceId));
  unpin = (instanceId: string): void => this.updateCards(unpinCard(this.options.getCards(), instanceId));
  dismiss = (instanceId: string): void => this.updateCards(dismissCard(this.options.getCards(), instanceId));

  private updateCards(cards: CardState[]): void {
    if (cards !== this.options.getCards()) this.options.updateSnapshot({ cards });
  }
}
