import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CARD_SIZE_CONFIGS, useColors, useUISettings } from '../context/ui-settings';
import { CardState } from '../context/session';
import { Colors, F, typeAccent } from '../theme';

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
  const C = useColors();
  const color = typeAccent(entity.type, C);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(8)).current;

  const { cardSize } = useUISettings();
  const { fontScale } = CARD_SIZE_CONFIGS[cardSize];

  const styles = useMemo(() => createStyles(C), [C]);

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideUp, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const bullets = useMemo(() => parseBullets(entity.summary), [entity.summary]);

  const webStyles = Platform.OS === 'web'
    ? {
        boxShadow: pinned
          ? `0 0 0 1px ${color}48, 0 6px 28px ${color}20, 0 2px 8px #00000040`
          : '0 2px 12px #00000030',
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
                accessibilityLabel={pinned ? 'Unpin' : 'Pin'}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
              >
                <Ionicons
                  name={pinned ? 'bookmark' : 'bookmark-outline'}
                  size={15 * fontScale}
                  color={pinned ? color : C.textDim}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismiss}
                accessibilityLabel="Dismiss"
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
              >
                <Ionicons name="close" size={14 * fontScale} color={C.textDim} />
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
              {'>'}
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

function createStyles(C: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.bgCard,
      borderRadius: 6,
      margin: 5,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      minHeight: 160,
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
      borderRadius: 4,
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
      gap: 12,
      paddingTop: 1,
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
      fontFamily: F.mono,
    },
    bulletText: {
      color: C.textSecondary,
      flex: 1,
      fontFamily: F.body,
    },
  });
}
