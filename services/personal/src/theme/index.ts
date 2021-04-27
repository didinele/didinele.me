import { extendTheme } from '@chakra-ui/react';

const COLORS = { } as const;
Object.freeze(COLORS);

const CONFIG = {
  initialColorMode: 'dark',
  useSystemColorMode: true
} as const;
Object.freeze(CONFIG);

const STYLES = { } as const;
Object.freeze(STYLES);

export { COLORS, CONFIG, STYLES };

export default extendTheme({
  styles: STYLES,
  config: CONFIG,
  colors: COLORS
});
