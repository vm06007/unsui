// Best-effort EN names for well-known stations/lines that show up in the
// bundled station code table (see stationCodes.README.md, which is
// Japanese-only). Anything not listed here falls back to the original
// Japanese name in EN mode too, rather than guessing at a romanization.
export const STATION_NAME_EN: Record<string, string> = {
  渋谷: 'Shibuya',
  虎ノ門: 'Toranomon',
  新橋: 'Shinbashi',
  銀座: 'Ginza',
  銀座一丁目: 'Ginza-itchome',
  表参道: 'Omotesando',
  外苑前: 'Gaienmae',
  青山一丁目: 'Aoyama-itchome',
  赤坂見附: 'Akasaka-mitsuke',
  赤坂: 'Akasaka',
  溜池山王: 'Tameike-sanno',
  乃木坂: 'Nogizaka',
  日本橋: 'Nihombashi',
  三越前: 'Mitsukoshimae',
  神田: 'Kanda',
  末広町: 'Suehirocho',
  上野広小路: 'Ueno-hirokoji',
  上野: 'Ueno',
  稲荷町: 'Inaricho',
  田原町: 'Tawaramachi',
  浅草: 'Asakusa',
  東京: 'Tokyo',
  有楽町: 'Yurakucho',
  新宿: 'Shinjuku',
  池袋: 'Ikebukuro',
  品川: 'Shinagawa',
  横浜: 'Yokohama',
  秋葉原: 'Akihabara',
  大手町: 'Otemachi',
  二重橋前: 'Nijubashimae',
  日比谷: 'Hibiya',
  霞ヶ関: 'Kasumigaseki',
  国会議事堂前: 'Kokkai-gijidomae',
  明治神宮前: 'Meiji-jingumae',
  代々木公園: 'Yoyogi-koen',
  代々木上原: 'Yoyogi-uehara',
  北千住: 'Kita-senju',
  町屋: 'Machiya',
  西日暮里: 'Nishi-nippori',
  千駄木: 'Sendagi',
  根津: 'Nezu',
  湯島: 'Yushima',
  新御茶ノ水: 'Shin-ochanomizu',
  和光市: 'Wako-shi',
};

export const LINE_NAME_EN: Record<string, string> = {
  '3号線銀座': 'Ginza Line',
  '9号線千代田支線': 'Chiyoda Line (branch)',
  '9号線千代田': 'Chiyoda Line',
  '8号線有楽町': 'Yurakucho Line',
  東海道本: 'Tokaido Main Line',
  山手線: 'Yamanote Line',
  中央本: 'Chuo Main Line',
};

export type DisplayLanguage = 'en' | 'ja';

export function translateStationName(
  name: string | null,
  lang: DisplayLanguage,
): string | null {
  if (!name) return null;
  return lang === 'en' ? STATION_NAME_EN[name] ?? name : name;
}

export function translateLineName(
  name: string | null,
  lang: DisplayLanguage,
): string | null {
  if (!name) return null;
  return lang === 'en' ? LINE_NAME_EN[name] ?? name : name;
}

export function translateRoute(
  value: string | null,
  lang: DisplayLanguage,
): string | null {
  if (!value) return null;
  const [station, line] = value.split(' · ');
  return [
    translateStationName(station, lang),
    line && translateLineName(line, lang),
  ]
    .filter(Boolean)
    .join(' · ');
}
