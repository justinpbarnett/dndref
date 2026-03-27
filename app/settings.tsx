import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CARD_SIZE_CONFIGS, CardSize, useUISettings } from '../src/context/ui-settings';
import { DataSourcesSettings, useDataSources } from '../src/context/data-sources';
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, STTSettings } from '../src/stt/index';
import { UploadedFile, addUpload, getUploads, removeUpload } from '../src/entities/providers/file-upload';
import { parseWithAI } from '../src/entities/ai-parser';
import { C, F } from '../src/theme';

function KeyLink({ label, url }: { label: string; url: string }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <Text style={styles.keyLink}>{label} ↗</Text>
    </TouchableOpacity>
  );
}

const CARD_SIZE_LABELS: Record<CardSize, string> = { S: 'S', M: 'M', L: 'L', XL: 'XL' };
const CARD_SIZE_DESCS: Record<CardSize, string> = {
  S:  '4 / 3 cols',
  M:  '3 / 2 cols',
  L:  '2 / 2 cols',
  XL: '2 / 1 cols',
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<STTSettings>(DEFAULT_STT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { cardSize, setCardSize } = useUISettings();
  const { settings: ds, update: updateDs, bumpUploads } = useDataSources();
  const [dsLocal, setDsLocal] = useState<DataSourcesSettings>(ds);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // File uploads
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [pasteFileName, setPasteFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  // AI parsing
  const [aiContent, setAiContent] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const refreshUploads = useCallback(async () => {
    const uploads = await getUploads();
    setUploads(uploads);
    bumpUploads();
  }, [bumpUploads]);

  useEffect(() => {
    AsyncStorage.getItem(STT_SETTINGS_KEY).then((raw) => {
      if (raw) setSettings({ ...DEFAULT_STT_SETTINGS, ...(JSON.parse(raw) as Partial<STTSettings>) });
    });
    refreshUploads();
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, [refreshUploads]);

  useEffect(() => {
    setDsLocal(ds);
  }, [ds]);

  const save = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STT_SETTINGS_KEY, JSON.stringify(settings)),
        updateDs(dsLocal),
      ]);
      setSaved(true);
      setSaveError(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.warn('[dnd-ref] Failed to save settings:', e);
      setSaveError(true);
    }
  };

  const pickFilesWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.md,.txt,.json';
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      input.onchange = null;
      try {
        await Promise.all(files.map((f) => f.text().then((text) => addUpload(f.name, text))));
        await refreshUploads();
      } catch (e) {
        console.warn('[dnd-ref] File upload failed:', e);
      }
    };
    input.click();
  };

  const handlePasteAdd = async () => {
    const name = pasteFileName.trim() || 'Pasted Content.md';
    if (!pasteContent.trim()) return;
    try {
      await addUpload(name, pasteContent);
      setPasteFileName('');
      setPasteContent('');
      await refreshUploads();
    } catch (e) {
      console.warn('[dnd-ref] Failed to save pasted content:', e);
    }
  };

  const handleDeleteUpload = async (id: string) => {
    try {
      await removeUpload(id);
      await refreshUploads();
    } catch (e) {
      console.warn('[dnd-ref] Failed to delete upload:', e);
    }
  };

  const handleAIParse = async () => {
    if (!aiContent.trim() || !dsLocal.aiApiKey) return;
    setAiParsing(true);
    setAiResult('');
    try {
      const entities = await parseWithAI(aiContent, dsLocal.aiApiKey);
      const name = `AI Parsed ${new Date().toLocaleDateString()}.json`;
      await addUpload(name, JSON.stringify(entities));
      await refreshUploads();
      setAiResult(`Found ${entities.length} entities. Saved as "${name}".`);
      setAiContent('');
    } catch (e: unknown) {
      setAiResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiParsing(false);
    }
  };

  const isWebSpeechAvailable = Platform.OS === 'web';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>SETTINGS</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CARD SIZE</Text>
        <View style={styles.sizeRow}>
          {(Object.keys(CARD_SIZE_CONFIGS) as CardSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeBtn, cardSize === size && styles.sizeBtnSelected]}
              onPress={() => setCardSize(size)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sizeBtnLabel, cardSize === size && styles.sizeBtnLabelSelected]}>
                {CARD_SIZE_LABELS[size]}
              </Text>
              <Text style={styles.sizeBtnDesc}>{CARD_SIZE_DESCS[size]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>Landscape / portrait column counts. Takes effect immediately.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>STT PROVIDER</Text>

        {isWebSpeechAvailable && (
          <TouchableOpacity
            style={[styles.option, settings.provider === 'web-speech' && styles.optionSelected]}
            onPress={() => setSettings((s) => ({ ...s, provider: 'web-speech' }))}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, settings.provider === 'web-speech' && styles.radioSelected]} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Web Speech</Text>
              <Text style={styles.optionDesc}>Chrome / Edge only. No API key required.</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.option, settings.provider === 'deepgram' && styles.optionSelected]}
          onPress={() => setSettings((s) => ({ ...s, provider: 'deepgram' }))}
          activeOpacity={0.7}
        >
          <View style={[styles.radio, settings.provider === 'deepgram' && styles.radioSelected]} />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Deepgram</Text>
            <Text style={styles.optionDesc}>Works on web and iPad. ~$0.004 / min.</Text>
          </View>
        </TouchableOpacity>
      </View>

      {settings.provider === 'deepgram' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEEPGRAM API KEY</Text>
          <TextInput
            style={styles.input}
            value={settings.deepgramApiKey}
            onChangeText={(v) => setSettings((s) => ({ ...s, deepgramApiKey: v }))}
            placeholder="paste key here"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
          <KeyLink label="Get a free API key" url="https://console.deepgram.com" />
        </View>
      )}

      {!isWebSpeechAvailable && settings.provider === 'web-speech' && (
        <View style={styles.section}>
          <Text style={styles.warning}>
            Web Speech is only available in Chrome / Edge. Switch to Deepgram for iPad.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA SOURCES</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.optionTitle}>D&D 5e SRD</Text>
            <Text style={styles.optionDesc}>Monsters and magic items from the official SRD. No API key needed.</Text>
          </View>
          <Switch
            value={dsLocal.srdEnabled}
            onValueChange={(v) => setDsLocal((s) => ({ ...s, srdEnabled: v }))}
            trackColor={{ false: C.border, true: C.active + '80' }}
            thumbColor={dsLocal.srdEnabled ? C.active : C.textSecondary}
          />
        </View>

        <View style={styles.subsection}>
          <Text style={styles.optionTitle}>Kanka</Text>
          <Text style={styles.optionDesc}>Campaign world data: characters, locations, factions, items.</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={dsLocal.kankaToken}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaToken: v }))}
            placeholder="API token"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { marginTop: 6 }]}
            value={dsLocal.kankaCampaignId}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaCampaignId: v.replace(/\D/g, '') }))}
            placeholder="Campaign ID (from kanka.io URL)"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            autoCorrect={false}
          />
          <KeyLink label="Get your API token" url="https://kanka.io/en/profile/api" />
          <Text style={styles.hint}>Campaign ID is in the URL: kanka.io/en/campaign/12345</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.optionTitle}>Homebrewery</Text>
          <Text style={styles.optionDesc}>Paste the share URL of any public Homebrewery document.</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={dsLocal.homebreweryUrl}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, homebreweryUrl: v }))}
            placeholder="https://homebrewery.naturalcrit.com/share/..."
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.subsection}>
          <Text style={styles.optionTitle}>Notion</Text>
          <Text style={styles.optionDesc}>Fetches pages from your Notion workspace. Add your integration token and page URLs (comma-separated).</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={dsLocal.notionToken}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, notionToken: v }))}
            placeholder="secret_..."
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { marginTop: 6 }]}
            value={dsLocal.notionPageIds}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, notionPageIds: v }))}
            placeholder="notion.so/... (comma-separated)"
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <KeyLink label="Create a Notion integration" url="https://www.notion.so/my-integrations" />
          <Text style={styles.hint}>Share each target page with the integration.</Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.optionTitle}>Google Docs</Text>
          <Text style={styles.optionDesc}>Paste the share URL. The doc must be set to "Anyone with the link can view".</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={dsLocal.googleDocsUrl}
            onChangeText={(v) => setDsLocal((s) => ({ ...s, googleDocsUrl: v }))}
            placeholder="https://docs.google.com/document/d/..."
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WORLD FILES</Text>
        <Text style={styles.hint}>Upload .md, .txt, or .json files from Obsidian, DiceCloud exports, or any campaign notes.</Text>

        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.outlineBtn} onPress={pickFilesWeb} activeOpacity={0.7}>
            <Text style={styles.outlineBtnText}>Pick Files</Text>
          </TouchableOpacity>
        )}

        <View style={styles.subsection}>
          <Text style={styles.optionDesc}>Or paste content directly:</Text>
          <TextInput
            style={[styles.input, { marginTop: 6 }]}
            value={pasteFileName}
            onChangeText={setPasteFileName}
            placeholder="File name (e.g. my-campaign.md)"
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, styles.textarea, { marginTop: 6 }]}
            value={pasteContent}
            onChangeText={setPasteContent}
            placeholder="Paste content here..."
            placeholderTextColor={C.textMuted}
            multiline
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: 6 }]}
            onPress={handlePasteAdd}
            activeOpacity={0.7}
            disabled={!pasteContent.trim()}
          >
            <Text style={styles.outlineBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {uploads.length > 0 && (
          <View style={styles.fileList}>
            {uploads.map((f) => (
              <View key={f.id} style={styles.fileRow}>
                <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => handleDeleteUpload(f.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AI PARSING</Text>
        <Text style={styles.hint}>Paste any campaign content and Claude will extract entities automatically. Requires an Anthropic API key.</Text>

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
        <KeyLink label="Get an API key" url="https://console.anthropic.com" />
        <Text style={styles.hint}>Uses claude-haiku (~$0.001 per parse).</Text>

        <TextInput
          style={[styles.input, styles.textarea]}
          value={aiContent}
          onChangeText={setAiContent}
          placeholder="Paste your campaign notes, backstory, or any D&D content..."
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
          <Text style={styles.outlineBtnText}>{aiParsing ? 'Parsing...' : 'Parse with AI'}</Text>
        </TouchableOpacity>

        {!!aiResult && <Text style={[styles.hint, { color: aiResult.startsWith('Error') ? C.paused : C.active }]}>{aiResult}</Text>}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.7}>
        <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save Settings'}</Text>
      </TouchableOpacity>

      {saveError && <Text style={styles.warning}>Failed to save -- device storage may be full.</Text>}

      <Text style={styles.note}>Changes take effect when you start the next session.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingTop: 24, gap: 24 },
  pageTitle: {
    color: C.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: F.mono,
    marginBottom: 4,
  },
  section: { gap: 10 },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: C.bgCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  sizeBtnSelected: {
    borderColor: C.active + '60',
    backgroundColor: C.bgCardPinned,
  },
  sizeBtnLabel: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: F.mono,
  },
  sizeBtnLabelSelected: {
    color: C.active,
  },
  sizeBtnDesc: {
    color: C.textMuted,
    fontSize: 9,
    fontFamily: F.mono,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    color: C.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: F.mono,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: C.bgCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionSelected: {
    borderColor: C.active + '60',
    backgroundColor: C.bgCardPinned,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.borderStrong,
    marginTop: 2,
  },
  radioSelected: {
    borderColor: C.active,
    backgroundColor: C.active,
  },
  optionText: { flex: 1, gap: 3 },
  optionTitle: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: F.display,
  },
  optionDesc: {
    color: C.textSecondary,
    fontSize: 11,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: C.bgInput,
    color: C.textPrimary,
    borderRadius: 3,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: C.border,
    fontFamily: F.mono,
  },
  hint: {
    color: C.textSecondary,
    fontSize: 11,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  keyLink: {
    color: C.location,
    fontSize: 11,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  warning: {
    color: C.paused,
    fontSize: 12,
    fontFamily: F.mono,
    letterSpacing: 0.2,
  },
  saveBtn: {
    backgroundColor: C.active,
    borderRadius: 3,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: C.bg,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: F.mono,
  },
  note: {
    color: C.textMuted,
    fontSize: 11,
    fontFamily: F.mono,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.bgCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleText: { flex: 1, gap: 3 },
  subsection: {
    padding: 14,
    backgroundColor: C.bgCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: C.active + '80',
    borderRadius: 3,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineBtnDisabled: {
    borderColor: C.border,
    opacity: 0.5,
  },
  outlineBtnText: {
    color: C.active,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: F.mono,
  },
  fileList: {
    gap: 6,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: C.bgCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  fileName: {
    flex: 1,
    color: C.textSecondary,
    fontSize: 12,
    fontFamily: F.mono,
  },
  deleteIcon: {
    color: C.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
});
