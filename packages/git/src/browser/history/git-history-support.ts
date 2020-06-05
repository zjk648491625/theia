/********************************************************************************
 * Copyright (C) 2019 Arm and others.
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

import { inject, injectable } from 'inversify';
import { Emitter, DisposableCollection } from '@theia/core';
import { LabelProvider } from '@theia/core/lib/browser';
import { Git, WorkingDirectoryStatus, CommitWithChanges } from '../../common';
import { ScmExtraSupportContribution } from '@theia/scm/lib/browser/scm-service';
import { ScmHistorySupport, HistoryWidgetOptions } from '@theia/scm-extra/lib/browser/history/scm-history-widget';
import { ScmCommit } from '@theia/scm/lib/browser/scm-provider';
import { ScmHistoryCommit, ScmFileChange } from '@theia/scm-extra/lib/browser/scm-file-change-node';
import { GitCommitDetailWidgetOptions } from './git-commit-detail-widget';
import { ScmProvider } from '@theia/scm/lib/browser/scm-provider';
import { ScmHistoryProvider } from '@theia/scm-extra/lib/browser/history';
import { GitWatcher } from '../../common/git-watcher';
import { GitScmFileChange, GitScmCommit, GitScmFileChangeContext } from '../git-scm-file-change';
import { GitCommitDetailUri } from './git-commit-detail-open-handler';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class GitHistoryContribution implements ScmExtraSupportContribution {
    @inject(Git) protected readonly git: Git;
    @inject(GitWatcher) protected readonly gitWatcher: GitWatcher;
    @inject(LabelProvider) protected readonly labelProvider: LabelProvider;

    readonly id = 'git';

    addExtraSupport(provider: ScmProvider): void {
        const historySupport = new GitHistorySupport(provider.rootUri, this.git, this.gitWatcher, this.labelProvider);
        (provider as ScmHistoryProvider).historySupport = historySupport;
    };
}

// TODO westbury - consider injecting this from factory
export class GitHistorySupport implements ScmHistorySupport, GitScmFileChangeContext {

    protected toDispose = new DisposableCollection();
    protected workingDirectoryStatus: WorkingDirectoryStatus | undefined;

    constructor(
        public readonly rootUri: string,
        protected readonly git: Git,
        protected readonly gitWatcher: GitWatcher,
        public readonly labelProvider: LabelProvider,
    ) {};

    async getCommitHistory(options?: HistoryWidgetOptions): Promise<ScmHistoryCommit[]> {
        const repository = { localUri: this.rootUri };
        const gitOptions: Git.Options.Log = {
            uri: options ? options.uri : undefined,
            maxCount: options ? options.maxCount : undefined,
            shortSha: true
        };

        const commits = await this.git.log(repository, gitOptions);
        if (commits.length > 0) {
            return commits.map(commit => this.createScmHistoryCommit(commit));
        } else {
            const pathIsUnderVersionControl = !options || !options.uri || await this.git.lsFiles(repository, options.uri, { errorUnmatch: true });
            if (!pathIsUnderVersionControl) {
                throw new Error('It is not under version control.');
            } else {
                throw new Error('No commits have been committed.');
            }
        }
    }

    protected readonly onDidChangeHistoryEmitter = new Emitter<void>({
        onFirstListenerAdd: () => this.onFirstListenerAdd(),
        onLastListenerRemove: () => this.onLastListenerRemove()
    });
    readonly onDidChangeHistory = this.onDidChangeHistoryEmitter.event;

    protected async onFirstListenerAdd(): Promise<void> {
        const repository = { localUri: this.rootUri };
        this.toDispose.push(this.gitWatcher.onGitEvent(async event => {
            if (event.source.localUri === repository.localUri) {
                const status = await this.git.status(repository);
                const oldStatus = this.workingDirectoryStatus;
                this.workingDirectoryStatus = status;

                let isBranchChanged = false;
                let isHeaderChanged = false;
                if (oldStatus) {
                    isBranchChanged = !!status && status.branch !== oldStatus.branch;
                    isHeaderChanged = !!status && status.currentHead !== oldStatus.currentHead;
                }
                if (isBranchChanged || isHeaderChanged || oldStatus === undefined) {
                    this.onDidChangeHistoryEmitter.fire(undefined);
                }
            }
        }));
        this.toDispose.push(await this.gitWatcher.watchGitChanges(repository));
    }

    protected onLastListenerRemove(): void {
        this.toDispose.dispose();
    }

    public createScmCommit(gitCommit: CommitWithChanges): ScmCommit {
        const scmCommit: ScmCommit = {
            id: gitCommit.sha,
            summary: gitCommit.summary,
            authorName: gitCommit.author.name,
            authorEmail: gitCommit.author.email,
            authorDateRelative: gitCommit.authorDateRelative,
        };
        return scmCommit;
    }

    public createScmHistoryCommit(gitCommit: CommitWithChanges): ScmHistoryCommit {
        const range = {
            fromRevision: gitCommit.sha + '~1',
            toRevision: gitCommit.sha
        };

        const scmCommit: GitScmCommit = {
            ...this.createScmCommit(gitCommit),
            commitDetailUri: this.toCommitDetailUri(gitCommit.sha),
            gitFileChanges: gitCommit.fileChanges.map(change => new GitScmFileChange(change, this, range)),
            get fileChanges(): ScmFileChange[] {
                return this.gitFileChanges;
            },
            get commitDetailOptions(): GitCommitDetailWidgetOptions {
                return {
                    commitSha: gitCommit.sha,
                    commitMessage: gitCommit.summary,
                    messageBody: gitCommit.body,
                    authorName: gitCommit.author.name,
                    authorEmail: gitCommit.author.email,
                    authorDate: gitCommit.author.timestamp,
                    authorDateRelative: gitCommit.authorDateRelative,
                };
            }
        };
        return scmCommit;
    }

    protected toCommitDetailUri(commitSha: string): URI {
        return new URI('').withScheme(GitCommitDetailUri.GIT_COMMIT_DETAIL).withFragment(commitSha);
    }

}
