import { View } from "react-native";

import { CardGrid } from "../src/components/CardGrid";
import { RulesetToggle } from "../src/components/RulesetToggle";
import { SessionControls } from "../src/components/SessionControls";
import { useColors } from "../src/context/ui-settings";

export default function ReferenceScreen() {
  const C = useColors();
  return (
    <View style={[{ flex: 1 }, { backgroundColor: C.bg }]}>
      <SessionControls />
      <RulesetToggle />
      <CardGrid />
    </View>
  );
}
