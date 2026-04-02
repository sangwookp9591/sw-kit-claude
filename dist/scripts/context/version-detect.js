/**
 * aing Version Detect v2.0.0
 * Detects project tech stack versions from all dependency files.
 * Caches to .aing/state/tech-stack.json with git-based invalidation.
 * @module scripts/context/version-detect
 */
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeState, readStateOrDefault } from '../core/state.js';
// ---------------------------------------------------------------------------
// Git helpers (safe — no shell injection)
// ---------------------------------------------------------------------------
function gitFileDate(projectDir, filePath) {
    try {
        if (!existsSync(join(projectDir, filePath)))
            return null;
        const out = execFileSync('git', ['log', '-1', '--format=%aI', '--', filePath], { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }).trim();
        return out || null;
    }
    catch {
        return null;
    }
}
function getDepFileDates(projectDir) {
    const DEP_FILES = [
        'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
        'pom.xml', 'build.gradle', 'build.gradle.kts',
        'go.mod', 'Cargo.toml', 'Gemfile', 'pubspec.yaml',
        'Package.swift', 'composer.json',
    ];
    const dates = {};
    for (const f of DEP_FILES) {
        const d = gitFileDate(projectDir, f);
        if (d)
            dates[f] = d;
    }
    return dates;
}
// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
function cachePath(dir) { return join(dir, '.aing', 'state', 'tech-stack.json'); }
function isCacheValid(dir) {
    const cache = readStateOrDefault(cachePath(dir), null);
    if (!cache?.detectedAt)
        return false;
    const current = getDepFileDates(dir);
    for (const [file, commitDate] of Object.entries(current)) {
        if (!cache.depFileCommits[file] || commitDate > cache.depFileCommits[file])
            return false;
    }
    for (const file of Object.keys(current)) {
        if (!cache.depFileCommits[file])
            return false;
    }
    return true;
}
// ---------------------------------------------------------------------------
// Node.js
// ---------------------------------------------------------------------------
const NODE_PKGS = [
    'next', 'react', 'react-dom', 'vue', 'nuxt', 'svelte', '@sveltejs/kit',
    '@angular/core', 'solid-js', 'qwik', 'astro', '@remix-run/react',
    'express', 'fastify', 'hono', '@nestjs/core', 'koa', 'elysia',
    'typescript', 'vite', 'turbopack', 'webpack', 'rolldown', 'esbuild',
    'tailwindcss', 'styled-components', '@emotion/react', 'sass',
    'prisma', '@prisma/client', 'drizzle-orm', 'mongoose', 'typeorm', 'sequelize', 'kysely',
    'zustand', 'jotai', 'redux', '@tanstack/react-query', 'swr',
    'vitest', 'jest', 'playwright', 'cypress', '@testing-library/react',
    'ai', '@anthropic-ai/sdk', 'openai', 'langchain',
    'react-native', 'expo',
    'next-auth', '@auth/core', '@clerk/nextjs',
    '@radix-ui/react-dialog', '@mui/material', 'antd',
];
function detectNode(dir, out) {
    const p = join(dir, 'package.json');
    if (!existsSync(p))
        return;
    try {
        const pkg = JSON.parse(readFileSync(p, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const name of NODE_PKGS) {
            const v = deps[name];
            if (!v)
                continue;
            const clean = v.replace(/^[\^~>=<]+/, '');
            const major = parseInt(clean.split('.')[0], 10);
            if (!isNaN(major))
                out.push({ name, version: clean, major, ecosystem: 'node' });
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------
const PY_PKGS = ['django', 'flask', 'fastapi', 'starlette', 'uvicorn', 'sqlalchemy', 'pydantic', 'celery', 'pytest', 'numpy', 'pandas', 'scikit-learn', 'torch', 'tensorflow', 'transformers', 'langchain', 'httpx', 'requests', 'aiohttp', 'alembic', 'boto3', 'gunicorn', 'redis', 'pymongo'];
function detectPython(dir, out) {
    for (const f of ['requirements.txt', 'requirements-dev.txt']) {
        const p = join(dir, f);
        if (!existsSync(p))
            continue;
        try {
            for (const line of readFileSync(p, 'utf-8').split('\n')) {
                const m = line.match(/^([\w-]+)[=~><!]+=?([\d.]+)/);
                if (m && PY_PKGS.includes(m[1].toLowerCase())) {
                    out.push({ name: m[1], version: m[2], major: parseInt(m[2], 10), ecosystem: 'python' });
                }
            }
        }
        catch { /* skip */ }
    }
    const pyproj = join(dir, 'pyproject.toml');
    if (existsSync(pyproj)) {
        try {
            const c = readFileSync(pyproj, 'utf-8');
            for (const pkg of PY_PKGS) {
                const m = c.match(new RegExp(`["']?${pkg}["']?\\s*[=~><!]+\\s*["']?([\\d.]+)`, 'i'));
                if (m)
                    out.push({ name: pkg, version: m[1], major: parseInt(m[1], 10), ecosystem: 'python' });
            }
        }
        catch { /* skip */ }
    }
}
// ---------------------------------------------------------------------------
// Java / Kotlin
// ---------------------------------------------------------------------------
function detectJava(dir, out) {
    // pom.xml
    const pom = join(dir, 'pom.xml');
    if (existsSync(pom)) {
        try {
            const c = readFileSync(pom, 'utf-8');
            const patterns = [
                [/<spring-boot[.-]version>([\d.]+)</, 'Spring Boot'],
                [/<java\.version>(\d+)</, 'Java'],
                [/<maven\.compiler\.source>(\d+)</, 'Java'],
                [/<kotlin\.version>([\d.]+)</, 'Kotlin'],
                [/<junit-jupiter\.version>([\d.]+)</, 'JUnit 5'],
            ];
            for (const [re, name] of patterns) {
                const m = c.match(re);
                if (m)
                    out.push({ name, version: m[1], major: parseInt(m[1], 10), ecosystem: 'java' });
            }
        }
        catch { /* skip */ }
    }
    // build.gradle(.kts)
    for (const gf of ['build.gradle', 'build.gradle.kts']) {
        const p = join(dir, gf);
        if (!existsSync(p))
            continue;
        try {
            const c = readFileSync(p, 'utf-8');
            const pluginRe = /id\s*['"(]([^'"]+)['")]\s*version\s*['"(]([^'"]+)['"]/g;
            let m;
            while ((m = pluginRe.exec(c)) !== null) {
                if (m[1].includes('spring'))
                    out.push({ name: 'Spring Boot', version: m[2], major: parseInt(m[2], 10), ecosystem: 'java' });
                if (m[1].includes('kotlin'))
                    out.push({ name: 'Kotlin', version: m[2], major: parseInt(m[2], 10), ecosystem: 'java' });
            }
            // sourceCompatibility / jvmTarget
            const javaM = c.match(/(?:sourceCompatibility|jvmTarget)\s*=?\s*['"]?(\d+)/);
            if (javaM)
                out.push({ name: 'Java', version: javaM[1], major: parseInt(javaM[1], 10), ecosystem: 'java' });
        }
        catch { /* skip */ }
    }
}
// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------
function detectGo(dir, out) {
    const p = join(dir, 'go.mod');
    if (!existsSync(p))
        return;
    try {
        const c = readFileSync(p, 'utf-8');
        const goV = c.match(/^go\s+([\d.]+)/m);
        if (goV)
            out.push({ name: 'Go', version: goV[1], major: parseInt(goV[1], 10), ecosystem: 'go' });
        const goPkgs = ['gin', 'echo', 'fiber', 'chi', 'gorm', 'ent', 'cobra', 'viper', 'zap', 'zerolog'];
        for (const line of c.split('\n')) {
            for (const pkg of goPkgs) {
                if (line.includes(pkg)) {
                    const m = line.match(/v([\d.]+)/);
                    if (m)
                        out.push({ name: pkg, version: m[1], major: parseInt(m[1], 10), ecosystem: 'go' });
                }
            }
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// Rust
// ---------------------------------------------------------------------------
function detectRust(dir, out) {
    const p = join(dir, 'Cargo.toml');
    if (!existsSync(p))
        return;
    try {
        const c = readFileSync(p, 'utf-8');
        const pkgs = ['actix-web', 'axum', 'tokio', 'serde', 'diesel', 'sqlx', 'reqwest', 'clap', 'tracing', 'warp', 'rocket', 'tauri'];
        for (const pkg of pkgs) {
            const re = new RegExp(`${pkg.replace('-', '[-_]')}\\s*=\\s*(?:\\{[^}]*version\\s*=\\s*)?["']([\\d.]+)["']`);
            const m = c.match(re);
            if (m)
                out.push({ name: pkg, version: m[1], major: parseInt(m[1], 10), ecosystem: 'rust' });
        }
        const ed = c.match(/edition\s*=\s*["'](\d+)["']/);
        if (ed)
            out.push({ name: 'Rust edition', version: ed[1], major: parseInt(ed[1], 10), ecosystem: 'rust' });
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// Ruby
// ---------------------------------------------------------------------------
function detectRuby(dir, out) {
    const p = join(dir, 'Gemfile');
    if (!existsSync(p))
        return;
    try {
        const c = readFileSync(p, 'utf-8');
        const pkgs = ['rails', 'sinatra', 'sidekiq', 'rspec', 'devise', 'pundit', 'pg', 'puma', 'redis', 'activerecord'];
        for (const pkg of pkgs) {
            const m = c.match(new RegExp(`gem\\s+['"]${pkg}['"]\\s*,\\s*['"]~?>?\\s*([\\d.]+)['"]`));
            if (m)
                out.push({ name: pkg, version: m[1], major: parseInt(m[1], 10), ecosystem: 'ruby' });
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// Dart / Flutter
// ---------------------------------------------------------------------------
function detectFlutter(dir, out) {
    const p = join(dir, 'pubspec.yaml');
    if (!existsSync(p))
        return;
    try {
        const c = readFileSync(p, 'utf-8');
        const sdk = c.match(/sdk:\s*["']>=?([\d.]+)/);
        if (sdk)
            out.push({ name: 'Dart SDK', version: sdk[1], major: parseInt(sdk[1], 10), ecosystem: 'dart' });
        const pkgs = ['riverpod', 'bloc', 'provider', 'dio', 'go_router', 'freezed', 'hive', 'drift', 'firebase_core'];
        for (const pkg of pkgs) {
            const m = c.match(new RegExp(`${pkg}:\\s*[\\^~]?([\\d.]+)`));
            if (m)
                out.push({ name: pkg, version: m[1], major: parseInt(m[1], 10), ecosystem: 'dart' });
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// PHP
// ---------------------------------------------------------------------------
function detectPHP(dir, out) {
    const p = join(dir, 'composer.json');
    if (!existsSync(p))
        return;
    try {
        const pkg = JSON.parse(readFileSync(p, 'utf-8'));
        const deps = { ...pkg.require, ...pkg['require-dev'] };
        const map = { 'laravel/framework': 'Laravel', 'symfony/symfony': 'Symfony', 'php': 'PHP', 'phpunit/phpunit': 'PHPUnit', 'doctrine/orm': 'Doctrine' };
        for (const [n, label] of Object.entries(map)) {
            const v = deps[n];
            if (v) {
                const c = v.replace(/^[\^~>=<|]+/, '');
                const maj = parseInt(c, 10);
                if (!isNaN(maj))
                    out.push({ name: label, version: c, major: maj, ecosystem: 'php' });
            }
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// .NET
// ---------------------------------------------------------------------------
function detectDotnet(dir, out) {
    // Find .csproj
    try {
        const result = execFileSync('find', ['.', '-maxdepth', '3', '-name', '*.csproj', '-type', 'f'], { cwd: dir, encoding: 'utf-8', timeout: 3000 }).trim();
        const first = result.split('\n')[0];
        if (!first)
            return;
        const c = readFileSync(join(dir, first.replace(/^\.\//, '')), 'utf-8');
        const tfm = c.match(/<TargetFramework>(net[\d.]+)</);
        if (tfm) {
            const v = tfm[1].replace('net', '');
            out.push({ name: '.NET', version: v, major: parseInt(v, 10), ecosystem: 'dotnet' });
        }
    }
    catch { /* skip */ }
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function detectVersions(projectDir) {
    const out = [];
    detectNode(projectDir, out);
    detectPython(projectDir, out);
    detectJava(projectDir, out);
    detectGo(projectDir, out);
    detectRust(projectDir, out);
    detectRuby(projectDir, out);
    detectFlutter(projectDir, out);
    detectPHP(projectDir, out);
    detectDotnet(projectDir, out);
    // Dedup
    const seen = new Set();
    const deduped = out.filter(v => { if (seen.has(v.name))
        return false; seen.add(v.name); return true; });
    const summary = deduped.length > 0 ? deduped.map(v => `${v.name}@${v.version}`).join(', ') : 'no versions detected';
    return { versions: deduped, summary, fromCache: false };
}
export function detectVersionsCached(projectDir) {
    if (isCacheValid(projectDir)) {
        const cache = readStateOrDefault(cachePath(projectDir), null);
        if (cache)
            return { versions: cache.versions, summary: cache.summary, fromCache: true };
    }
    const result = detectVersions(projectDir);
    // Save cache
    mkdirSync(join(projectDir, '.aing', 'state'), { recursive: true });
    const cache = { detectedAt: new Date().toISOString(), versions: result.versions, summary: result.summary, depFileCommits: getDepFileDates(projectDir) };
    writeState(cachePath(projectDir), cache);
    return result;
}
const WARNINGS = [
    // Node/JS
    { match: v => v.name === 'next' && v.major >= 15, warn: v => `Next.js ${v.version}: App Router, Server Components, Route Handlers. pages/ 지양.` },
    { match: v => v.name === 'react' && v.major >= 19, warn: v => `React ${v.version}: use(), Actions, useOptimistic, useFormStatus. class components 금지.` },
    { match: v => v.name === 'typescript' && v.major >= 5, warn: v => `TS ${v.version}: satisfies, const type params, decorators.` },
    { match: v => v.name === 'tailwindcss' && v.major >= 4, warn: v => `Tailwind ${v.version}: v4 CSS-first. @theme, @import "tailwindcss".` },
    { match: v => v.name === 'vue' && v.major >= 3, warn: v => `Vue ${v.version}: Composition API + <script setup>. Options API 지양.` },
    { match: v => v.name === 'nuxt' && v.major >= 3, warn: v => `Nuxt ${v.version}: Nitro, auto-imports, useFetch. Nuxt 2 패턴 금지.` },
    { match: v => v.name === 'svelte' && v.major >= 5, warn: v => `Svelte ${v.version}: Runes ($state/$derived/$effect).` },
    { match: v => v.name === '@angular/core' && v.major >= 17, warn: v => `Angular ${v.version}: Signals, standalone, @defer, @if/@for.` },
    { match: v => v.name === 'express' && v.major >= 5, warn: v => `Express ${v.version}: async error handling 내장.` },
    // Python
    { match: v => v.name === 'django' && v.major >= 5, warn: v => `Django ${v.version}: GeneratedField, facet filters, db_default. async view 기본.` },
    { match: v => v.name === 'fastapi', warn: v => `FastAPI ${v.version}: Pydantic v2 기반. model_validator, field_validator.` },
    { match: v => v.name === 'pydantic' && v.major >= 2, warn: v => `Pydantic ${v.version}: v2 Rust core. validator→field_validator, Config→model_config.` },
    { match: v => v.name === 'sqlalchemy' && v.major >= 2, warn: v => `SQLAlchemy ${v.version}: 2.0 — select()+session.execute(). Query API deprecated.` },
    // Java
    { match: v => v.name === 'Spring Boot' && v.major >= 3, warn: v => `Spring Boot ${v.version}: Jakarta EE, native compilation, virtual threads.` },
    { match: v => v.name === 'Java' && v.major >= 21, warn: v => `Java ${v.version}: virtual threads, pattern matching, record patterns, sealed classes.` },
    { match: v => v.name === 'Java' && v.major >= 17, warn: v => `Java ${v.version}: sealed classes, records, text blocks.` },
    { match: v => v.name === 'Kotlin' && v.major >= 2, warn: v => `Kotlin ${v.version}: K2 compiler.` },
    // Go
    { match: v => v.name === 'Go' && parseInt(v.version.split('.')[1] || '0', 10) >= 22, warn: v => `Go ${v.version}: range over int, enhanced net/http routing.` },
    // Rust
    { match: v => v.name === 'axum', warn: v => `Axum ${v.version}: State extractor, Handler trait.` },
    // Ruby
    { match: v => v.name === 'rails' && v.major >= 7, warn: v => `Rails ${v.version}: Hotwire/Turbo, import maps, encrypted credentials.` },
    // Flutter
    { match: v => v.name === 'Dart SDK' && v.major >= 3, warn: v => `Dart ${v.version}: records, patterns, class modifiers.` },
    { match: v => v.name === 'riverpod' && v.major >= 2, warn: v => `Riverpod ${v.version}: @riverpod annotation, Notifier.` },
    // PHP
    { match: v => v.name === 'Laravel' && v.major >= 11, warn: v => `Laravel ${v.version}: slimmed skeleton, per-second rate limiting.` },
    { match: v => v.name === 'PHP' && v.major >= 8, warn: v => `PHP ${v.version}: fibers, enums, readonly, named args, match.` },
    // .NET
    { match: v => v.name === '.NET' && v.major >= 8, warn: v => `.NET ${v.version}: native AOT, minimal APIs, Blazor unified.` },
];
export function generateVersionContext(projectDir) {
    const { versions, summary } = detectVersionsCached(projectDir);
    if (versions.length === 0)
        return '';
    const lines = [
        `PROJECT TECH STACK: ${summary}`,
        '이 프로젝트의 정확한 버전에 맞는 API/패턴만 사용. deprecated/legacy 금지.',
    ];
    for (const v of versions) {
        for (const r of WARNINGS) {
            if (r.match(v)) {
                lines.push(`⚠ ${r.warn(v)}`);
                break;
            }
        }
    }
    lines.push('');
    lines.push('DOC LOOKUP: 불확실하면 공식 문서 확인 필수:');
    lines.push('- context7 MCP: resolve-library-id → query-docs');
    lines.push('- fallback: WebSearch "{package} {version} docs {keyword}"');
    return lines.join('\n');
}
// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (process.argv[1] && /version-detect\.(mjs|js)$/.test(process.argv[1])) {
    const dir = process.argv[2] || process.cwd();
    const result = detectVersionsCached(dir);
    console.log(JSON.stringify(result, null, 2));
}
//# sourceMappingURL=version-detect.js.map