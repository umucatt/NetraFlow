import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

const linuxIconHashes: Record<string, string> = {
  '1024x1024.png': 'b87a7a92f4b847dbe6b71bff63f1d38be460593b060bd7ed56ee9f6a26eb6f87',
  '128x128.png': '1c47b3216f15f83d305ca067366e229e3b52eadf04a0afcda10859404b1967cc',
  '16x16.png': '7df014492965f8337112de8f9457f80c87f27c61282fb10b57cc2d5c81460ba7',
  '20x20.png': 'd40e633aaf796612b16095d43ce96e0600685209a45f67af6b102785e9e095d8',
  '24x24.png': '9adfa2bab5a8a70d555ad40b647ecbdc4959686dd2cd2a507e4f28b8ab089c29',
  '256x256.png': 'd3b01e50447f395302518490dc217cfd25571c1802eae77357afd268556415a9',
  '32x32.png': '6fdac47b1f9cd76aa1ef7f7a7f693b08ca188d0d8ab439b8173ea7dc19e08f1b',
  '40x40.png': '155285eebe611b9827416daa0605b2be57d57d9024bdc9be567c1ce5760d90a3',
  '48x48.png': '8302dfdbeb17fbb7717c817a28f51137a036499c9c292fffeb65987cbdeeef4f',
  '512x512.png': '1fa15ea073ad2d299f12247db124e5bd9433b8a30366ef9fb6a8ed72ef2d9d5b',
  '64x64.png': '0717de26f01873091dab00bb710115c1a26ab707dce4ae165daa9f604cc7473b'
};

test('macOS icon generation isolates the macOS source and preserves Windows and Linux assets', () => {
  const generatorSource = readFileSync('scripts/generate-icons.mjs', 'utf8');
  const macosPackagerSource = readFileSync('scripts/package-dmg.mjs', 'utf8');
  const standardSvg = readFileSync('public/icons/netraflow.svg', 'utf8');
  const macosSvg = readFileSync('public/icons/netraflow-macos.svg', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    build?: { mac?: { icon?: string } };
  };

  assert.match(generatorSource, /const sourceSvg = .*netraflow\.svg/);
  assert.match(generatorSource, /const macosSourceSvg = .*netraflow-macos\.svg/);
  assert.equal(macosSvg.includes('stroke="#e8edf1"'), false);
  assert.equal(macosSvg.includes('<rect'), false);
  const nfPath = '<path d="M208 585V235c0-29 35-41 53-17l206 367c15 20 53 9 53-19V300c0-61 49-65 92-65h60" fill="none" stroke="#fff" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/>';
  const dot = '<circle cx="670" cy="430" r="34.2" fill="#fff"/>';
  assert.equal(macosSvg.includes(nfPath), true);
  assert.equal(standardSvg.includes(nfPath), true);
  assert.equal(macosSvg.includes(dot), true);
  assert.equal(standardSvg.includes(dot), true);
  assert.equal(packageJson.build?.mac?.icon, 'public/icons/netraflow.icns');
  assert.equal(macosPackagerSource.includes("'!dist/icons/netraflow.svg'"), false);
  assert.equal(macosPackagerSource.includes("'!public/icons/netraflow.svg'"), false);
  assert.equal(sha256('public/icons/netraflow.ico'), '36d4bd56127ac789e6194b8c84ba43e126a44262f5957f3a1e7f5989fe8658c1');

  for (const [name, expectedHash] of Object.entries(linuxIconHashes)) {
    assert.equal(sha256(`public/icons/linux/${name}`), expectedHash, name);
  }
});

test('the regenerated macOS ICNS has a 1024-pixel Retina layer and differs from the prior icon', () => {
  const icns = readFileSync('public/icons/netraflow.icns');
  const chunkTypes: string[] = [];
  let offset = 8;

  while (offset < icns.length) {
    chunkTypes.push(icns.toString('ascii', offset, offset + 4));
    offset += icns.readUInt32BE(offset + 4);
  }

  assert.ok(chunkTypes.includes('ic10'));
  assert.notEqual(
    sha256('public/icons/netraflow.icns'),
    '9a67860866e9b86c2878da5924fc10abbe45126460059459590ce93b95e7cd76'
  );
});
