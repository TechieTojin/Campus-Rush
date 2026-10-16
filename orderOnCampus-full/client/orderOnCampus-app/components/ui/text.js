import React, { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

// Campus Rush typeface: Plus Jakarta Sans (SIL Open Font License), loaded in App.js.
// Android can't synthesise weights for custom fonts, so each weight maps to its own face.
export const FONT = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
  900: 'PlusJakartaSans_800ExtraBold',
};
let fontsReady = false;
export const setFontsReady = (v) => { fontsReady = v; };

const Nested = createContext(false);

const withFont = (style, nested) => {
  const flat = StyleSheet.flatten(style) || {};
  if (!fontsReady || flat.fontFamily) return style;
  // Nested spans inherit the parent's face unless they choose their own weight.
  if (nested && !flat.fontWeight) return style;
  const w = String(flat.fontWeight || '400').replace('normal', '400').replace('bold', '700');
  const { fontWeight, ...rest } = flat;
  return { ...rest, fontFamily: FONT[w] || FONT[400] };
};

export const Text = forwardRef(function Text({ style, ...props }, ref) {
  const nested = useContext(Nested);
  return (
    <Nested.Provider value>
      <RNText ref={ref} {...props} style={withFont(style, nested)} maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.4} />
    </Nested.Provider>
  );
});

export const TextInput = forwardRef(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={withFont(style, false)} maxFontSizeMultiplier={1.3} />;
});
