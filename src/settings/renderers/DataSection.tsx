import React from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import { Ionicon } from "../../components/Ionicon";
import { useColors } from "../../context/ui-settings";
import { SRD_SOURCES } from "../../entities/providers/srd";
import { rulesetFor, type SourceGroupId } from "../../rulesets/index";
import { KeyLink } from "../KeyLink";
import { DataSectionProps } from "../types";
import { RulesetPicker } from "./RulesetPicker";
import { SettingsInput } from "./SettingsInput";

const SRD_PUBLISHER_GROUPS = Array.from(
  SRD_SOURCES.reduce((map, src) => {
    map.set(src.publisher, [...(map.get(src.publisher) ?? []), { slug: src.slug, label: src.label }]);
    return map;
  }, new Map<string, { slug: string; label: string }[]>()).entries(),
);

/**
 * What a source group is given: the draft, and nothing about saving it.
 *
 * Save belongs to the screen, not to a group, so no group can grow its own.
 */
type SourceGroupProps = Pick<DataSectionProps, "dsLocal" | "setDsLocal" | "styles">;

export function DataSection({ dsLocal, setDsLocal, saveData, dataSaved, styles }: DataSectionProps) {
  const groupProps: SourceGroupProps = { dsLocal, setDsLocal, styles };

  return (
    <View testID="settings-content" style={styles.contentInner}>
      <RulesetPicker
        value={dsLocal.rulesetId}
        onChange={(rulesetId) => setDsLocal((s) => ({ ...s, rulesetId }))}
        styles={styles}
      />

      {/* The draft decides, not the saved setting, so the fields below follow the
          picker as soon as it is touched rather than a save later. */}
      {rulesetFor(dsLocal.rulesetId).sources.map((id) => {
        const Group = SOURCE_GROUPS[id];
        return <Group key={id} {...groupProps} />;
      })}

      <TouchableOpacity style={styles.saveBtn} onPress={saveData} activeOpacity={0.7}>
        <Text style={styles.saveBtnText}>{dataSaved ? "Saved" : "Save"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SrdGroup({ dsLocal, setDsLocal, styles }: SourceGroupProps) {
  const C = useColors();

  const toggleSrdSource = (slug: string) => {
    setDsLocal((s) => {
      const current = s.srdSources;
      const next = current.includes(slug) ? current.filter((x) => x !== slug) : [...current, slug];
      return { ...s, srdSources: next };
    });
  };

  return (
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
          trackColor={{ false: C.border, true: C.active + "80" }}
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
                    <Text style={[styles.checkRowLabel, checked && styles.checkRowLabelChecked]}>{src.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function KankaGroup({ dsLocal, setDsLocal, styles }: SourceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>KANKA</Text>
      <Text style={styles.groupDesc}>Campaign world data: characters, locations, factions, items.</Text>
      <SettingsInput
        styles={styles}
        value={dsLocal.kankaToken}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaToken: v }))}
        placeholder="API token"
        secureTextEntry
      />
      <SettingsInput
        styles={styles}
        value={dsLocal.kankaCampaignId}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, kankaCampaignId: v.replace(/\D/g, "") }))}
        placeholder="Campaign ID (from kanka.io/en/campaign/12345)"
        keyboardType="numeric"
        autoCapitalize={undefined}
      />
      <KeyLink label="Get your Kanka API token" url="https://kanka.io/en/profile/api" />
    </View>
  );
}

function HomebreweryGroup({ dsLocal, setDsLocal, styles }: SourceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>HOMEBREWERY</Text>
      <Text style={styles.groupDesc}>Paste the share URL of any public document.</Text>
      <SettingsInput
        styles={styles}
        value={dsLocal.homebreweryUrl}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, homebreweryUrl: v }))}
        placeholder="https://homebrewery.naturalcrit.com/share/..."
      />
    </View>
  );
}

function NotionGroup({ dsLocal, setDsLocal, styles }: SourceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>NOTION</Text>
      <Text style={styles.groupDesc}>Fetches pages from your workspace.</Text>
      <SettingsInput
        styles={styles}
        value={dsLocal.notionToken}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, notionToken: v }))}
        placeholder="Integration token (secret_...)"
        secureTextEntry
      />
      <SettingsInput
        styles={styles}
        value={dsLocal.notionPageIds}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, notionPageIds: v }))}
        placeholder="Page URLs, comma-separated"
      />
      <KeyLink label="Create a Notion integration" url="https://www.notion.so/my-integrations" />
      <Text style={styles.fieldHint}>Share each page with the integration after creating it.</Text>
    </View>
  );
}

function GoogleDocsGroup({ dsLocal, setDsLocal, styles }: SourceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>GOOGLE DOCS</Text>
      <Text style={styles.groupDesc}>The doc must be set to "Anyone with the link can view".</Text>
      <SettingsInput
        styles={styles}
        value={dsLocal.googleDocsUrl}
        onChangeText={(v) => setDsLocal((s) => ({ ...s, googleDocsUrl: v }))}
        placeholder="https://docs.google.com/document/d/..."
      />
    </View>
  );
}

/**
 * The one source with nothing to configure, which is most of what it has to say.
 *
 * It is here rather than left out so that Magic does not read as a game with no
 * sources at all, and so there is somewhere to say that the campaign fields and
 * uploads are unused until the game is switched back.
 */
function ScryfallGroup({ styles }: SourceGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>SCRYFALL</Text>
      <Text style={styles.groupDesc}>Every Magic card, by name. No key required.</Text>
      <Text style={styles.fieldHint}>Card text is fetched only for the cards that reach the table.</Text>
      <Text style={styles.fieldHint}>
        Campaign sources and uploaded files are kept, but not read while the game is Magic.
      </Text>
    </View>
  );
}

const SOURCE_GROUPS: Record<SourceGroupId, React.ComponentType<SourceGroupProps>> = {
  srd: SrdGroup,
  kanka: KankaGroup,
  homebrewery: HomebreweryGroup,
  notion: NotionGroup,
  googleDocs: GoogleDocsGroup,
  scryfall: ScryfallGroup,
};
