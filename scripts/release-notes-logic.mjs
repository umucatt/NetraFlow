const VERSION_PATTERN_SOURCE =
  '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
  '([-_][0-9A-Za-z](?:[0-9A-Za-z._-]*[0-9A-Za-z])?)?';

const VERSION_PATTERN = new RegExp(`^(?!.*[\\r\\n])${VERSION_PATTERN_SOURCE}$`);
const VERSION_HEADING_PATTERN = new RegExp(
  `^(?<marker>##)[ \\t]+(?:\\[(?<bracketed>${VERSION_PATTERN_SOURCE})\\]|(?<bare>${VERSION_PATTERN_SOURCE}))[ \\t]*(?:#+[ \\t]*)?$`
);

export class ReleaseNotesError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReleaseNotesError';
  }
}

const normalizeNewlines = (text) => String(text ?? '').replace(/\r\n?/g, '\n');

const parseVersionHeading = (line, lineIndex) => {
  const match = line.match(VERSION_HEADING_PATTERN);

  if (!match) {
    return null;
  }

  return {
    lineIndex,
    level: match.groups.marker.length,
    version: match.groups.bracketed ?? match.groups.bare
  };
};

const isBlankLine = (line) => /^[ \t]*$/.test(line);

const trimBlankBoundaryLines = (lines) => {
  let start = 0;
  let end = lines.length;

  while (start < end && isBlankLine(lines[start])) {
    start += 1;
  }

  while (end > start && isBlankLine(lines[end - 1])) {
    end -= 1;
  }

  return lines.slice(start, end);
};

export const getChangelogVersionHeadings = (changelogText) =>
  normalizeNewlines(changelogText)
    .split('\n')
    .map(parseVersionHeading)
    .filter(Boolean);

export const extractChangelogVersionSection = ({ changelogText, version }) => {
  if (!VERSION_PATTERN.test(String(version ?? ''))) {
    throw new ReleaseNotesError(
      `RELEASE_VERSION is not a valid release version: ${version ?? '<missing>'}`
    );
  }

  const lines = normalizeNewlines(changelogText).split('\n');
  const headings = lines.map(parseVersionHeading).filter(Boolean);
  const matchingHeadings = headings.filter((heading) => heading.version === version);

  if (matchingHeadings.length === 0) {
    throw new ReleaseNotesError(`CHANGELOG has no version heading for ${version}`);
  }

  if (matchingHeadings.length > 1) {
    throw new ReleaseNotesError(`CHANGELOG has multiple version headings for ${version}`);
  }

  const currentHeading = matchingHeadings[0];
  const nextSameLevelHeading = headings.find(
    (heading) => heading.lineIndex > currentHeading.lineIndex && heading.level === currentHeading.level
  );
  const bodyLines = trimBlankBoundaryLines(
    lines.slice(currentHeading.lineIndex + 1, nextSameLevelHeading?.lineIndex ?? lines.length)
  );
  const body = bodyLines.join('\n');

  if (body.trim().length === 0) {
    throw new ReleaseNotesError(`CHANGELOG section for ${version} is empty`);
  }

  return {
    version,
    body
  };
};

export const createReleaseNotesText = ({ changelogText, version }) => {
  const section = extractChangelogVersionSection({ changelogText, version });

  return section.body;
};
