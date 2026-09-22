import { Text, TouchableOpacity, View } from "react-native";

import { useDataSources } from "../../context/data-sources/provider";
import { useSession } from "../../context/session";
import { ALL_RULESETS, rulesetFor, type RulesetId } from "../../rulesets/index";
import type { createStyles } from "../styles";

type RulesetPickerProps = {
  value: RulesetId;
  onChange: (id: RulesetId) => void;
  styles: ReturnType<typeof createStyles>;
};

/**
 * Which game the table is playing, at the top of the sources it decides.
 *
 * It is the one field on this screen that changes what the rest of the screen
 * asks for, so it sits above them and edits the same draft they do. Saving is
 * what switches the game, and until then the hint says so: the source groups
 * below have already changed, which would otherwise read as the switch having
 * happened.
 */
export function RulesetPicker({ value, onChange, styles }: RulesetPickerProps) {
  const { settings } = useDataSources();
  const { entityStatus } = useSession();
  const ruleset = rulesetFor(value);
  const unsaved = value !== settings.rulesetId;

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>GAME</Text>
      <Text style={styles.groupDesc}>Decides which sources are read and how spoken names are matched.</Text>
      <View style={styles.segmentRow} role="radiogroup">
        {ALL_RULESETS.map((option) => {
          const selected = option.id === value;
          return (
            <TouchableOpacity
              key={option.id}
              testID={`ruleset-${option.id}`}
              style={[styles.segment, selected && styles.segmentActive]}
              onPress={() => onChange(option.id)}
              role="radio"
              aria-checked={selected}
              aria-label={`Switch to ${option.label}`}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text testID="ruleset-hint" style={styles.fieldHint}>
        {pickerHint({ unsaved, loading: entityStatus === "loading", matching: ruleset.matching })}
      </Text>
    </View>
  );
}

type PickerHintInput = { unsaved: boolean; loading: boolean; matching: string };

const pickerHint = ({ unsaved, loading, matching }: PickerHintInput): string => {
  if (unsaved) return "Save to switch games.";
  if (loading) return "Loading world…";
  return `${matching} name matching`;
};
