export const iconChoices = [['book','Livro'], ['code','Código'], ['brain','Ideias'], ['target','Objetivo'], ['flask','Ciência'], ['music','Música']];
export const emojiChoices = [['📚','Livros'], ['🧠','Cérebro'], ['💻','Computador'], ['🎯','Alvo'], ['🚀','Foguete'], ['🎨','Arte'], ['🌎','Mundo'], ['⚡','Energia']];

export function parseEmoji(input) {
  if (typeof input !== 'string' || input.length > 200) return null;
  let value = input.trim();
  try {
    if (/^(?:(?:U\+|0x)?[0-9a-f]{2,6}[\s-]*)+$/i.test(value)) {
      value = value.split(/[\s-]+/).filter(Boolean).map(code => String.fromCodePoint(parseInt(code.replace(/^(U\+|0x)/i, ''),16))).join('');
    } else if (/^(?:&#(?:x[0-9a-f]+|[0-9]+);\s*)+$/i.test(value)) {
      value = [...value.matchAll(/&#(x[0-9a-f]+|[0-9]+);/gi)].map(([, code]) => String.fromCodePoint(parseInt(code.replace(/^x/i,''), /^x/i.test(code) ? 16 : 10))).join('');
    }
  } catch { return null; }
  if (!value || [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].length !== 1) return null;
  const emoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u;
  const allowed = /^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200d\ufe0f\ufe0e\u20e3#*0-9\u{e0020}-\u{e007f}]+$/u;
  return emoji.test(value) && allowed.test(value) ? value : null;
}

export function validSymbol(value) {
  return typeof value === 'string' && (iconChoices.some(([name]) => value === `icon:${name}`) || parseEmoji(value) === value);
}
