import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking, Platform, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { CARD_SIZE_CONFIGS, CardSize, ColorScheme, useColors, useUISettings } from '../src/context/ui-settings';
import { DataSourcesSettings, useDataSources } from '../src/context/data-sources';
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, STTSettings } from '../src/stt/index';
import { UploadedFile, addUpload, getUploads, removeUpload } from '../src/entities/providers/file-upload';
import { parseWithAI } from '../src/entities/ai-parser';
import { SRD_SOURCES } from '../src/entities/providers/srd';
import { Colors, F } from '../src/theme';

type Category = 'display' | 'voice' | 'data' | 'files' | 'ai';

const CATEGORIES: { id: Category; label: string; icon: string; iconFocused: string }[] = [
  { id: 'display', label: 'Display',  icon: 'grid-outline',          iconFocused: 'grid' },
  { id: 'voice',   label: 'Voice',    icon: 'mic-outline',           iconFocused: 'mic' },
  { id: 'data',    label: 'Sources',  icon: 'globe-outline',         iconFocused: 'globe' },
  { id: 'files',   label: 'Files',    icon: 'document-text-outline', iconFocused: 'document-text' },
  { id: 'ai',      label: 'AI Parse', icon: 'sparkles-outline',      iconFocused: 'sparkles' },
];

const CARD_SIZE_LABELS: Record<CardSize, string> = { S: 'S', M: 'M', L: 'L', XL: 'XL' };
const CARD_SIZE_DESCS: Record<CardSize, string> = {
  S: '4/3 cols', M: '3/2 cols', L: '2/2 cols', XL: '2/1 cols',
};
const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  system: 'System', dark: 'Dark', light: 'Light',
};

const SRD_PUBLISHER_GROUPS = (() => {
  const map = new Map<string, { slug: string; label: string }[]>();
  for (const src of SRD_SOURCES) {
    if (!map.has(src.publisher)) map.set(src.publisher, []);
    map.get(src.publisher)!.push({ slug: src.slug, label: src.label });
  }
  return Array.from(map.entries());
})();

