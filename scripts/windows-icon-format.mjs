const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export const inspectRgbaPng = (data, expectedSize) => {
  if (data.length < 33 || !data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Windows icon ${expectedSize}px layer is not a PNG.`);
  }
  if (data.readUInt32BE(8) !== 13 || data.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Windows icon ${expectedSize}px layer has an invalid PNG header.`);
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];

  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(
      `Windows icon ${expectedSize}px layer rendered as ${width}x${height}px.`
    );
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `Windows icon ${expectedSize}px layer must be an 8-bit RGBA PNG.`
    );
  }

  return { width, height, bitDepth, colorType };
};

export const createIco = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let imageOffset = header.length + entries.length * 16;
  const directories = entries.map(({ size, data }) => {
    inspectRgbaPng(data, size);

    const directory = Buffer.alloc(16);
    directory.writeUInt8(size === 256 ? 0 : size, 0);
    directory.writeUInt8(size === 256 ? 0 : size, 1);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(data.length, 8);
    directory.writeUInt32LE(imageOffset, 12);
    imageOffset += data.length;
    return directory;
  });

  return Buffer.concat([header, ...directories, ...entries.map(({ data }) => data)]);
};

export const inspectIco = (ico, expectedSizes) => {
  if (ico.length < 6 || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) {
    throw new Error('Windows icon has an invalid ICO header.');
  }
  if (ico.readUInt16LE(4) !== expectedSizes.length) {
    throw new Error('Windows icon does not contain every required layer.');
  }

  const directoryEnd = 6 + expectedSizes.length * 16;
  const imageOffsets = new Set();
  const entries = expectedSizes.map((expectedSize, index) => {
    const directoryOffset = 6 + index * 16;
    const width = ico[directoryOffset] || 256;
    const height = ico[directoryOffset + 1] || 256;
    const byteLength = ico.readUInt32LE(directoryOffset + 8);
    const imageOffset = ico.readUInt32LE(directoryOffset + 12);

    if (width !== expectedSize || height !== expectedSize) {
      throw new Error(`Windows ICO directory ${index} does not describe ${expectedSize}px.`);
    }
    if (
      ico.readUInt16LE(directoryOffset + 4) !== 1 ||
      ico.readUInt16LE(directoryOffset + 6) !== 32
    ) {
      throw new Error(`Windows ICO directory ${index} is not a 32-bit image entry.`);
    }
    if (imageOffset < directoryEnd || imageOffset + byteLength > ico.length) {
      throw new Error(`Windows ICO directory ${index} points outside the file.`);
    }
    if (imageOffsets.has(imageOffset)) {
      throw new Error(`Windows ICO directory ${index} reuses another layer.`);
    }

    imageOffsets.add(imageOffset);
    const data = ico.subarray(imageOffset, imageOffset + byteLength);
    inspectRgbaPng(data, expectedSize);
    return { size: expectedSize, byteLength, imageOffset };
  });

  return entries;
};
