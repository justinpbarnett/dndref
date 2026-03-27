import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSession } from '../context/session';
import { useColors } from '../context/ui-settings';
import { Colors, F } from '../theme';

function PulseDot({ status }: { status: 'idle' | 'active' | 'paused' }) {
  const C = useColors();
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
          Animated.timing(scale, { toValue: 1.7, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
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
  const C = useColors();
  const { status, sttStatus, start, pause, stop } = useSession();
  const styles = useMemo(() => createStyles(C), [C]);

  const webBarShadow = Platform.OS === 'web'
    ? { boxShadow: `0 1px 0 ${C.border}, 0 4px 16px #00000030` }
    : {};

  const statusLabel =
    sttStatus === 'connecting' ? 'Connecting' :
    sttStatus === 'error' ? 'Mic Error' :
    status === 'active' ? 'Listening' :
    status === 'paused' ? 'Paused' :
    'Ready';

  return (
    <View style={[styles.bar, webBarShadow as object]}>
      <Text style={styles.appName}>DnD{'\u2009'}Ref</Text>

      <View style={styles.statusRow}>
        <PulseDot status={status} />
        <Text style={[
          styles.statusText,
          status === 'active' && { color: C.active },
          status === 'paused' && { color: C.paused },
        ]}>
          {statusLabel}
        </Text>
      </View>

      <View style={styles.buttons}>
        {status === 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start} activeOpacity={0.75}>
            <Text style={styles.btnTextStart}>Start</Text>
          </TouchableOpacity>
        )}
        {status === 'active' && (
          <TouchableOpacity style={[styles.btn, styles.btnPause]} onPress={pause} activeOpacity={0.75}>
            <Text style={styles.btnTextPause}>Pause</Text>
          </TouchableOpacity>
        )}
        {status === 'paused' && (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start} activeOpacity={0.75}>
            <Text style={styles.btnTextStart}>Resume</Text>
          </TouchableOpacity>
        )}
        {status !== 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop} activeOpacity={0.75}>
            <Text style={styles.btnTextStop}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function createStyles(C: Colors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: C.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      minHeight: 50,
    },
    appName: {
      color: C.textDim,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 2.5,
      fontFamily: F.display,
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
      letterSpacing: 0.8,
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
      paddingVertical: 7,
      borderRadius: 3,
    },
    btnStart: {
      backgroundColor: C.active,
    },
    btnPause: {
      backgroundColor: C.paused + '25',
      borderWidth: 1,
      borderColor: C.paused + '70',
    },
    btnStop: {
      borderWidth: 1,
      borderColor: C.borderStrong,
    },
    btnTextStart: {
      color: C.bg,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      fontFamily: F.mono,
    },
    btnTextPause: {
      color: C.paused,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: F.mono,
    },
    btnTextStop: {
      color: C.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: F.mono,
    },
  });
}
