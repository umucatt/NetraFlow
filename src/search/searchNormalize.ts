import type { NormalizedTextIndex } from './searchTypes';

const PINYIN_BY_CHAR: Record<string, string> = {
  一: 'yi',
  二: 'er',
  三: 'san',
  四: 'si',
  五: 'wu',
  六: 'liu',
  七: 'qi',
  八: 'ba',
  九: 'jiu',
  十: 'shi',
  零: 'ling',
  净: 'jing',
  流: 'liu',
  资: 'zi',
  产: 'chan',
  变: 'bian',
  化: 'hua',
  记: 'ji',
  录: 'lu',
  工: 'gong',
  具: 'ju',
  动: 'dong',
  投: 'tou',
  金: 'jin',
  负: 'fu',
  债: 'zhai',
  现: 'xian',
  银: 'yin',
  行: 'hang',
  卡: 'ka',
  活: 'huo',
  期: 'qi',
  存: 'cun',
  款: 'kuan',
  股: 'gu',
  票: 'piao',
  账: 'zhang',
  户: 'hu',
  基: 'ji',
  养: 'yang',
  老: 'lao',
  信: 'xin',
  用: 'yong',
  消: 'xiao',
  费: 'fei',
  贷: 'dai',
  应: 'ying',
  收: 'shou',
  新: 'xin',
  增: 'zeng',
  删: 'shan',
  除: 'chu',
  修: 'xiu',
  改: 'gai',
  归: 'gui',
  档: 'dang',
  重: 'chong',
  启: 'qi',
  历: 'li',
  史: 'shi',
  快: 'kuai',
  照: 'zhao',
  手: 'shou',
  自: 'zi',
  余: 'yu',
  额: 'e',
  加: 'jia',
  减: 'jian',
  少: 'shao',
  多: 'duo',
  空: 'kong',
  已: 'yi',
  未: 'wei',
  计: 'ji',
  入: 'ru',
  类: 'lei',
  型: 'xing',
  小: 'xiao',
  大: 'da',
  备: 'bei',
  份: 'fen',
  导: 'dao',
  出: 'chu',
  条: 'tiao',
  数: 'shu',
  总: 'zong',
  量: 'liang',
  目: 'mu',
  前: 'qian',
  后: 'hou',
  间: 'jian',
  时: 'shi',
  日: 'ri',
  周: 'zhou',
  月: 'yue',
  年: 'nian',
  中: 'zhong',
  国: 'guo',
  建: 'jian',
  设: 'she',
  农: 'nong',
  商: 'shang',
  招: 'zhao',
  交: 'jiao',
  通: 'tong',
  邮: 'you',
  储: 'chu',
  民: 'min',
  生: 'sheng',
  广: 'guang',
  发: 'fa',
  兴: 'xing',
  业: 'ye',
  平: 'ping',
  安: 'an',
  浦: 'pu',
  保: 'bao',
  险: 'xian',
  理: 'li',
  财: 'cai',
  定: 'ding',
  钱: 'qian',
  包: 'bao',
  微: 'wei',
  支: 'zhi',
  付: 'fu',
  花: 'hua',
  借: 'jie',
  房: 'fang',
  车: 'che',
  租: 'zu',
  薪: 'xin',
  奖: 'jiang',
  红: 'hong',
  美: 'mei',
  元: 'yuan',
  港: 'gang',
  欧: 'ou',
  币: 'bi',
  人: 'ren',
  本: 'ben'
};

const pinyinCache = new Map<string, { full: string; initials: string }>();
const normalizedTextCache = new Map<string, NormalizedTextIndex>();

export const isPureLetterToken = (value: string) => /^[a-z]+$/i.test(value);

export const hasChineseSearchSignal = (query: string) => /[\u3400-\u9fff]/u.test(query);

export const getAlphanumericSearchSignalLength = (query: string) =>
  Array.from(query.normalize('NFKC')).filter((character) => /[a-z0-9]/i.test(character))
    .length;

export const canAutoSwitchSearchCategory = (query: string) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return false;
  }

  if (hasChineseSearchSignal(trimmedQuery)) {
    return true;
  }

  return getAlphanumericSearchSignalLength(trimmedQuery) >= 2;
};

export const tokenizeSearchQuery = (query: string) => query.trim().split(/\s+/).filter(Boolean);

const isSearchTextCharacter = (value: string) => /[\p{L}\p{N}]/u.test(value);

const createNormalizedTextIndex = (value: string): NormalizedTextIndex => {
  const normalizedCharacters: string[] = [];
  const normalizedToOriginal: number[] = [];
  let previousWasSpace = true;

  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    const originalCharacter = String.fromCodePoint(codePoint ?? value.charCodeAt(index));
    const originalIndex = index;
    index += originalCharacter.length;

    const normalizedCharacter = originalCharacter.normalize('NFKC').toLocaleLowerCase('zh-CN');
    const searchableCharacters = Array.from(normalizedCharacter).filter(isSearchTextCharacter);

    if (searchableCharacters.length === 0) {
      if (!previousWasSpace) {
        normalizedCharacters.push(' ');
        normalizedToOriginal.push(originalIndex);
        previousWasSpace = true;
      }

      continue;
    }

    searchableCharacters.forEach((character) => {
      normalizedCharacters.push(character);
      normalizedToOriginal.push(originalIndex);
    });
    previousWasSpace = false;
  }

  while (normalizedCharacters[0] === ' ') {
    normalizedCharacters.shift();
    normalizedToOriginal.shift();
  }

  while (normalizedCharacters[normalizedCharacters.length - 1] === ' ') {
    normalizedCharacters.pop();
    normalizedToOriginal.pop();
  }

  const compactCharacters: string[] = [];
  const compactToOriginal: number[] = [];

  normalizedCharacters.forEach((character, index) => {
    if (character === ' ') {
      return;
    }

    compactCharacters.push(character);
    compactToOriginal.push(normalizedToOriginal[index]);
  });

  return {
    original: value,
    normalized: normalizedCharacters.join(''),
    compact: compactCharacters.join(''),
    normalizedToOriginal,
    compactToOriginal
  };
};

export const getNormalizedTextIndex = (value: string | null | undefined) => {
  const text = String(value ?? '');
  const cached = normalizedTextCache.get(text);

  if (cached) {
    return cached;
  }

  const index = createNormalizedTextIndex(text);
  normalizedTextCache.set(text, index);

  return index;
};

export const normalizeSearchText = (value: string) => getNormalizedTextIndex(value).normalized;

export const compactSearchText = (value: string) => getNormalizedTextIndex(value).compact;

export const getPinyinParts = (value: string) => {
  const cached = pinyinCache.get(value);

  if (cached) {
    return cached;
  }

  const syllables = Array.from(value)
    .map((character) => {
      const normalizedCharacter = character.normalize('NFKC').toLocaleLowerCase('zh-CN');

      return (
        PINYIN_BY_CHAR[character] ??
        PINYIN_BY_CHAR[normalizedCharacter] ??
        (/^[a-z0-9]$/i.test(normalizedCharacter) ? normalizedCharacter : '')
      );
    })
    .filter(Boolean);
  const parts = {
    full: syllables.join('').toLocaleLowerCase('zh-CN'),
    initials: syllables.map((syllable) => syllable[0] ?? '').join('').toLocaleLowerCase('zh-CN')
  };

  pinyinCache.set(value, parts);

  return parts;
};
