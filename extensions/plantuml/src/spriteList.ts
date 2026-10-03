interface Sprite {
  name: string;
  svg: string;
}

const spriteDefinitionPattern =
  /^[ \t]*sprite[ \t]+(\$?[A-Za-z0-9_.-]+)[ \t]+(<svg\b[\s\S]*?<\/svg>|<svg\b[^>]*\/>)/gim;

export function createSpriteListSvg(source: string): string | undefined {
  if (!/^[ \t]*listsprites?[ \t]*$/im.test(source)) return undefined;

  const spritesByName = new Map<string, string>();
  for (const match of source.matchAll(spriteDefinitionPattern)) {
    spritesByName.set(match[1].replace(/^\$/, ""), match[2]);
  }
  const sprites = [...spritesByName].map(([name, svg]) => ({ name, svg }));
  if (sprites.length === 0) {
    throw new Error("La commande listsprites ne trouve aucune définition de sprite SVG.");
  }

  return renderSpriteGrid(sprites);
}

function renderSpriteGrid(sprites: Sprite[]): string {
  const columns = Math.min(4, sprites.length);
  const cellWidth = 220;
  const cellHeight = 150;
  const rows = Math.ceil(sprites.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const cells = sprites.map(({ name, svg }, index) => {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    const icon = placeSvg(svg);

    return `<g><rect x="${x + 5}" y="${y + 5}" width="${cellWidth - 10}" height="${cellHeight - 10}" rx="4" fill="#ffffff" stroke="#c8c8c8"/><svg x="${x + 16}" y="${y + 12}" width="${cellWidth - 32}" height="${cellHeight - 48}" viewBox="${escapeXml(icon.viewBox)}" preserveAspectRatio="xMidYMid meet"${icon.namespaces}>${icon.content}</svg><text x="${x + cellWidth / 2}" y="${y + cellHeight - 18}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#333333">${escapeXml(name)}</text></g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Liste de ${sprites.length} sprites PlantUML">${cells}</svg>`;
}

function placeSvg(
  svg: string
): { viewBox: string; namespaces: string; content: string } {
  const opening = /^<svg\b([^>]*)>/i.exec(svg);
  if (!opening) throw new Error("Une définition de sprite SVG est invalide.");

  const attributes = opening[1];
  const viewBox = readAttribute(attributes, "viewBox") ??
    getDimensionViewBox(attributes);
  const isSelfClosing = /\/\s*>$/.test(opening[0]);
  const remainder = svg.slice(opening[0].length);
  const content = isSelfClosing ? "" : remainder.replace(/<\/svg>\s*$/i, "");
  if (!isSelfClosing && content === remainder) {
    throw new Error("Une définition de sprite SVG n'a pas de balise fermante.");
  }

  return {
    viewBox,
    namespaces: [...attributes.matchAll(/\s+xmlns(?::[\w.-]+)?\s*=\s*(?:"[^"]*"|'[^']*')/gi)]
      .map(([namespace]) => namespace)
      .join(""),
    content
  };
}

function getDimensionViewBox(attributes: string): string {
  const width = readAttribute(attributes, "width")?.match(/[\d.]+/)?.[0];
  const height = readAttribute(attributes, "height")?.match(/[\d.]+/)?.[0];
  if (!width || !height) {
    throw new Error("Une définition de sprite SVG doit avoir un viewBox ou des dimensions.");
  }
  return `0 0 ${width} ${height}`;
}

function readAttribute(attributes: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
    .exec(attributes);
  return match?.[1] ?? match?.[2];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
