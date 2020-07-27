/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import * as temp from 'temp';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as assert from 'assert';
import { injectable, Container } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { FileUri } from '@theia/core/lib/node';
import { Emitter } from '@theia/core/lib/common';
import { PreferenceChangeEvent } from '@theia/core/lib/browser/preferences/preference-proxy';
import { NsfwFileSystemWatcherServer } from './nsfw-filesystem-watcher';
import { FileSystemWatcherServer } from '../../common/filesystem-watcher-protocol';
import { FileSystemWatcher } from '../../browser/filesystem-watcher';
import { FileSystem, FileShouldOverwrite } from '../../common';
import { FileSystemPreferences, FileSystemConfiguration } from '../../browser/filesystem-preferences';
import { Event } from '@theia/core/lib/common';
/* eslint-disable no-unused-expressions */

const expect = chai.expect;
const track = temp.track();

describe('nsfw-filesystem-watcher', function (): void {

    let root: URI;

    let container: Container;
    let watcher: FileSystemWatcher;
    let watcherServer: NsfwFileSystemWatcherServer;

    this.timeout(10000);

    beforeEach(async () => {
        root = FileUri.create(fs.realpathSync(temp.mkdirSync('node-fs-root')));
        container = createTestContainer();
        watcher = container.get(FileSystemWatcher);
        watcherServer = container.get(FileSystemWatcherServer);
        await sleep(2000);
    });

    afterEach(async () => {
        track.cleanupSync();
        watcherServer.dispose();
    });

    it('Should receive file changes events from in the workspace by default.', async function (): Promise<void> {
        if (process.platform === 'win32') {
            this.skip();
        }
        await watcherServer.watchFileChanges(root.toString());

        const actualUris = new Set<string>();
        watcherServer.setClient({
            onDidFilesChanged: event => {
                event.changes.forEach(c => actualUris.add(c.uri.toString()));
            }
        });

        const expectedUris = [
            createFileUri('foo').toString(),
            createFileUri('foo', 'bar').toString(),
            createFileUri('foo', 'bar', 'baz.txt').toString(),
        ];

        createDirAndCheck('foo');
        await sleep(2000);

        createDirAndCheck('foo', 'bar');
        await sleep(2000);

        createFileAndCheck('foo', 'bar', 'baz.txt').withContent('baz');
        await sleep(2000);

        assert.equal(actualUris.size, expectedUris.length);
        expectedUris.forEach(uri => assert(actualUris.has(uri)));
    });

    it('Should not receive file changes events from in the workspace by default if unwatched', async function (): Promise<void> {
        if (process.platform === 'win32') {
            this.skip();
        }
        const watcherId = await watcherServer.watchFileChanges(root.toString());

        const actualUris = new Set<string>();
        watcherServer.setClient({
            onDidFilesChanged: event => {
                event.changes.forEach(c => actualUris.add(c.uri.toString()));
            }
        });

        /* Unwatch root */
        watcherServer.unwatchFileChanges(watcherId);

        createDirAndCheck('foo');
        await sleep(2000);

        createDirAndCheck('foo', 'bar');
        await sleep(2000);

        createFileAndCheck('foo', 'bar', 'baz.txt').withContent('baz');
        await sleep(2000);

        assert.deepEqual(0, actualUris.size);
    });

    it('Updating the `files.watcherExclude` preference should update the watchers', async function (): Promise<void> {
        this.timeout(60_000);

        const preferences: MockFileSystemPreferences = container.get(FileSystemPreferences);
        await watcher.watchFileChanges(root);

        const actualUris = new Set<string>();
        watcher.onFilesChanged(changes => {
            changes.forEach(c => actualUris.add(c.uri.toString()));
        });

        const expectedUris1 = [
            createFileUri('foo').toString(),
            createFileUri('foo', 'bar').toString(),
            createFileUri('foo', 'bar', 'baz.txt').toString(),
        ];

        createDirAndCheck('foo');
        await sleep(2000);

        createDirAndCheck('foo', 'bar');
        await sleep(2000);

        createFileAndCheck('foo', 'bar', 'baz.txt').withContent('baz');
        await sleep(2000);

        assert.equal(actualUris.size, expectedUris1.length);
        expectedUris1.forEach(uri => assert(actualUris.has(uri)));

        actualUris.clear();
        preferences.setWatcherExlude(['**/foo*']);
        await sleep(2000);

        createDirAndCheck('buzz');
        await sleep(2000);

        createFileAndCheck('foo', 'biz.txt').withContent('biz');
        await sleep(2000);

        if (process.platform === 'linux') {
            const expectedUris2 = [
                createFileUri('buzz').toString(),
            ];
            assert.equal(actualUris.size, expectedUris2.length);
            expectedUris2.forEach(uri => assert(actualUris.has(uri)));
        }
    });

    @injectable()
    class MockFileSystemPreferences implements Partial<FileSystemPreferences> {

        onPreferenceChanged: Event<PreferenceChangeEvent<FileSystemConfiguration>>;

        protected _onPreferenceChangedEmitter: Emitter<PreferenceChangeEvent<FileSystemConfiguration>>;
        protected _watcherExclude: {
            [globPattern: string]: boolean;
        };

        constructor() {
            this._watcherExclude = {};
            this._onPreferenceChangedEmitter = new Emitter();
            this.onPreferenceChanged = this._onPreferenceChangedEmitter.event;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get(preferenceName: any): any {
            if (preferenceName !== 'files.watcherExclude') {
                throw new Error('can only get \'files.watcherExclude\'');
            }
            return this._watcherExclude;
        }

        setWatcherExlude(patterns: string[]): void {
            const oldValue = this._watcherExclude;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newValue: any = {};
            for (const pattern of patterns) {
                newValue[pattern] = true;
            }
            this._watcherExclude = newValue;
            this._onPreferenceChangedEmitter.fire({
                preferenceName: 'files.watcherExclude',
                oldValue,
                newValue,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as Partial<PreferenceChangeEvent<any>> as any);
        }
    }

    function createTestContainer(): Container {
        const c = new Container();
        c.bind(FileSystemWatcher).toSelf().inSingletonScope();
        c.bind<FileSystemWatcherServer>(FileSystemWatcherServer).toConstantValue(
            new NsfwFileSystemWatcherServer({ verbose: true })
        );
        // only bind the filesystem functions that will be called during this test:
        c.bind<Partial<FileSystem>>(FileSystem).toConstantValue({
            setClient: client => { },
        });
        c.bind<FileShouldOverwrite>(FileShouldOverwrite).toConstantValue(
            async (originalStat, currentStat) => true
        );
        c.bind(FileSystemPreferences).to(MockFileSystemPreferences).inSingletonScope();
        return c;
    }

    function sleep(time: number): Promise<unknown> {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    /** shortcut to the `uri.resolve().resolve()...` madness */
    function createFileUri(...parts: string[]): URI {
        let uri = root;
        for (const part of parts) {
            uri = uri.resolve(part);
        }
        return uri;
    }

    /** creates an OS-specific string path based on the test fs root */
    function fsPath(...parts: string[]): string {
        return FileUri.fsPath(createFileUri(...parts));
    }

    function createDirAndCheck(...parts: string[]): string {
        const dirPath = fsPath(...parts);
        fs.mkdirSync(dirPath);
        expect(fs.statSync(dirPath).isDirectory()).to.be.true;
        return dirPath;
    }

    /** you **must** call `.withContent`! */
    function createFileAndCheck(...parts: string[]): CreateFileSyntax {
        return {
            withContent: content => {
                const filePath = fsPath(...parts);
                fs.writeFileSync(filePath, content);
                expect(fs.readFileSync(filePath, 'utf8')).to.be.equal(content);
                return filePath;
            },
        };
    }

    interface CreateFileSyntax {
        withContent(content: string): string;
    }

});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any) => {
    console.error('Unhandled promise rejection: ' + reason);
});
