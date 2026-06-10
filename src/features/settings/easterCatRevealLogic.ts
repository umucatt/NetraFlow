export const EASTER_CAT_INITIAL_REVEAL_OFFSET = 0;
export const EASTER_CAT_FRAME_SIZE_PX = 122;
export const EASTER_CAT_REVEAL_WHEEL_FACTOR = 0.56;
export const EASTER_CAT_WHEEL_LINE_HEIGHT_PX = 16;

export type EasterCatRevealBoundsInput = {
  frameHeight: number;
  containerHeight: number;
};

export type EasterCatWheelRevealInput = EasterCatRevealBoundsInput & {
  currentOffset: number;
  deltaY: number;
  deltaMode?: number;
};

const getFiniteNumber = (value: number) => (Number.isFinite(value) ? value : 0);

export const getEasterCatMaxRevealOffset = ({
  frameHeight,
  containerHeight
}: EasterCatRevealBoundsInput) => {
  const safeFrameHeight = Math.max(0, getFiniteNumber(frameHeight));
  const safeContainerHeight = Math.max(0, getFiniteNumber(containerHeight));

  if (safeFrameHeight <= 0 || safeContainerHeight <= 0) {
    return 0;
  }

  return safeFrameHeight;
};

export const clampEasterCatRevealOffset = (offset: number, maxOffset: number) =>
  Math.min(Math.max(0, getFiniteNumber(offset)), Math.max(0, getFiniteNumber(maxOffset)));

export const normalizeEasterCatWheelDeltaY = (
  deltaY: number,
  deltaMode: number | undefined,
  containerHeight: number
) => {
  const finiteDeltaY = getFiniteNumber(deltaY);

  if (deltaMode === 1) {
    return finiteDeltaY * EASTER_CAT_WHEEL_LINE_HEIGHT_PX;
  }

  if (deltaMode === 2) {
    return finiteDeltaY * Math.max(0, getFiniteNumber(containerHeight));
  }

  return finiteDeltaY;
};

export const resolveEasterCatRevealOffsetAfterWheel = ({
  currentOffset,
  deltaY,
  deltaMode = 0,
  frameHeight,
  containerHeight
}: EasterCatWheelRevealInput) => {
  const maxOffset = getEasterCatMaxRevealOffset({ frameHeight, containerHeight });
  const wheelDelta = normalizeEasterCatWheelDeltaY(deltaY, deltaMode, containerHeight);

  return clampEasterCatRevealOffset(
    currentOffset + wheelDelta * EASTER_CAT_REVEAL_WHEEL_FACTOR,
    maxOffset
  );
};

export const resolveEasterCatRevealOffsetAfterResize = ({
  currentOffset,
  frameHeight,
  containerHeight
}: EasterCatRevealBoundsInput & { currentOffset: number }) =>
  clampEasterCatRevealOffset(
    currentOffset,
    getEasterCatMaxRevealOffset({ frameHeight, containerHeight })
  );

export const resetEasterCatRevealOffset = () => EASTER_CAT_INITIAL_REVEAL_OFFSET;
