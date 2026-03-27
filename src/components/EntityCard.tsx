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
  const slideUp = useRef(new Animated.Value(8)).current;

  const { cardSize } = useUISettings();
  const { fontScale } = CARD_SIZE_CONFIGS[cardSize];

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const bullets = useMemo(() => parseBullets(entity.summary), [entity.summary]);

  const webStyles = Platform.OS === 'web'
    ? {
        boxShadow: pinned
          ? `0 0 0 1px ${color}48, 0 6px 28px ${color}20, 0 2px 8px #00000060`
          : '0 2px 12px #00000050',
      }
    : {};

  return (
    <Animated.View
      style={[
        styles.card,
        { width, opacity: fadeIn, transform: [{ translateY: slideUp }] },
        pinned && styles.cardPinned,
        pinned && { borderColor: color + '40', borderLeftColor: color, borderLeftWidth: 3 },
        webStyles as object,
      ]}
    >
      <View style={[styles.topStrip, { backgroundColor: color }]} />

      <View style={[styles.header, { backgroundColor: color + (pinned ? '12' : '0b') }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text
              style={[styles.name, { fontSize: 14 * fontScale, lineHeight: 20 * fontScale }]}
              numberOfLines={2}
            >
              {entity.name}
            </Text>
            <Text style={[styles.typeLabel, { color: color + 'b0', fontSize: 8 * fontScale }]}>
              {entity.type.toUpperCase()}
            </Text>
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
                style={[styles.portrait, { borderColor: color + '35' }]}
                resizeMode="cover"
              />
            )}
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: color + '22' }]} />

      <View style={styles.bullets}>
        {bullets.map((bullet, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={[styles.bulletMark, { color: color + 'aa', fontSize: 11 * fontScale, lineHeight: 18 * fontScale }]}>
              ›
            </Text>
            <Text style={[styles.bulletText, { fontSize: 12 * fontScale, lineHeight: 18 * fontScale }]}>
              {bullet}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderRadius: 4,
    margin: 5,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minHeight: 200,
  },
  cardPinned: {
    backgroundColor: C.bgCardPinned,
  },
  topStrip: {
    height: 3,
    width: '100%',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 5,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  portrait: {
    width: 48,
    height: 64,
    borderRadius: 2,
    borderWidth: 1,
  },
  name: {
    color: C.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.6,
    fontFamily: F.display,
  },
  typeLabel: {
    fontWeight: '700',
    letterSpacing: 2.2,
    fontFamily: F.mono,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 1,
  },
  pinIcon: {
    fontSize: 12,
    color: C.textDim,
    opacity: 0.55,
  },
  dismissIcon: {
    fontSize: 10,
    color: C.textDim,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  bullets: {
    padding: 12,
    paddingTop: 9,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  bulletMark: {
    fontWeight: '700',
  },
  bulletText: {
    color: C.textSecondary,
    flex: 1,
    fontFamily: F.body,
  },
});
