import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Same vector paths as the website mark, rendered at the device's resolution. */
export default function MonkIcon({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Rect width="64" height="64" rx="18" fill="#C8F092" />
      <Path d="M12 57C13 43 21 37 32 37C43 37 51 43 52 57" fill="#173E2F" />
      <Path
        d="M24 39L32 47L40 39M32 47L38 54"
        fill="none"
        stroke="#C8F092"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Circle
        cx="32"
        cy="24"
        r="14"
        fill="#F8FAF2"
        stroke="#173E2F"
        strokeWidth="2.5"
      />
      <Path
        d="M23 25Q26 28 29 25M35 25Q38 28 41 25"
        fill="none"
        stroke="#173E2F"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M29 32Q32 34 35 32"
        fill="none"
        stroke="#173E2F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
