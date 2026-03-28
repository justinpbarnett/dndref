import React from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyLink } from '../KeyLink';
import { VoiceSectionProps } from '../types';

export function VoiceSection({ sttSettings, setSttSettings, saveVoice, voiceSaved, isWebSpeech, styles }: VoiceSectionProps) {
  const C = styles.__colors;

  return (
    <View style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>STT PROVIDER</Text>
        {isWebSpeech && (
          <TouchableOpacity
            style={[styles.optionRow, sttSettings.provider === 'web-speech' && styles.optionRowActive]}
            onPress={() => setSttSettings((s) => ({ ...s, provider: 'web-speech' }))}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, sttSettings.provider === 'web-speech' && styles.radioActive]} />
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>Web Speech</Text>
              <Text style={styles.optionDesc}>Chrome / Edge only. No API key required.</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.optionRow, sttSettings.provider === 'deepgram' && styles.optionRowActive]}
          onPress={() => setSttSettings((s) => ({ ...s, provider: 'deepgram' }))}
          activeOpacity={0.7}
        >
          <View style={[styles.radio, sttSettings.provider === 'deepgram' && styles.radioActive]} />
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Deepgram</Text>
            <Text style={styles.optionDesc}>Works on web and iPad. ~$0.004 / min.</Text>
          </View>
        </TouchableOpacity>
        {!isWebSpeech && sttSettings.provider === 'web-speech' && (
          <Text style={styles.warning}>Web Speech is only available in Chrome / Edge. Switch to Deepgram for iPad.</Text>
        )}
      </View>

      {sttSettings.provider === 'deepgram' && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>DEEPGRAM API KEY</Text>
          <TextInput
            style={styles.input}
            value={sttSettings.deepgramApiKey}
            onChangeText={(v) => setSttSettings((s) => ({ ...s, deepgramApiKey: v }))}
            placeholder="paste key here"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
          <KeyLink label="Get a free Deepgram key" url="https://console.deepgram.com" />
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={saveVoice} activeOpacity={0.7}>
        <Text style={styles.saveBtnText}>{voiceSaved ? 'Saved' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}