function KeyLink({ label, url }: { label: string; url: string }) {
  const C = useColors();
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <Text style={{ color: C.location, fontSize: 11, fontFamily: F.mono, letterSpacing: 0.2 }}>
        {label} ↗
      </Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const C = useColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const styles = useMemo(() => createStyles(C, isWide), [C, isWide]);

  const [category, setCategory] = useState<Category>('display');
  const [sttSettings, setSttSettings] = useState<STTSettings>(DEFAULT_STT_SETTINGS);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);
  const { cardSize, setCardSize, colorScheme, setColorScheme } = useUISettings();
  const { settings: ds, update: updateDs, bumpUploads } = useDataSources();
  const [dsLocal, setDsLocal] = useState<DataSourcesSettings>(ds);
  const voiceSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [pasteFileName, setPasteFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const refreshUploads = useCallback(async () => {
    setUploads(await getUploads());
    bumpUploads();
  }, [bumpUploads]);

  useEffect(() => {
    AsyncStorage.getItem(STT_SETTINGS_KEY).then((raw) => {
      if (raw) setSttSettings({ ...DEFAULT_STT_SETTINGS, ...(JSON.parse(raw) as Partial<STTSettings>) });
    });
    refreshUploads();
    return () => {
      if (voiceSavedTimer.current) clearTimeout(voiceSavedTimer.current);
      if (dataSavedTimer.current) clearTimeout(dataSavedTimer.current);
    };
  }, [refreshUploads]);

  useEffect(() => { setDsLocal(ds); }, [ds]);

  const saveVoice = async () => {
    await AsyncStorage.setItem(STT_SETTINGS_KEY, JSON.stringify(sttSettings));
    setVoiceSaved(true);
    if (voiceSavedTimer.current) clearTimeout(voiceSavedTimer.current);
    voiceSavedTimer.current = setTimeout(() => setVoiceSaved(false), 2000);
  };

  const saveData = async () => {
    await updateDs(dsLocal);
    setDataSaved(true);
    if (dataSavedTimer.current) clearTimeout(dataSavedTimer.current);
    dataSavedTimer.current = setTimeout(() => setDataSaved(false), 2000);
  };

  const toggleSrdSource = (slug: string) => {
    setDsLocal((s) => {
      const current = s.srdSources;
      const next = current.includes(slug)
        ? current.filter((x) => x !== slug)
        : [...current, slug];
      return { ...s, srdSources: next };
    });
  };

  const pickFilesWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.md,.txt,.json';
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      input.onchange = null;
      await Promise.all(files.map((f) => f.text().then((text) => addUpload(f.name, text))));
      await refreshUploads();
    };
    input.click();
  };

  const handlePasteAdd = async () => {
    const name = pasteFileName.trim() || 'Pasted Content.md';
    if (!pasteContent.trim()) return;
    await addUpload(name, pasteContent);
    setPasteFileName('');
    setPasteContent('');
    await refreshUploads();
  };

  const handleDeleteUpload = async (id: string) => {
    await removeUpload(id);
    await refreshUploads();
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

  const isWebSpeech = Platform.OS === 'web';

  // --- Content renderers ---

  const renderDisplay = () => (
    <View style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>CARD SIZE</Text>
        <View style={styles.segmentRow}>
          {(Object.keys(CARD_SIZE_CONFIGS) as CardSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.segment, cardSize === size && styles.segmentActive]}
              onPress={() => setCardSize(size)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, cardSize === size && styles.segmentLabelActive]}>
                {CARD_SIZE_LABELS[size]}
              </Text>
              <Text style={[styles.segmentDesc, cardSize === size && styles.segmentDescActive]}>
                {CARD_SIZE_DESCS[size]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldHint}>Landscape / portrait column counts.</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>THEME</Text>
        <View style={styles.segmentRow}>
          {(['system', 'dark', 'light'] as ColorScheme[]).map((scheme) => (
            <TouchableOpacity
              key={scheme}
              style={[styles.segment, colorScheme === scheme && styles.segmentActive]}
              onPress={() => setColorScheme(scheme)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, colorScheme === scheme && styles.segmentLabelActive]}>
                {COLOR_SCHEME_LABELS[scheme]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldHint}>System follows your device setting. Defaults to dark.</Text>
      </View>
    </View>
  );

  const renderVoice = () => (
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

  const renderData = () => (
    <View style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>D&D 5E SRD</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleBody}>
            <Text style={styles.optionTitle}>Open5e</Text>
            <Text style={styles.optionDesc}>Monsters and magic items. No key required.</Text>
          </View>
          <Switch
            value={dsLocal.srdEnabled}
            onValueChange={(v) => setDsLocal((s) => ({ ...s, srdEnabled: v }))}
            trackColor={{ false: C.border, true: C.active + '80' }}
            thumbColor={dsLocal.srdEnabled ? C.active : C.textSecondary}
          />
        </View>
        {dsLocal.srdEnabled && (
          <View style={styles.sourcesList}>
            <Text style={styles.sourcesLabel}>SOURCES</Text>
            {SRD_PUBLISHER_GROUPS.map(([publisher, sources]) => (
              <View key={publisher} style={styles.publisherGroup}>
                <Text style={styles.publisherLabel}>{publisher}</Text>
                {sources.map((src) => {
                  const checked = dsLocal.srdSources.includes(src.slug);
                  return (
                    <TouchableOpacity
                      key={src.slug}
                      style={[styles.checkRow, checked && styles.checkRowActive]}
                      onPress={() => toggleSrdSource(src.slug)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={9} color={C.bg} />}
                      </View>
                      <Text style={[styles.checkRowLabel, checked && styles.checkRowLabelChecked]}>
                        {src.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>KANKA</Text>
        <Text style={styles.groupDesc}>Campaign world data: characters, locations, factions, items.</Text>
        <TextInput
          style={styles.input}
          value={dsLocal.kankaToken}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaToken: v }))}
          placeholder="API token"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={dsLocal.kankaCampaignId}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaCampaignId: v.replace(/\D/g, '') }))}
          placeholder="Campaign ID (from kanka.io/en/campaign/12345)"
          placeholderTextColor={C.textMuted}
          keyboardType="numeric"
          autoCorrect={false}
        />
        <KeyLink label="Get your Kanka API token" url="https://kanka.io/en/profile/api" />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>HOMEBREWERY</Text>
        <Text style={styles.groupDesc}>Paste the share URL of any public document.</Text>
        <TextInput
          style={styles.input}
          value={dsLocal.homebreweryUrl}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, homebreweryUrl: v }))}
          placeholder="https://homebrewery.naturalcrit.com/share/..."
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>NOTION</Text>
        <Text style={styles.groupDesc}>Fetches pages from your workspace.</Text>
        <TextInput
          style={styles.input}
          value={dsLocal.notionToken}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, notionToken: v }))}
          placeholder="Integration token (secret_...)"
          placeholderTextColor={C.textMuted}
          secureTextEntry
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={dsLocal.notionPageIds}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, notionPageIds: v }))}
          placeholder="Page URLs, comma-separated"
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <KeyLink label="Create a Notion integration" url="https://www.notion.so/my-integrations" />
        <Text style={styles.fieldHint}>Share each page with the integration after creating it.</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>GOOGLE DOCS</Text>
        <Text style={styles.groupDesc}>The doc must be set to "Anyone with the link can view".</Text>
        <TextInput
          style={styles.input}
          value={dsLocal.googleDocsUrl}
          onChangeText={(v) => setDsLocal((s) => ({ ...s, googleDocsUrl: v }))}
          placeholder="https://docs.google.com/document/d/..."
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveData} activeOpacity={0.7}>
        <Text style={styles.saveBtnText}>{dataSaved ? 'Saved' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFiles = () => (
    <View style={styles.contentInner}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>UPLOAD FILES</Text>
        <Text style={styles.groupDesc}>
          Upload .md, .txt, or .json from Obsidian, DiceCloud, or any campaign notes.
        </Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.outlineBtn} onPress={pickFilesWeb} activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={14} color={C.active} style={{ marginRight: 6 }} />
            <Text style={styles.outlineBtnText}>Choose Files</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>PASTE CONTENT</Text>
        <TextInput
          style={styles.input}
          value={pasteFileName}
          onChangeText={setPasteFileName}
          placeholder="File name (e.g. my-campaign.md)"
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={pasteContent}
          onChangeText={setPasteContent}
          placeholder="Paste content here..."
          placeholderTextColor={C.textMuted}
          multiline
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.outlineBtn, !pasteContent.trim() && styles.outlineBtnDisabled]}
          onPress={handlePasteAdd}
          activeOpacity={0.7}
          disabled={!pasteContent.trim()}
        >
          <Text style={styles.outlineBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {uploads.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>UPLOADED ({uploads.length})</Text>
          {uploads.map((f) => (
            <View key={f.id} style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={13} color={C.textDim} />
              <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteUpload(f.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={C.textDim} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAI = () => (
    <View style={styles.contentInner}>
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
          <Ionicons name="sparkles-outline" size={14} color={C.active} style={{ marginRight: 6 }} />
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

  const renderContent = () => {
    switch (category) {
      case 'display': return renderDisplay();
      case 'voice':   return renderVoice();
      case 'data':    return renderData();
      case 'files':   return renderFiles();
      case 'ai':      return renderAI();
    }
  };

  return (
    <View style={styles.root}>
      {isWide ? (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>SETTINGS</Text>
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(active ? cat.iconFocused : cat.icon) as any}
                  size={16}
                  color={active ? C.textPrimary : C.textSecondary}
                />
                <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(active ? cat.iconFocused : cat.icon) as any}
                  size={16}
                  color={active ? C.textPrimary : C.textSecondary}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {cat.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPad}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

function createStyles(C: Colors, isWide: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: isWide ? 'row' : 'column',
      backgroundColor: C.bg,
    },

    // Sidebar (wide)
    sidebar: {
      width: 168,
      backgroundColor: C.bgSurface,
      borderRightWidth: 1,
      borderRightColor: C.border,
      paddingTop: 24,
      paddingBottom: 16,
      paddingHorizontal: 10,
      gap: 2,
    },
    sidebarTitle: {
      color: C.textMuted,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 3,
      fontFamily: F.mono,
      paddingHorizontal: 8,
      paddingBottom: 14,
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 4,
    },
    sidebarItemActive: {
      backgroundColor: C.bgCard,
    },
    sidebarLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
      letterSpacing: 0.3,
    },
    sidebarLabelActive: {
      color: C.textPrimary,
    },

    // Tab bar (narrow)
    tabBar: {
      flexGrow: 0,
      backgroundColor: C.bgSurface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    tabBarContent: {
      paddingHorizontal: 8,
    },
    tab: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: C.active,
    },
    tabLabel: {
      color: C.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      fontFamily: F.mono,
    },
    tabLabelActive: {
      color: C.textPrimary,
    },

    // Content
    content: {
      flex: 1,
    },
    contentPad: {
      flexGrow: 1,
    },
    contentInner: {
      padding: isWide ? 24 : 16,
      gap: 24,
    },

    // Groups
    group: {
      gap: 10,
    },
    groupLabel: {
      color: C.textDim,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 2.5,
      fontFamily: F.mono,
    },
    groupDesc: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: F.mono,
      letterSpacing: 0.2,
      marginTop: -4,
    },
    fieldHint: {
      color: C.textSecondary,
      fontSize: 11,
      fontFamily: F.mono,
      letterSpacing: 0.2,
    },
    warning: {
      color: C.paused,
      fontSize: 11,
      fontFamily: F.mono,
    },

    // Segment controls (card size, theme)
    segmentRow: {
      flexDirection: 'row',
      gap: 6,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
      backgroundColor: C.bgCard,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.border,
      gap: 3,
    },
    segmentActive: {
      borderColor: C.active + '70',
      backgroundColor: C.bgCardPinned,
    },
    segmentLabel: {
      color: C.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: F.mono,
    },
    segmentLabelActive: {
      color: C.active,
    },
    segmentDesc: {
      color: C.textMuted,
      fontSize: 9,
      fontFamily: F.mono,
    },
    segmentDescActive: {
      color: C.active + 'aa',
    },

    // Option rows (radio buttons)
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      backgroundColor: C.bgCard,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    optionRowActive: {
      borderColor: C.active + '60',
      backgroundColor: C.bgCardPinned,
    },
    radio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.borderStrong,
      marginTop: 2,
    },
    radioActive: {
      borderColor: C.active,
      backgroundColor: C.active,
    },
    optionBody: { flex: 1, gap: 3 },
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

    // Toggle row (switch)
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
    toggleBody: { flex: 1, gap: 3 },

    // Inputs
    input: {
      backgroundColor: C.bgInput,
      color: C.textPrimary,
      borderRadius: 3,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 13,
      borderWidth: 1,
      borderColor: C.border,
      fontFamily: F.mono,
    },
    textarea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },

    // Buttons
    saveBtn: {
      backgroundColor: C.active,
      borderRadius: 3,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    saveBtnText: {
      color: C.bg,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontFamily: F.mono,
    },
    outlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.active + '80',
      borderRadius: 3,
      paddingVertical: 10,
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

    // Source selection
    sourcesList: {
      gap: 6,
    },
    publisherGroup: {
      gap: 3,
    },
    sourcesLabel: {
      color: C.textDim,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 2,
      fontFamily: F.mono,
      marginTop: 4,
    },
    publisherLabel: {
      color: C.textMuted,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1,
      fontFamily: F.mono,
      marginTop: 2,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: C.bgCard,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.border,
    },
    checkRowActive: {
      borderColor: C.active + '50',
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: C.active,
      borderColor: C.active,
    },
    checkRowLabel: {
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
    },
    checkRowLabelChecked: {
      color: C.textPrimary,
    },

    // File list
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: C.bgCard,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.border,
    },
    fileName: {
      flex: 1,
      color: C.textSecondary,
      fontSize: 12,
      fontFamily: F.mono,
    },
  });
}
