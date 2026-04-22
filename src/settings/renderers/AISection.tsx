import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Ionicon } from '../../components/Ionicon';
import { KeyLink } from '../KeyLink';
import { AISectionProps } from '../types';

export function AISection({ dsLocal, setDsLocal, aiContent, setAiContent, aiParsing, aiResult, handleAIParse, styles }: AISectionProps) {
  const C = styles.__colors;

  return (
    <View testID="settings-content" style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>ANTHROPIC API KEY</Text>
        <Text style={styles.groupDesc}>
          Paste any campaign content and the AI will extract entities automatically.
        </Text>
        <TextInput
          style={styles.input}
          value={dsLocal.aiApiKey}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, aiApiKey: v }))}
          placeholder="sk-ant-..."
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoCorrect={false}
          autoCapitalize="none"
        />
        <KeyLink label="Get an Anthropic API key" url="https://console.anthropic.com" />
        <Text style={styles.fieldHint}>Uses claude-haiku (~$0.001 per parse).</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>PARSE CAMPAIGN CONTENT</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={aiContent}
          onChangeText={setAiContent}
          placeholder="Paste campaign notes, backstory, or any D&D content..."
          placeholderTextColor={C.textMuted}
          multiline
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.outlineBtn, (!aiContent.trim() || !dsLocal.aiApiKey || aiParsing) && styles.outlineBtnDisabled]}
          onPress={handleAIParse}
          activeOpacity={0.7}
          disabled={!aiContent.trim() || !dsLocal.aiApiKey || aiParsing}
        >
          <Ionicon name="sparkles-outline" size={14} color={C.active} style={{ marginRight: 6 }} />
          <Text style={styles.outlineBtnText}>{aiParsing ? 'Parsing...' : 'Parse with AI'}</Text>
        </TouchableOpacity>
        {!!aiResult && (
          <Text style={[styles.fieldHint, { color: aiResult.startsWith('Error') ? C.paused : C.active }]}>
            {aiResult}
          </Text>
        )}
      </View>
    </View>
  );
}
