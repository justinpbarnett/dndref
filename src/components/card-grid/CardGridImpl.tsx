import React, { useMemo, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "../../context/session";
import { useColors, useUISettings } from "../../context/ui-settings";
import { Colors, F } from "../../theme";
import { EntityCard } from "../EntityCard";
import { EntityDetailsModal } from "../EntityDetailsModal";
import { useCardGridLayout } from "../use-card-grid-layout";

export function CardGrid() {
  const C = useColors();
  const { cards, status, pin, unpin, dismiss } = useSession();
  const { cardSize } = useUISettings();
  const styles = useMemo(() => createStyles(C), [C]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { animRef, cardWidth, onCardLayout, totalHeight } = useCardGridLayout(cards, cardSize);
  const selectedCard = cards.find((card) => card.instanceId === selectedCardId) ?? null;

  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyGlyph}>◈</Text>
        <Text style={styles.emptyLabel}>{status === "idle" ? "Session not started" : "Awaiting entities\u2026"}</Text>
        {status === "idle" && <Text style={styles.emptyHint}>Tap Start to begin listening</Text>}
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ height: totalHeight }}>
          {cards.map((card) => {
            const anim = animRef.current[card.instanceId];
            if (!anim) return null;
            return (
              <Animated.View
                key={card.instanceId}
                testID="entity-card"
                style={[styles.cardWrapper, { left: anim.left, top: anim.top }]}
                onLayout={(e) => onCardLayout(card.instanceId, e.nativeEvent.layout.height)}
              >
                <EntityCard
                  card={card}
                  width={cardWidth}
                  onPin={() => pin(card.instanceId)}
                  onUnpin={() => unpin(card.instanceId)}
                  onDismiss={() => dismiss(card.instanceId)}
                  onOpenDetails={() => setSelectedCardId(card.instanceId)}
                />
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      <EntityDetailsModal card={selectedCard} visible={selectedCard !== null} onClose={() => setSelectedCardId(null)} />
    </>
  );
}

const createStyles = (C: Colors) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    cardWrapper: { position: "absolute" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    emptyGlyph: { fontSize: 24, color: C.textMuted, fontFamily: F.display, opacity: 0.6 },
    emptyLabel: { color: C.textDim, fontSize: 13, letterSpacing: 0.5, fontFamily: F.mono },
    emptyHint: { color: C.textMuted, fontSize: 11, letterSpacing: 0.5, fontFamily: F.mono, marginTop: 2 },
  });
