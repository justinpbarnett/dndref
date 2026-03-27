import { Redirect } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSession } from '../src/context/session';
import { C, F, typeAccent } from '../src/theme';

const EXAMPLES = [
  "Alright, you're moving through the Ashen Vale toward Ironspire. The air is dead quiet.",
  "Malachar is still in the dungeons on level two. Seraphine said he might cooperate if we get to him.",
  "The Obsidian Compact has people inside Silvermarsh. Gorm warned us about that.",
  "Valdrath's crown is somewhere on level six. We destroy it, we weaken him before we even find the phylactery.",
  "Thornwall is three days east. That's where the Dawnwarden Order had their original keep before the siege.",
  "The Sundering Blade is in pieces in the armory on level four. Gorm thinks he can reforge it.",
];

const STT_STATUS_COLORS = {
  idle: C.textMuted,
  connecting: C.paused,
  active: C.active,
  error: '#c04040',
};

const STT_STATUS_LABELS = {
  idle: 'Mic off',
  connecting: 'Connecting...',
  active: 'Listening',
  error: 'Error',
};

export default function DebugScreen() {
  const { status, sttStatus, sttError, sttProviderName, transcript, recentDetections, appendTranscript } = useSession();
  if (!__DEV__) return <Redirect href="/" />;
  const isEditable = status !== 'idle';
  const dotColor = STT_STATUS_COLORS[sttStatus];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MIC STATUS</Text>
        <View style={styles.micRow}>
          <View style={[styles.micDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.micLabel, { color: dotColor }]}>
            {STT_STATUS_LABELS[sttStatus]}
            {sttProviderName ? ` (${sttProviderName})` : ''}
          </Text>
        </View>
        {sttError && <Text style={styles.errorText}>{sttError}</Text>}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TRANSCRIPT INPUT</Text>
        <Text style={styles.hint}>
          {isEditable
            ? 'Tap an example to inject test text, or type directly below.'
            : 'Start a session on the Reference tab first.'}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.examplesRow}
          contentContainerStyle={styles.examplesContent}
        >
          {EXAMPLES.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, !isEditable && styles.chipDisabled]}
              onPress={() => isEditable && appendTranscript(ex)}
              activeOpacity={0.6}
            >
              <Text style={styles.chipText} numberOfLines={1}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={[styles.input, !isEditable && styles.inputDisabled]}
          multiline
          placeholder={isEditable ? 'e.g. "the party arrives at Ironspire..."' : '(session not active)'}
          placeholderTextColor={C.textMuted}
          editable={isEditable}
          onChangeText={(text) => {
            if (text.length > (transcript ?? '').length) {
              appendTranscript(text.slice((transcript ?? '').length));
            }
          }}
          value={transcript}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.divider} />

      <View style={[styles.section, styles.sectionSmall]}>
        <Text style={styles.sectionLabel}>RECENT DETECTIONS</Text>
        {recentDetections.length === 0 ? (
          <Text style={styles.empty}>none</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {recentDetections.map((e) => (
              <View key={e.id} style={styles.row}>
                <View style={[styles.typeDot, { backgroundColor: typeAccent(e.type) }]} />
                <Text style={styles.detectionName}>{e.name}</Text>
                <Text style={styles.detectionType}>{e.type}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 16,
  },
  section: {
    flex: 1,
  },
  sectionSmall: {
    flex: 0,
    maxHeight: 200,
  },
  sectionLabel: {
    color: C.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontFamily: F.mono,
    marginBottom: 7,
  },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  micLabel: {
    fontSize: 12,
    fontFamily: F.mono,
    letterSpacing: 0.3,
  },
  errorText: {
    color: '#c04040',
    fontSize: 11,
    fontFamily: F.mono,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  hint: {
    color: C.textSecondary,
    fontSize: 11,
    marginBottom: 8,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  examplesRow: {
    marginBottom: 10,
    flexGrow: 0,
  },
  examplesContent: {
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    backgroundColor: C.bgInput,
    borderWidth: 1,
    borderColor: C.borderMed,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 260,
  },
  chipDisabled: {
    opacity: 0.3,
  },
  chipText: {
    color: C.textSecondary,
    fontSize: 11,
    fontFamily: F.display,
  },
  input: {
    flex: 1,
    backgroundColor: C.bgInput,
    color: C.textPrimary,
    borderRadius: 3,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: C.border,
    fontFamily: F.display,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  empty: {
    color: C.textMuted,
    fontSize: 13,
    fontFamily: F.mono,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  typeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.8,
  },
  detectionName: {
    color: C.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    fontFamily: F.display,
  },
  detectionType: {
    color: C.textDim,
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 0.5,
  },
});
