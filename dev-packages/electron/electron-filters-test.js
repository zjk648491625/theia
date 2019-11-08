#!/usr/bin/env node
/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
'use-strict'

// @ts-check

const yargs = require('yargs');

const { platforms, libffmpegFilters, libffmpegAbsolutePath } = require('./electron-ffmpeg-lib');

const bad = new Set([
    'h264',
    'aac',
]);

async function main() {
    const options = yargs
        .option('absolutePath', {
            alias: 'a',
            description: 'Absolute path to the ffmpeg shared library.',
        })
        .option('electronDist', {
            alias: 'd',
            description: 'Electron distribution location.',
        })
        .option('platform', {
            alias: 'p',
            description: 'Dictates where the library is located within the Electron distribution.',
            choices: platforms,
        })
        .help().alias('h', 'help')
        .exitProcess(false)
        .argv;

    if (options.help) {
        return; // help is being displayed.
    }
    const libraryPath = options['absolutePath'] || libffmpegAbsolutePath({
        electronDist: options['electronDist'],
        platform: options['platform'],
    });
    const filters = libffmpegFilters(libraryPath);
    const found = [];
    for (const filter of filters) {
        console.log(filter);
        if (bad.has(filter.name.toLowerCase())) {
            found.push(filter);
        }
    }
    if (found.length > 0) {
        throw new Error(`${found.length} bad / ${filters.length} found\n${
            found.map(filter => `> ${filter.name} detected (${filter.longName})`).join('\n')}`);
    }
    console.info(`"${libraryPath}" does not contain proprietary filters (${filters.length} found).`);
}

main().catch(error => {
    console.error(error);
    process.exit(error.code || 127);
})
