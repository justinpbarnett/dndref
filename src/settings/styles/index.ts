import { createControlStyles } from './controls';
import { createFileStyles } from './files';
import { createGroupStyles } from './groups';
import { createLayoutStyles } from './layout';
import { createSourceStyles } from './sources';
import { Colors } from '../../theme';

export function createStyles(C: Colors, isWide: boolean) {
  return {
    ...createLayoutStyles(C, isWide),
    ...createGroupStyles(C),
    ...createControlStyles(C),
    ...createSourceStyles(C),
    ...createFileStyles(C),
    __colors: C,
  };
}
