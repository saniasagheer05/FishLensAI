import { Platform, TextStyle } from 'react-native';
import Colors from './Colors';

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, Cambria, "Times New Roman", serif',
  default: 'serif',
});

const sansFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'sans-serif',
});

export const Typography: { [key: string]: TextStyle } = {
  h1Serif: {
    fontFamily: serifFont,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h2Serif: {
    fontFamily: serifFont,
    fontSize: 21,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  h3Serif: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  brandTitle: {
    fontFamily: serifFont,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 0.2,
  },
  bodyRegular: {
    fontFamily: sansFont,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bodyMedium: {
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  bodyBold: {
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  caption: {
    fontFamily: sansFont,
    fontSize: 12,
    color: Colors.textMuted,
  },
  buttonText: {
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
};

export default Typography;
