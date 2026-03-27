import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSession } from '../context/session';
import { C, F } from '../theme';

function PulseDot({ status }: { status: 'idle' | 'active' | 'paused' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'active') {
      scale.setValue(1);
      opacity.setValue(status === 'paused' ? 0.7 : 0.25);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [status]);

  const dotColor = status === 'active' ? C.active : status === 'paused' ? C.paused : C.textMuted;

  return (
    <View style={dot.wrapper}>
      <Animated.View style={[dot.ring, { backgroundColor: dotColor, transform: [{ scale }], opacity }]} />
      <View style={[dot.core, { backgroundColor: dotColor }]} />
    </View>
  );
}

const dot = StyleSheet.create({
  wrapper: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  core: { width: 6, height: 6, borderRadius: 3 },
});

export function SessionControls() {
  const { status, sttStatus, start, pause, stop } = useSession();

  const statusLabel =
    sttStatus === 'connecting' ? 'Connecting...' :
    sttStatus === 'error' ? 'Mic Error' :
    status === 'active' ? 'Listening' :
    status === 'paused' ? 'Paused' :
    'Ready';

  return (
    <View style={styles.bar}>
      <Text style={styles.appName}>DND{'\u2009'}REF</Text>

      <View style={styles.statusRow}>
        <PulseDot status={status} />
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      <View style={styles.buttons}>
        {status === 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={start} activeOpacity={0.7}>
            <Text style={styles.btnTextPrimary}>Start</Text>
          </TouchableOpacity>
        )}
        {status === 'active' && (
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={pause} activeOpacity={0.7}>
            <Text style={styles.btnTextGhost}>Pause</Text>
          </TouchableOpacity>
        )}
        {status === 'paused' && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={start} activeOpacity={0.7}>
            <Text style={styles.btnTextPrimary}>Resume</Text>
          </TouchableOpacity>
        )}
        {status !== 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop} activeOpacity={0.7}>
            <Text style={styles.btnTextStop}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: C.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  appName: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: F.mono,
    minWidth: 80,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusText: {
    color: C.textSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
    fontFamily: F.mono,
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 3,
  },
  btnPrimary: {
    backgroundColor: C.active,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  btnStop: {
    borderWidth: 1,
    borderColor: C.borderMed,
  },
  btnTextPrimary: {
    color: C.bg,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnTextGhost: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  btnTextStop: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
});
