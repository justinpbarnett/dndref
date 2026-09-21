import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, useWindowDimensions } from "react-native";

import type { CardState } from "../context/session-types";
import type { CardSize } from "../context/ui-settings";
import { computeReferenceCardLayout, type ReferenceCardPosition } from "../reference-card-layout";

type AnimPair = { left: Animated.Value; top: Animated.Value };

const SPRING_CONFIG = { friction: 22, tension: 55, useNativeDriver: false } as const;

export function useCardGridLayout(cards: CardState[], cardSize: CardSize) {
  const { width, height: winHeight } = useWindowDimensions();
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  const animRef = useRef<Record<string, AnimPair>>({});
  const prevPos = useRef<Record<string, ReferenceCardPosition>>({});

  const {
    cardWidth,
    positions: targets,
    totalHeight,
  } = useMemo(
    () =>
      computeReferenceCardLayout({
        cards,
        measuredHeights: cardHeights,
        viewport: { width, height: winHeight },
        cardSize,
      }),
    [cards, cardHeights, width, winHeight, cardSize],
  );

  for (const [id, pos] of Object.entries(targets)) {
    if (!animRef.current[id]) {
      animRef.current[id] = {
        left: new Animated.Value(pos.x),
        top: new Animated.Value(pos.y),
      };
    }
  }
  for (const id of Object.keys(animRef.current)) {
    if (!targets[id]) delete animRef.current[id];
  }

  useEffect(() => {
    const springs: Animated.CompositeAnimation[] = [];

    for (const card of cards) {
      const { instanceId } = card;
      const target = targets[instanceId];
      const anim = animRef.current[instanceId];
      if (!target || !anim) continue;

      const prev = prevPos.current[instanceId];
      if (prev && (prev.x !== target.x || prev.y !== target.y)) {
        springs.push(
          Animated.parallel([
            Animated.spring(anim.left, { toValue: target.x, ...SPRING_CONFIG }),
            Animated.spring(anim.top, { toValue: target.y, ...SPRING_CONFIG }),
          ]),
        );
      }
    }

    prevPos.current = Object.fromEntries(Object.entries(targets).map(([id, pos]) => [id, { ...pos }]));

    if (springs.length > 0) Animated.parallel(springs).start();
  }, [targets, cards]);

  useEffect(() => {
    setCardHeights((prev) => {
      const activeIds = new Set(cards.map((card) => card.instanceId));
      const pruned = Object.fromEntries(Object.entries(prev).filter(([id]) => activeIds.has(id)));
      return Object.keys(pruned).length === Object.keys(prev).length ? prev : pruned;
    });
  }, [cards]);

  const onCardLayout = useCallback(
    (instanceId: string, height: number) =>
      setCardHeights((prev) => (prev[instanceId] === height ? prev : { ...prev, [instanceId]: height })),
    [],
  );

  return { animRef, cardWidth, onCardLayout, totalHeight };
}
