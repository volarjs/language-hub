import type { LanguagePlugin } from '@volar/language-core';

import path = require('node:path');

export function createVuePlugin(ts: typeof import('typescript'), tsconfig: string): LanguagePlugin<string>
export function createVuePlugin(ts: typeof import('typescript'), compilerOptions: object, rootDir: string): LanguagePlugin<string>
export function createVuePlugin(ts: typeof import('typescript'), tsconfigOrCompilerOptions: string | object, rootDir = path.dirname(tsconfigOrCompilerOptions as string)): LanguagePlugin<string> {
	let vue: typeof import('@vue/language-core');
	let vueTscPkgPath: string | undefined;

	if (findPackageJsonByDir(ts, rootDir, '@vue/language-core')) {
		vue = require('@vue/language-core');
	} else if (vueTscPkgPath = findPackageJsonByDir(ts, rootDir, 'vue-tsc')) {
		const vueTscPath = path.dirname(vueTscPkgPath);
		vue = require(require.resolve('@vue/language-core', { paths: [vueTscPath] }));
	} else {
		throw new Error('Missing @vue/language-core or vue-tsc.');
	}

	const commonLine = typeof tsconfigOrCompilerOptions === 'string'
		? vue.createParsedCommandLine(ts, ts.sys, tsconfigOrCompilerOptions)
		: vue.createParsedCommandLineByJson(ts, ts.sys, rootDir, tsconfigOrCompilerOptions);

	return vue.createVueLanguagePlugin<string>(
		ts,
		commonLine.options,
		commonLine.vueOptions,
		fileName => fileName
	);
}

export function createVueVinePlugins(ts: typeof import('typescript'), tsconfig: string): LanguagePlugin<string>[] {
	const rootDir = path.dirname(tsconfig);

	let vue: typeof import('@vue/language-core');
	let vueVine: typeof import('@vue-vine/language-service');
	let pkgPath: string | undefined;

	if (pkgPath = findPackageJsonByDir(ts, rootDir, '@vue-vine/language-service')) {
		const pkgDir = path.dirname(pkgPath);
		vueVine = require('@vue-vine/language-service');
		vue = require(require.resolve('@vue/language-core', { paths: [pkgDir] }));
	} else if (pkgPath = findPackageJsonByDir(ts, rootDir, 'vue-vine-tsc')) {
		const pkgDir = path.dirname(pkgPath);
		vue = require(require.resolve('@vue/language-core', { paths: [pkgDir] }));
		vueVine = require(require.resolve('@vue/language-core', { paths: [pkgDir] }));
	} else {
		throw new Error('Missing @vue-vine/language-service or vue-vine-tsc.');
	}

	const commonLine = vue.createParsedCommandLine(ts, ts.sys, tsconfig, true);
	const globalTypesFilePath = vueVine.setupGlobalTypes(rootDir, commonLine.vueOptions as any, ts.sys);
	if (globalTypesFilePath) {
		commonLine.vueOptions.__setupedGlobalTypes = {
			absolutePath: globalTypesFilePath,
		};
	}

	return [
		vue.createVueLanguagePlugin<string>(
			ts,
			commonLine.options,
			commonLine.vueOptions,
			id => id
		),
		vueVine.createVueVineLanguagePlugin(
			ts,
			{
				compilerOptions: commonLine.options,
				vueCompilerOptions: commonLine.vueOptions as any,
				target: 'tsc',
			}
		),
	];
}

export async function createMdxPlugin(_ts: typeof import('typescript'), tsconfig: string): Promise<LanguagePlugin<string>> {
	const rootDir = path.dirname(tsconfig);

	let mdx: any;

	try {
		mdx = await import(require.resolve('@mdx-js/language-service', { paths: [rootDir] }));
	} catch {
		throw new Error('Missing @mdx-js/language-service.');
	}

	return mdx.createMdxLanguagePlugin();
}

export function createAstroPlugin(_ts: typeof import('typescript'), tsconfig: string): LanguagePlugin<string> {
	const rootDir = path.dirname(tsconfig);

	let astro: any;

	try {
		astro = require(require.resolve('@astrojs/ts-plugin/dist/language.js', { paths: [rootDir] }));
	} catch (err) {
		throw new Error('Missing @astrojs/ts-plugin.');
	}

	return astro.getLanguagePlugin();
}

export async function createTsMacroPlugins(ts: typeof import('typescript'), tsconfig: string): Promise<LanguagePlugin<string>[]> {
	const rootDir = path.dirname(tsconfig);

	let tsMacro: any;
	let tsMacroOptions: any;
	let tsmcPkgPath: string | undefined;

	if (tsmcPkgPath = findPackageJsonByDir(ts, rootDir, '@ts-macro/language-plugin')) {
		tsMacro = await import(require.resolve('@ts-macro/language-plugin', { paths: [rootDir] }));
		tsMacroOptions = require(require.resolve('@ts-macro/language-plugin/options', { paths: [rootDir] }));
	} else if (tsmcPkgPath = findPackageJsonByDir(ts, rootDir, '@ts-macro/tsc')) {
		const tsmcPath = path.dirname(tsmcPkgPath);
		tsMacro = require(require.resolve('@ts-macro/language-plugin', { paths: [tsmcPath] }));
		tsMacroOptions = require(require.resolve('@ts-macro/language-plugin/options', { paths: [tsmcPath] }));
	} else {
		throw new Error('Missing @ts-macro/language-plugin or @ts-macro/tsc.');
	}

	const compilerOptions = ts.readConfigFile(tsconfig, ts.sys.readFile).config.compilerOptions;

	return tsMacro.getLanguagePlugins(ts, compilerOptions, tsMacroOptions.getOptions(ts));
}

function findPackageJsonByDir(ts: typeof import('typescript'), dir: string, pkgName: string) {
	return ts.findConfigFile(dir, ts.sys.fileExists, `node_modules/${pkgName}/package.json`);
}
