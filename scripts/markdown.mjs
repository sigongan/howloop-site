// A small, dependency-free Markdown renderer for Howloop articles.
// Supports: front matter, ## / ### headings, paragraphs, - and 1. lists,
// > blockquotes, pipe tables, :::callout blocks, **bold**, *italic*, `code`, [links](url).

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Front matter: `key: value` lines, plus `key:` followed by `  - item` lines for lists.
export function parseFrontMatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {data: {}, body: source};
  const data = {};
  let listKey = null;
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!pair) throw new Error(`Unreadable front matter line: ${line}`);
    const [, key, value] = pair;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value.trim());
      listKey = null;
    }
  }
  return {data, body: source.slice(match[0].length)};
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

// Typographic quotes and apostrophes for prose (not used on URLs or code).
export function smartQuotes(text) {
  return String(text)
    .replace(/(\w)'(\w)/g, '$1\u2019$2')
    .replace(/(^|[\s(\[\u2014\u2013-])"(?=\S)/g, '$1\u201c')
    .replace(/"/g, '\u201d')
    .replace(/(^|[\s(\[\u2014\u2013-])'(?=\S)/g, '$1\u2018')
    .replace(/'/g, '\u2019');
}

export function renderInline(text) {
  const codes = [];
  const links = [];
  // Protect code spans and link URLs from quote conversion and escaping changes.
  let out = String(text)
    .replace(/`([^`]+)`/g, (_, code) => {
      codes.push(`<code>${escapeHtml(code)}</code>`);
      return `\u0000${codes.length - 1}\u0000`;
    })
    .replace(/\]\(([^)\s]+)\)/g, (_, href) => {
      links.push(href);
      return `](\u0001${links.length - 1}\u0001)`;
    });
  out = escapeHtml(smartQuotes(out));
  out = out.replace(/\[([^\]]+)\]\(\u0001(\d+)\u0001\)/g, (_, label, i) => {
    const href = links[Number(i)];
    const external = /^https?:\/\//.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const headings = [];
  let i = 0;

  const isBlockStart = line =>
    /^#{2,4}\s/.test(line) || /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) || /^\|/.test(line) || /^:::/.test(line);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      headings.push({level, text, id});
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    const callout = line.match(/^:::(\w+)\s*(.*)$/);
    if (callout) {
      const [, kind, title] = callout;
      const inner = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) inner.push(lines[i++]);
      i++;
      const titleHtml = title ? `<p class="callout-title">${renderInline(title)}</p>` : '';
      html.push(`<aside class="callout callout-${kind}">${titleHtml}${renderMarkdown(inner.join('\n')).html}</aside>`);
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const header = splitRow(rows[0]);
      const body = rows.slice(2).map(splitRow);
      html.push('<div class="table-wrap"><table><thead><tr>' +
        header.map(cell => `<th scope="col">${renderInline(cell)}</th>`).join('') +
        '</tr></thead><tbody>' +
        body.map(row => '<tr>' + row.map(cell => `<td>${renderInline(cell)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote>${renderMarkdown(quote.join('\n')).html}</blockquote>`);
      continue;
    }

    const listMatch = line.match(/^\s*([-*]|\d+\.)\s+/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const items = [];
      while (i < lines.length) {
        const current = lines[i];
        const itemStart = current.match(/^\s*([-*]|\d+\.)\s+(.*)$/);
        if (itemStart && (/\d/.test(itemStart[1]) === ordered)) {
          items.push(itemStart[2]);
          i++;
        } else if (current.trim() && /^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1] += ' ' + current.trim();
          i++;
        } else {
          break;
        }
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>` + items.map(item => `<li>${renderInline(item)}</li>`).join('') + `</${tag}>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) paragraph.push(lines[i++].trim());
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return {html: html.join('\n'), headings};
}

// Visible words in rendered HTML, used for reading time and quality checks.
export function countWords(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  return (text.match(/[A-Za-z0-9°–'’]+/g) || []).length;
}
