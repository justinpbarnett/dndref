import { Colors } from '../../theme';
import { createLayoutStyles } from './layout';
import { createGroupStyles } from './groups';
import { createControlStyles } from './controls';
import { createSourceStyles } from './sources';
import { createFileStyles } from './files';

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
