import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CARD_SIZE_CONFIGS, useUISettings } from '../context/ui-settings';
import { CardState } from '../context/session';
import { C, F, typeAccent } from '../theme';

function parseBullets(summary: string): string[] {
  return summary
    .split(/(?<=[.!])\s+/)
    .map((s) => s.replace(/[.!]$/, '').trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
}

interface Props {
  card: CardState;
  width: number;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
}

export function EntityCard({ card, width, onPin, onUnpin, onDismiss }: Props) {
  const { entity, pinned } = card;
  const color = typeAccent(entity.type);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(10)).current;

  const { cardSize } = useUISettings();
  const { fontScale } = CARD_SIZE_CONFIGS[cardSize];

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const bullets = useMemo(() => parseBullets(entity.summary), [entity.summary]);

  const webStyles = Platform.OS === 'web'
    ? { boxShadow: pinned ? `0 0 0 1px ${color}50, 0 4px 20px ${color}18` : '0 2px 12px #00000040' }
    : {};

  return (
    <Animated.View
      style={[
        styles.card,
        { width, opacity: fadeIn, transform: [{ translateY: slideUp }] },
        pinned && styles.cardPinned,
        pinned && { borderColor: color + '40' },
        webStyles as object,
      ]}
    >
      <View style={[styles.topStrip, { backgroundColor: color }]} />

      <View style={[styles.header, { backgroundColor: color + '14' }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.name, { fontSize: 14 * fontScale, lineHeight: 19 * fontScale }]} numberOfLines={2}>
              {entity.name}
            </Text>
            <View style={[styles.typePill, { borderColor: color + '60', backgroundColor: color + '18' }]}>
              <Text style={[styles.typeText, { color, fontSize: 8 * fontScale }]}>{entity.type.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={pinned ? onUnpin : onPin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Text style={[styles.pinIcon, pinned && { color, opacity: 1 }]}>
                  {pinned ? '◈' : '◇'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismiss}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={styles.dismissIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            {entity.image && (
              <Image
                source={{ uri: entity.image }}
                style={[styles.portrait, { borderColor: color + '30' }]}
                resizeMode="cover"
              />
            )}
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: color + '28' }]} />

      <View style={styles.bullets}>
        {bullets.map((bullet, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={[styles.bulletDot, { color: color + '90', fontSize: 6 * fontScale, marginTop: 5 * fontScale }]}>◆</Text>
            <Text style={[styles.bulletText, { fontSize: 12 * fontScale, lineHeight: 17 * fontScale }]}>{bullet}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderRadius: 5,
    margin: 5,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minHeight: 200,
  },
  cardPinned: {
    backgroundColor: C.bgCardPinned,
    borderColor: C.borderMed,
  },
  topStrip: {
    height: 4,
    width: '100%',
    opacity: 0.85,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 9,
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  portrait: {
    width: 52,
    height: 68,
    borderRadius: 3,
    borderWidth: 1,
  },
  name: {
    color: C.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.4,
    flex: 1,
    fontFamily: F.display,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 1,
  },
  pinIcon: {
    fontSize: 13,
    color: C.textDim,
    opacity: 0.5,
  },
  dismissIcon: {
    fontSize: 11,
    color: C.textDim,
    fontWeight: '700',
  },
  typePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: F.mono,
  },
  divider: {
    height: 1,
  },
  bullets: {
    padding: 12,
    paddingTop: 10,
    gap: 7,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  bulletDot: {
    lineHeight: 14,
  },
  bulletText: {
    color: C.textSecondary,
    flex: 1,
    fontFamily: F.display,
  },
});
