import type { CreatureId } from './types.ts';

const INK = '#261a32';
const PAPER = '#fff1d9';
let artworkSequence = 0;

type Paint = (name: string, light: string, dark: string) => string;

function eyes(left: number, right: number, y: number, size = 9): string {
  return `<g class="creature-eyes">${[left, right].map((x) => `
    <g transform="translate(${x} ${y})">
      <ellipse rx="${size}" ry="${size + 2}" fill="${PAPER}" stroke="${INK}" stroke-width="1.8"/>
      <g class="creature-pupil">
        <ellipse cx=".8" rx="${size * .55}" ry="${size * .72}" fill="${INK}"/>
        <circle cx="2.1" cy="-2.8" r="1.6" fill="#fffaf0"/>
      </g>
    </g>`).join('')}</g>`;
}

function mouth(y: number, teeth = ''): string {
  return `<g class="creature-mouth" data-mouth="smile" transform="translate(0 ${y})">
    <g data-shape="smile">
      <path d="M-12 -3 Q0 1 12 -3 Q9 11 0 11 Q-9 11 -12 -3Z" fill="${INK}"/>
      <path d="M-5 8 Q0 3 6 8 Q1 13 -5 8Z" fill="#f08290"/>
      ${teeth}
    </g>
    <path data-shape="closed" d="M-9 0 Q0 5 9 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <ellipse data-shape="small" cy="3" rx="5" ry="5.5" fill="${INK}"/>
    <g data-shape="open">
      <ellipse cy="5" rx="9" ry="10" fill="${INK}"/>
      <ellipse cy="10" rx="4.5" ry="2.8" fill="#f08290"/>
    </g>
    <g data-shape="wide">
      <path d="M-14 -4 Q0 -7 14 -4 Q13 15 0 15 Q-13 15 -14 -4Z" fill="${INK}"/>
      <ellipse cy="10" rx="7" ry="3.5" fill="#f08290"/>
      ${teeth}
    </g>
  </g>`;
}

function cheeks(x: number, y: number, fill: string): string {
  return `<g class="creature-cheek" fill="${fill}" opacity=".95">
    <ellipse cx="${-x}" cy="${y}" rx="6" ry="3.5"/>
    <ellipse cx="${x}" cy="${y}" rx="6" ry="3.5"/>
  </g>`;
}

const fangs = '<path d="M-8 -3h5l-2 5ZM3 -3h5L5 2Z" fill="#fff1d9"/>';

