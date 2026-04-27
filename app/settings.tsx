import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { Ionicon } from '../src/components/Ionicon';
import { createDefaultDataSourceSettings, type DataSourcesSettings, useDataSources } from '../src/context/data-sources';
import { useSession } from '../src/context/session';
import { useColors, useUISettings } from '../src/context/ui-settings';
import { parseWithAI } from '../src/entities/ai-parser';
import { Category, CATEGORIES } from '../src/settings/constants';
import { useFilesSettingsCategory } from '../src/settings/files-settings-category';
import { AISection } from '../src/settings/renderers/AISection';
import { DataSection } from '../src/settings/renderers/DataSection';
import { DisplaySection } from '../src/settings/renderers/DisplaySection';
import { FilesSection } from '../src/settings/renderers/FilesSection';
import { VoiceSection } from '../src/settings/renderers/VoiceSection';
import { createStyles } from '../src/settings/styles';
import { useVoiceSettingsCategory } from '../src/settings/voice-settings-category';
import {
  createAppDataWriteToken,
  isAppDataWriteTokenCurrent,
} from '../src/storage/app-data';

export default function SettingsScreen() {
  const C = useColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const styles = useMemo(() => createStyles(C, isWide), [C, isWide]);

  const [category, setCategory] = useState<Category>('display');
  const [dataSaved, setDataSaved] = useState(false);
  const { cardSize, setCardSize, colorScheme, setColorScheme, resetUISettings } = useUISettings();
  const { settings: ds, update: updateDs, bumpUploads, reset: resetDataSources } = useDataSources();
  const { stop: stopSession } = useSession();
  const {
    sttSettings,
    setSttSettings,
    saveVoice,
    voiceSaved,
    isWebSpeech,
    resetVoiceSettings,
  } = useVoiceSettingsCategory();
  const [dsLocal, setDsLocal] = useState<DataSourcesSettings>(ds);
  const dataSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiContent, setAiContent] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const resetAfterDeleteAll = useCallback(() => {
    resetDataSources();
    resetUISettings();
    resetVoiceSettings();
    setDsLocal(createDefaultDataSourceSettings());
    setAiContent('');
    setAiResult('');
    setDataSaved(false);
  }, [resetDataSources, resetUISettings, resetVoiceSettings]);

  const filesCategory = useFilesSettingsCategory({
    bumpUploads,
    stopSession,
    onDeleteAllDataReset: resetAfterDeleteAll,
  });

  useEffect(() => () => {
    if (dataSavedTimer.current) clearTimeout(dataSavedTimer.current);
  }, []);

  useEffect(() => { setDsLocal(ds); }, [ds]);

  const saveData = async () => {
    await updateDs(dsLocal);
    setDataSaved(true);
    if (dataSavedTimer.current) clearTimeout(dataSavedTimer.current);
    dataSavedTimer.current = setTimeout(() => setDataSaved(false), 2000);
  };

  const handleAIParse = async () => {
    if (!aiContent.trim() || !dsLocal.aiApiKey) return;
    const token = createAppDataWriteToken();
    setAiParsing(true);
    setAiResult('');
    try {
      const entities = await parseWithAI(aiContent, dsLocal.aiApiKey);
      if (!isAppDataWriteTokenCurrent(token)) return;
      const name = `AI Parsed ${new Date().toLocaleDateString()}.json`;
      await filesCategory.saveUpload(name, JSON.stringify(entities));
      if (!isAppDataWriteTokenCurrent(token)) return;
      setAiResult(`Found ${entities.length} entities. Saved as "${name}".`);
      setAiContent('');
    } catch (e: unknown) {
      setAiResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiParsing(false);
    }
  };

  const renderContent = () => {
    switch (category) {
      case 'display':
        return <DisplaySection cardSize={cardSize} setCardSize={setCardSize} colorScheme={colorScheme} setColorScheme={setColorScheme} styles={styles} />;
      case 'voice':
        return <VoiceSection sttSettings={sttSettings} setSttSettings={setSttSettings} saveVoice={saveVoice} voiceSaved={voiceSaved} isWebSpeech={isWebSpeech} styles={styles} />;
      case 'data':
        return <DataSection dsLocal={dsLocal} setDsLocal={setDsLocal} saveData={saveData} dataSaved={dataSaved} styles={styles} />;
      case 'files':
        return (
          <FilesSection
            uploads={filesCategory.uploads}
            removingUploadId={filesCategory.removingUploadId}
            pasteFileName={filesCategory.pasteFileName}
            setPasteFileName={filesCategory.setPasteFileName}
            pasteContent={filesCategory.pasteContent}
            setPasteContent={filesCategory.setPasteContent}
            pickFilesWeb={filesCategory.pickFilesWeb}
            handlePasteAdd={filesCategory.handlePasteAdd}
            handleDeleteUpload={filesCategory.handleDeleteUpload}
            handleDeleteAllData={filesCategory.handleDeleteAllData}
            deleteAllPending={filesCategory.deleteAllPending}
            deleteAllStatus={filesCategory.deleteAllStatus}
            styles={styles}
          />
        );
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
                <Ionicon
                  name={active ? cat.iconFocused : cat.icon}
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
                <Ionicon
                  name={active ? cat.iconFocused : cat.icon}
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
