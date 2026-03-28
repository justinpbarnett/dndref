import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform, ScrollView, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useColors, useUISettings } from '../src/context/ui-settings';
import { DataSourcesSettings, useDataSources } from '../src/context/data-sources';
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, STTSettings } from '../src/stt/index';
import { UploadedFile, addUpload, getUploads, removeUpload } from '../src/entities/providers/file-upload';
import { parseWithAI } from '../src/entities/ai-parser';
import { Category, CATEGORIES } from './settings/constants';
import { DisplaySection } from './settings/renderers/DisplaySection';
import { VoiceSection } from './settings/renderers/VoiceSection';
import { DataSection } from './settings/renderers/DataSection';
import { FilesSection } from './settings/renderers/FilesSection';
import { AISection } from './settings/renderers/AISection';
import { createStyles } from './settings/styles';

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
      if (raw) {
        try {
          setSttSettings({ ...DEFAULT_STT_SETTINGS, ...(JSON.parse(raw) as Partial<STTSettings>) });
        } catch (parseErr) {
          console.warn('[dnd-ref] Failed to parse STT settings:', parseErr);
        }
      }
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

  const renderContent = () => {
    switch (category) {
      case 'display':
        return <DisplaySection cardSize={cardSize} setCardSize={setCardSize} colorScheme={colorScheme} setColorScheme={setColorScheme} styles={styles} />;
      case 'voice':
        return <VoiceSection sttSettings={sttSettings} setSttSettings={setSttSettings} saveVoice={saveVoice} voiceSaved={voiceSaved} isWebSpeech={isWebSpeech} styles={styles} />;
      case 'data':
        return <DataSection dsLocal={dsLocal} setDsLocal={setDsLocal} saveData={saveData} dataSaved={dataSaved} styles={styles} />;
      case 'files':
        return <FilesSection uploads={uploads} refreshUploads={refreshUploads} pasteFileName={pasteFileName} setPasteFileName={setPasteFileName} pasteContent={pasteContent} setPasteContent={setPasteContent} pickFilesWeb={pickFilesWeb} handlePasteAdd={handlePasteAdd} handleDeleteUpload={handleDeleteUpload} styles={styles} />;
      case 'ai':
        return <AISection dsLocal={dsLocal} setDsLocal={setDsLocal} aiContent={aiContent} setAiContent={setAiContent} aiParsing={aiParsing} aiResult={aiResult} handleAIParse={handleAIParse} styles={styles} />;
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}
