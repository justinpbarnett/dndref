import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useDataSources } from "../context/data-sources/provider";
import { useSession } from "../context/session";
import { useColors } from "../context/ui-settings";
import { ALL_RULESETS, rulesetFor } from "../rulesets/index";
import { Colors, F } from "../theme";

/**
 * Which game the table is playing, on the screen the table is looking at.
 *
 * It writes the one setting the ruleset is read from, so switching reloads the
 * world and swaps the matcher through the same path as any other settings
 * change. The hint says which matcher is running, because that is the part of
 * the switch a player would otherwise only infer from cards not appearing.
 */
export function RulesetToggle() {
  const C = useColors();
  const { settings, update } = useDataSources();
  const { entityStatus } = useSession();
  const styles = useMemo(() => createStyles(C), [C]);

  const activeId = rulesetFor(settings.rulesetId).id;
  const matching = rulesetFor(activeId).matching;
  const hint = entityStatus === "loading" ? "Loading world…" : `${matching} name matching`;

  return (
    <View style={styles.bar}>
      <View style={styles.segmentRow} role="radiogroup">
        {ALL_RULESETS.map((ruleset) => {
          const selected = ruleset.id === activeId;
          return (
            <TouchableOpacity
              key={ruleset.id}
              testID={`ruleset-${ruleset.id}`}
              style={[styles.segment, selected && styles.segmentActive]}
              onPress={() => void update({ rulesetId: ruleset.id })}
              role="radio"
              aria-checked={selected}
              aria-label={`Switch to ${ruleset.label}`}
              activeOpacity={0.75}
            >
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>{ruleset.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

const createStyles = (C: Colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 7,
      backgroundColor: C.bg,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    segmentRow: { flexDirection: "row", gap: 4 },
    segment: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.border,
    },
    segmentActive: { borderColor: C.active + "70", backgroundColor: C.bgCardPinned },
    segmentLabel: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      fontFamily: F.mono,
    },
    segmentLabelActive: { color: C.active },
    hint: { color: C.textMuted, fontSize: 10, letterSpacing: 0.6, fontFamily: F.mono, flexShrink: 1 },
  });
