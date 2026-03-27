import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CARD_SIZE_CONFIGS, useColors, useUISettings } from '../context/ui-settings';
import { CardState, useSession } from '../context/session';
import { Colors, F } from '../theme';
import { EntityCard } from './EntityCard';

const GRID_PAD = 5;
const CARD_MARGIN = 5;

interface CardPos { x: number; y: number }
interface AnimPair { left: Animated.Value; top: Animated.Value }

function computePositions(
  cards: CardState[],
  heights: Record<string, number>,
  columns: number,
  cardWidth: number,
): { positions: Record<string, CardPos>; totalHeight: number } {
  const colWidth = cardWidth + 2 * CARD_MARGIN;

  const rowHeights: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    const row = Math.floor(i / columns);
    const h = heights[cards[i].instanceId] ?? 200;
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, h);
  }

  const rowY: number[] = [GRID_PAD];
  for (let r = 0; r < rowHeights.length; r++) {
    rowY[r + 1] = rowY[r] + rowHeights[r];
  }

  const positions: Record<string, CardPos> = {};
  for (let i = 0; i < cards.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    positions[cards[i].instanceId] = {
      x: GRID_PAD + col * colWidth,
      y: rowY[row],
    };
  }

  return { positions, totalHeight: rowY[rowHeights.length] + GRID_PAD };
}

const SPRING_CONFIG = { friction: 22, tension: 55, useNativeDriver: false } as const;

export function CardGrid() {
  const C = useColors();
  const { cards, status, pin, unpin, dismiss } = useSession();
  const { cardSize } = useUISettings();
  const { width, height: winHeight } = useWindowDimensions();
  const config = CARD_SIZE_CONFIGS[cardSize];
  const columns = width > winHeight ? config.landscapeCols : config.portraitCols;
  const cardWidth = (width - 10) / columns - 10;
  const styles = useMemo(() => createStyles(C), [C]);

  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});

  const animRef = useRef<Record<string, AnimPair>>({});
  const prevPos = useRef<Record<string, CardPos>>({});

  const { positions: targets, totalHeight } = useMemo(
    () => computePositions(cards, cardHeights, columns, cardWidth),
    [cards, cardHeights, columns, cardWidth],
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
        springs.push(Animated.parallel([
          Animated.spring(anim.left, { toValue: target.x, ...SPRING_CONFIG }),
          Animated.spring(anim.top, { toValue: target.y, ...SPRING_CONFIG }),
        ]));
      }
    }

    prevPos.current = Object.fromEntries(
      Object.entries(targets).map(([id, pos]) => [id, { ...pos }]),
    );

    if (springs.length > 0) Animated.parallel(springs).start();
  }, [targets, cards]);

  useEffect(() => {
    setCardHeights((prev) => {
      const activeIds = new Set(cards.map((c) => c.instanceId));
      const pruned = Object.fromEntries(Object.entries(prev).filter(([id]) => activeIds.has(id)));
      return Object.keys(pruned).length === Object.keys(prev).length ? prev : pruned;
    });
  }, [cards]);

  const onCardLayout = useCallback((instanceId: string, h: number) => {
    setCardHeights((prev) => {
      if (prev[instanceId] === h) return prev;
      return { ...prev, [instanceId]: h };
    });
  }, []);

  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyGlyph}>◈</Text>
        <Text style={styles.emptyLabel}>
          {status === 'idle' ? 'Session not started' : 'Awaiting entities\u2026'}
        </Text>
        {status === 'idle' && (
          <Text style={styles.emptyHint}>Tap Start to begin listening</Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={{ height: totalHeight }}>
        {cards.map((card) => {
          const anim = animRef.current[card.instanceId];
          if (!anim) return null;
          return (
            <Animated.View
              key={card.instanceId}
              style={[styles.cardWrapper, { left: anim.left, top: anim.top }]}
              onLayout={(e) => onCardLayout(card.instanceId, e.nativeEvent.layout.height)}
            >
              <EntityCard
                card={card}
                width={cardWidth}
                onPin={() => pin(card.instanceId)}
                onUnpin={() => unpin(card.instanceId)}
                onDismiss={() => dismiss(card.instanceId)}
              />
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(C: Colors) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    cardWrapper: { position: 'absolute' },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyGlyph: {
      fontSize: 24,
      color: C.textMuted,
      fontFamily: F.display,
      opacity: 0.6,
    },
    emptyLabel: {
      color: C.textDim,
      fontSize: 13,
      letterSpacing: 0.5,
      fontFamily: F.mono,
    },
    emptyHint: {
      color: C.textMuted,
      fontSize: 11,
      letterSpacing: 0.5,
      fontFamily: F.mono,
      marginTop: 2,
    },
  });
}
