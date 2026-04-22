import React from 'react';
import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Ionicon } from '../../components/Ionicon';
import { SRD_SOURCES } from '../../entities/providers/srd';
import { KeyLink } from '../KeyLink';
import { DataSectionProps } from '../types';

const SRD_PUBLISHER_GROUPS = (() => {
  const map = new Map<string, { slug: string; label: string }[]>();
  for (const src of SRD_SOURCES) {
    if (!map.has(src.publisher)) map.set(src.publisher, []);
    map.get(src.publisher)!.push({ slug: src.slug, label: src.label });
  }
  return Array.from(map.entries());
})();

export function DataSection({ dsLocal, setDsLocal, saveData, dataSaved, styles }: DataSectionProps) {
  const C = styles.__colors;

  const toggleSrdSource = (slug: string) => {
    setDsLocal((s) => {
      const current = s.srdSources;
      const next = current.includes(slug)
        ? current.filter((x) => x !== slug)
        : [...current, slug];
      return { ...s, srdSources: next };
    });
  };

  return (
    <View testID="settings-content" style={styles.contentInner}>
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
                        {checked && <Ionicon name="checkmark" size={9} color={C.bg} />}
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
}