const characters: Record<CreatureId, (paint: Paint) => string> = {
  pip: (paint) => `
    <path d="M-36 -47Q-56 -50 -60 -67M35 -40Q53 -41 58 -52" stroke="#8c6237" stroke-width="7" fill="none"/>
    <path d="M-23 -21l-4 17m50 -16 4 16" stroke="#609071" stroke-width="8"/>
    <path d="M-28 -8q-13 0-13 8h26v-8m42 0q13 0 13 8H14v-8" fill="#543e62"/>
    <path d="M-9 -94q-4-15 4-24l12 3q-5 11 1 20" fill="#74966a"/>
    <path d="M-8 -99Q-31 -123 -44 -103Q-30 -92 -8 -91" fill="#aed18c"/>
    <path d="M-8 -96q-10 -7 -24 -7" fill="none" stroke="#588764" stroke-width="2"/>
    <path d="M1 -91Q27 -122 43 -104q8 11-7 14" fill="none" stroke="#88b283" stroke-width="4"/>
    <path d="M-53 -53Q-54 -85 -31 -92q15-9 31 0 16-10 31 0 22 9 22 39 0 37-28 40-25 8-50 0-28-4-28-40Z" fill="${paint('rind', '#ffad61', '#d7553c')}"/>
    <path d="M-27 -88q-24 34 -3 68M26 -88q24 34 3 68" fill="none" stroke="#913c52" stroke-width="2" opacity=".63"/>
    <path d="M-35 -75q3-7 10-9m-19 19 1-2" fill="none" stroke="#ffe1a3" stroke-width="3"/>
    <path d="M-33 -19Q0 -29 33 -19l-13 9H-20Z" fill="#517e70"/>
    <path d="M-12 -21 1 -33 8 -17Z" fill="#bcd68e"/>
    <circle cx="6" cy="-16" r="2" fill="#f5c275"/>
    ${eyes(-17, 17, -60, 9)}
    ${cheeks(28, -47, '#f97988')}
    ${mouth(-42, '<path d="M-1 -2h6L4 3H0Z" fill="#fff1d9"/>')}
  `,
  boobell: (paint) => `
    <path d="M-42 2Q-53 -8 -56 -1q-4 12 14 25M40 -2q10-13 17-8 7 9-13 27" fill="#a9cdea"/>
    <path d="M-42 21q-10-20-7-34 4-40 43-48 36-7 50 29 9 21 4 51-1 11 9 23-16 9-31-6-9 3-20 13Q-9 56-20 45-38 54-58 44q23-6 16-23Z" fill="${paint('sheet', '#fff1dc', '#a7ccee')}"/>
    <path d="M-40 -19q6-20 23-25m-14 79q7-6 7-15m51 10q-8-9-4-17" fill="none" stroke="#fffdf1" stroke-width="3" opacity=".82"/>
    <path d="M-31 15q26 17 61-2l1 8q-24 23-60 3Z" fill="#9e76ab"/>
    <path d="M-7 30q-5 10-1 17l15-1q6-11-2-17Z" fill="#ffca79"/>
    <path d="M-12 45q9-4 22 0l2 6h-25Z" fill="#e29556"/>
    <circle cx="0" cy="52" r="3" fill="#f8df9c"/>
    <path d="M19 -52q3-17 14-17l6 13 13-5q4 8-4 16-14 0-20 2Z" fill="#dc86ad"/>
    <path d="m32 -56 4 8" stroke="#f6bdd0" stroke-width="3"/>
    ${eyes(-16, 16, -14, 9)}
    ${cheeks(27, 1, '#eea5bf')}
    ${mouth(5)}
  `,
  winnie: (paint) => `
    <path d="M-21 -16 -25 -3m44-16L25-3" fill="none" stroke="#e6ac81" stroke-width="9"/>
    <path d="M-26 -9q-13 0-11 10h22V-9m40 0q13 0 11 10H15V-9" fill="#5b375b"/>
    <path d="M-20 -50q-14 7-25 23l-8 4m71-27q20 10 28 1" fill="none" stroke="#dd9c79" stroke-width="8"/>
    <path d="M-19 -51h37q3 20 21 39Q0 1-38-12q13-15 19-39Z" fill="${paint('cape', '#8d83ce', '#554586')}"/>
    <path d="m-14 -28 7 9 7-9 7 9 7-9" fill="none" stroke="#aa9cdc" stroke-width="2.5"/>
    <path d="m43 -33 12-33" stroke="#5d3c5e" stroke-width="4"/>
    <path d="m57 -82 3 9 10 1-8 6 2 10-8-6-8 5 3-10-8-5 10-1Z" fill="#ffce7d"/>
    <path d="M-31 -82q-11 22-1 39 7 6 15-1L-4 -52l19 11q10 9 21-2 6-19-5-43Z" fill="#a74d5e"/>
    <path d="M-30 -78q4-24 30-24t30 24v16q-4 24-30 24t-30-24Z" fill="#efb891"/>
    <path d="M-31 -76q23-1 40-16 4 10 22 17l-2-20q-30-24-60 3Z" fill="#b65364"/>
    <g class="winnie-hat">
      <path d="M-26 -98q5-33 24-49 17-14 43 2-19 0-24 15l11 30Z" fill="${paint('felt', '#a497df', '#624987')}"/>
      <path d="M-26 -102q26 5 50-4l5 9q-28 10-56 5Z" fill="#ebab98"/>
      <path d="M-50 -93Q-45-104-4-104q37 0 52 10 13 12-27 14-49 5-71-4Z" fill="#69528d"/>
      <path d="m8 -124 4 7 8 1-6 5 2 7-8-4-6 5 2-8-6-5 7-1Z" fill="#f6cf8e"/>
    </g>
    ${eyes(-13, 13, -65, 8)}
    <path d="M-4 -65q4-4 8 0m-25-9q-9 5-4 15t17 4m29-19q9 5 4 15t-17 4" stroke="#447b76" stroke-width="2.7" fill="none"/>
    ${cheeks(23, -53, '#ef8e94')}
    ${mouth(-49)}
    <path d="m-13 -38 13 7 13-7-6 14L0-29l-7 5Z" fill="#f2878c"/>
  `,
  barnaby: (paint) => `
    <g class="barnaby-torso">
      <path d="M-21 -51q-13 7-15 23l-9 8m65-31q13 8 19 19l9-5M-10 -24-20 -3m30-21L20-3" fill="none" stroke="#eadac6" stroke-width="8"/>
      <path d="M-21 -7q-15 2-13 10h25V-7m30 0q15 2 13 10H9V-7" fill="#77729f"/>
      <path d="M-5 -61H5v35H-5Z" fill="#e9cbae"/>
      <path d="M-22 -49q22 12 44 0m-19 13q16 3 18-1m-41 0q6 6 16 1" stroke="#f6e4c9" stroke-width="7" fill="none"/>
      <path d="M-27 -55q24 7 50-7l4 9q-29 18-53 6Z" fill="#929fcb"/>
      <path d="M15 -50q15 4 25 27l-11 5q-2-19-16-24Z" fill="#929fcb"/>
      <path d="m28 -27 9-4m-6 9 9-4" stroke="#eab18a" stroke-width="3"/>
    </g>
    <g class="barnaby-head">
      <path d="M-28 -71q-17-5-17-24 0-33 42-37 41-4 48 32 4 20-16 28l-4 12q-9 9-25 3-18 5-25-3Z" fill="${paint('bone', '#fff2d9', '#ddbdac')}"/>
      <path d="M-32 -110l8-3 3-7m42 9 6-5" stroke="#c8a89d" stroke-width="2.8" fill="none"/>
      <path d="M-29 -111q-13 2-9 11m67-11q13 2 9 11" fill="none" stroke="#fffaf0" stroke-width="2.6"/>
      <path d="M-7 -79q7-9 14 0l-3 4h-8Z" fill="#ad7e8a"/>
      ${eyes(-17, 17, -93, 10)}
      ${cheeks(28, -77, '#eb9b99')}
      ${mouth(-68, '<path d="M-6 -3H6L5 2H1L0-1-1 2H-5Z" fill="#fff1d9"/>')}
    </g>
  `,
  frankie: (paint) => `
    <path d="M-40 -56q-13 6-15 27m95-27q15 5 15 27" fill="none" stroke="#85bc9b" stroke-width="12"/>
    <path d="M-20 -15 -23 -4m43-11 3 11" stroke="#85bc9b" stroke-width="13"/>
    <path d="M-23 -12q-16 1-17 13h30V-9m33-3q16 1 17 13H10V-9" fill="#7b5390"/>
    <path d="M-36 -55q34-12 72 0l3 34q-39 13-78 0Z" fill="#8276b4"/>
    <path d="m-29 -48 5 18m53-18-5 18" fill="none" stroke="#ae96ce" stroke-width="8"/>
    <path d="M-12 -33h24v12q-12 5-24 0Z" fill="#b59bd0"/>
    <path d="m-5 -29 5 6 5-6" stroke="#784e86" stroke-width="1.5" fill="none"/>
    <circle cx="-24" cy="-35" r="3" fill="#ffce7d"/><circle cx="24" cy="-35" r="3" fill="#ffce7d"/>
    <path d="M-52 -79h14m76 0h14" stroke="#dca76e" stroke-width="8"/>
    <path d="M-52 -85v12m104-12v12" stroke="#ffcf8f" stroke-width="7"/>
    <path d="M-43 -104q3-17 20-20h46q18 3 20 20l-3 33q-4 22-40 22-37 0-41-22Z" fill="${paint('skin', '#c6daa0', '#76b29d')}"/>
    <path d="M-44 -103q-8-20 7-25l6-11 17 4 14-10 14 8 18-5 12 11q10 13 0 24l-9 2-3-13-15 8-10-7-18 8-12-7-15 12Z" fill="#565378"/>
    <path d="m-32 -125 7-4m19 0 10-7m14 9 11-4" stroke="#a194b3" stroke-width="2.5" fill="none"/>
    <path d="m22 -106 8 4m-5-7-2 6m8-3-3 7" stroke="#4e776e" stroke-width="1.8" fill="none"/>
    ${eyes(-16, 16, -94, 9)}
    ${cheeks(29, -80, '#eb9697')}
    ${mouth(-73, '<path d="M3 -3h6L8 3H4Z" fill="#fff1d9"/>')}
  `,
  bitey: (paint) => {
    const wing = paint('wing', '#bc91cc', '#74639d');
    return `
      <path d="M-13 30l-6 8m32-8 6 8" fill="none" stroke="#af83b2" stroke-width="5"/>
      <g class="wing-left">
        <path d="M-22 -5Q-49 -16-71-24q-6 21 4 45 10-17 23-7 5-13 22 2Z" fill="${wing}"/>
        <path d="M-70-21Q-53-10-45 12m-19-27q26 9 36 28" fill="none" stroke="#645183" stroke-width="2"/>
      </g>
      <g class="wing-right">
        <path d="M22-5Q49-16 71-24q6 21-4 45-10-17-23-7-5-13-22 2Z" fill="${wing}"/>
        <path d="M70-21Q53-10 45 12m19-27Q38-6 28 13" fill="none" stroke="#645183" stroke-width="2"/>
      </g>
      <path d="M-20 -21q-31-14-24-40 16 2 30 25m34 15q31-14 24-40-16 2-30 25" fill="#a48cc8"/>
      <path d="M-24 -26q-16-13-15-29 14 4 21 20m42 9q16-13 15-29-14 4-21 20" fill="#db96b4" stroke="none"/>
      <path d="M-36 1q-3-30 25-39l7-6 6 5 8-5 4 7Q37-30 37-3q0 36-37 39Q-37 34-36 1Z" fill="${paint('pile', '#c8b5e3', '#9b7fbc')}"/>
      <path d="M-12 23q12 4 24 0-3 9-12 9t-12-9Z" fill="#e5c8df" stroke="none"/>
      ${eyes(-14, 14, -10, 8)}
      ${cheeks(24, 3, '#eea0be')}
      ${mouth(7, fangs)}
      <path d="M-3 17H3l5 4-8 6-8-6Z" fill="#f1bb75"/>
    `;
  },
};

export function renderCharacterArtwork(id: CreatureId): string {
  const prefix = `character-${id}-${++artworkSequence}-`;
  const gradients: string[] = [];
  const paint: Paint = (name, light, dark) => {
    gradients.push(`<linearGradient id="${prefix}${name}" x1="18%" y1="0%" x2="72%" y2="100%"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`);
    return `url(#${prefix}${name})`;
  };
  const drawing = characters[id](paint);
  return `<defs>${gradients.join('')}</defs>
    <g class="character-ink" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      ${drawing}
    </g>`;
}
