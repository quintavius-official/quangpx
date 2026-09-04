#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import slugify from "slugify";

const usage =
  "Usage: node find-post.mjs (--query <title-or-filename> | --file <post-file>)";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function findProjectRoot(start) {
  let directory = resolve(start);
  while (dirname(directory) !== directory) {
    if (
      existsSync(resolve(directory, "astro-paper.config.ts")) &&
      existsSync(resolve(directory, "src/content/posts"))
    ) {
      return directory;
    }
    directory = dirname(directory);
  }
  fail("Not inside the QuangPX blog repository.");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripYamlValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/, "");
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(
    new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, "m")
  );
  return match ? stripYamlValue(match[1]) : "";
}

function slug(value) {
  return slugify(value, { lower: true });
}

function readPost(root, file) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!match) fail(`Missing YAML frontmatter: ${relative(root, file)}`);

  const frontmatter = match[1];
  const title = frontmatterValue(frontmatter, "title");
  const description = frontmatterValue(frontmatter, "description");
  if (!title) fail(`Post must define a title: ${relative(root, file)}`);

  const postsDirectory = resolve(root, "src/content/posts");
  const relativePost = relative(postsDirectory, file);
  const withoutExtension = relativePost.slice(0, -extname(relativePost).length);
  const segments = withoutExtension.split(sep).map(slug);
  const localDirectory = dirname(file);
  const assets = [...source.matchAll(/!\[[^\]]*\]\((\.\/[^)\s]+)\)/g)]
    .map(match => resolve(localDirectory, match[1]))
    .filter(asset => existsSync(asset));

  const lang = frontmatterValue(frontmatter, "lang") || "en";
  const postSlug = frontmatterValue(frontmatter, "postSlug");
  const postPath = postSlug || segments.join("/");
  const urlPrefix =
    lang === "vi" ? "https://quangpx.com/vi/posts/" : "https://quangpx.com/posts/";

  return {
    file: relative(root, file),
    title,
    description,
    draft: /^draft:\s*true\s*$/m.test(frontmatter),
    lang,
    url: `${urlPrefix}${postPath}/`,
    assets,
  };
}

function postFiles(directory) {
  const entries = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) entries.push(...postFiles(file));
    if (entry.isFile() && [".md", ".mdx"].includes(extname(entry.name))) {
      entries.push(file);
    }
  }
  return entries;
}

const query = argument("--query");
const requestedFile = argument("--file");
if ((query && requestedFile) || (!query && !requestedFile)) fail(usage);

const root = findProjectRoot(process.cwd());
const postsDirectory = resolve(root, "src/content/posts");
let candidates;

if (requestedFile) {
  const file = resolve(root, requestedFile);
  if (
    !file.startsWith(`${postsDirectory}${sep}`) ||
    !existsSync(file) ||
    !statSync(file).isFile()
  ) {
    fail("--file must be an existing file inside src/content/posts/.");
  }
  candidates = [readPost(root, file)];
} else {
  const normalized = query.trim().toLocaleLowerCase();
  candidates = postFiles(postsDirectory)
    .map(file => readPost(root, file))
    .filter(post =>
      [post.title, basename(post.file, extname(post.file))].some(value =>
        value.toLocaleLowerCase().includes(normalized)
      )
    );
}

const status =
  candidates.length === 1 ? "selected" : candidates.length ? "ambiguous" : "not_found";
console.log(JSON.stringify({ status, candidates }, null, 2));
process.exit(status === "selected" ? 0 : 2);
