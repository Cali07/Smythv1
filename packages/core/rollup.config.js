import json from '@rollup/plugin-json';
import { createFilter } from '@rollup/pluginutils';
import path from 'path';
import copy from 'rollup-plugin-copy';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescriptPaths from 'rollup-plugin-typescript-paths';
import typescript from 'rollup-plugin-typescript2';

const isProduction = process.env.BUILD === 'prod';

const projectRootDir = __dirname;
const devConfig = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.dev.js',
        format: 'es',
        sourcemap: true,
    },
    plugins: [
        json(),
        typescriptPaths({
            tsconfig: './tsconfig.json', // Ensure this points to your tsconfig file
            preserveExtensions: true,
            nonRelative: false,
        }),
        esbuild({
            sourceMap: true,
            minify: false, //do not enable minify here, it will break the sourcemap (minification is done by terser plugin below)
            treeShaking: false,
        }),

        filenameReplacePlugin(),
        sourcemaps(),
        copy({
            targets: [{ src: 'src/data/*', dest: 'dist/data' }],
        }),
    ],
};

const prodConfig = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true,
    },
    plugins: [
        json(),
        typescriptPaths({
            tsconfig: './tsconfig.json', // Ensure this points to your tsconfig file
            preserveExtensions: true,
            nonRelative: false,
        }),
        esbuild({
            sourceMap: true,
            minify: true,
            treeShaking: true,
        }),
        // typescript({
        //     tsconfig: 'tsconfig.json',
        //     clean: true,
        // }),
        filenameReplacePlugin(),
        sourcemaps(),
        terser(),
        copy({
            targets: [{ src: 'src/data/*', dest: 'dist/data' }],
        }),
    ],
};

let config = isProduction ? prodConfig : devConfig;

export default config;

// this is used to replace the ___FILENAME___ placeholder with source filename
//it's used by the logger to set the appropriate module name
function filenameReplacePlugin() {
    const filter = createFilter('**/*.ts', 'node_modules/**');

    return {
        name: 'filename-replace',
        transform(code, id) {
            if (!filter(id)) return null;

            // Normalize the path for different environments
            const normalizedId = path.normalize(id);

            // Extract the part of the path after '/src' and remove the file extension
            const relativePath = path.relative(path.resolve('src'), normalizedId);
            const filenameWithoutExtension = relativePath.replace(path.extname(relativePath), '');

            // Replace backslashes with forward slashes if on Windows
            const unixStylePath = filenameWithoutExtension.replace(/\\/g, '/');

            const modifiedCode = code.replace(/___FILENAME___/g, unixStylePath);

            return {
                code: modifiedCode,
                map: null, // Handle source maps if necessary
            };
        },
    };
}
