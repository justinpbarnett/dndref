import { Linking, Text, TouchableOpacity } from 'react-native';
import { useColors } from '../context/ui-settings';
import { F } from '../theme';

export function KeyLink({ label, url }: { label: string; url: string }) {
  const C = useColors();
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <Text style={{ color: C.location, fontSize: 11, fontFamily: F.mono, letterSpacing: 0.2 }}>
        {label} ↗
      </Text>
    </TouchableOpacity>
  );
}
