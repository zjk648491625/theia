/********************************************************************************
 * Copyright (C) 2020 Arm and others.
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
import { Git, Repository, CommitWithChanges } from '../common';
import { ScmExtraSupportContribution } from '@theia/scm/lib/browser/scm-service';
import { ScmAmendSupport } from '@theia/scm/lib/browser/scm-provider';
import { ScmCommit } from '@theia/scm/lib/browser/scm-provider';
import { ScmProvider } from '@theia/scm/lib/browser/scm-provider';

@injectable()
export class GitAmendContribution implements ScmExtraSupportContribution {
    @inject(Git) protected readonly git: Git;

    readonly id = 'git';

    addExtraSupport(provider: ScmProvider): void {
        const amendSupport = new GitAmendSupport(provider.rootUri, this.git);
        provider.amendSupport = amendSupport;
    };
}

export class GitAmendSupport implements ScmAmendSupport {

    protected readonly repository: Repository;

    constructor(rootUri: string, protected readonly git: Git) {
        this.repository = { localUri: rootUri };
     }

    public async getInitialAmendingCommits(amendingHeadCommitSha: string, latestCommitSha: string | undefined): Promise<ScmCommit[]> {
        const commits = await this.git.log(
            this.repository,
            {
                range: { toRevision: amendingHeadCommitSha, fromRevision: latestCommitSha },
                maxCount: 50
            }
        );

        return commits.map(commit => this.createScmCommit(commit));
    }

    public async getMessage(commit: string): Promise<string> {
        return (await this.git.exec(this.repository, ['log', '-n', '1', '--format=%B', commit])).stdout.trim();
    }

    public async reset(commit: string): Promise<void> {
        if (commit === 'HEAD~' && await this.isHeadInitialCommit()) {
            await this.git.exec(this.repository, ['update-ref', '-d', 'HEAD']);
        } else {
            await this.git.exec(this.repository, ['reset', commit, '--soft']);
        }
    }

    protected async isHeadInitialCommit(): Promise<boolean> {
        const result = await this.git.revParse(this.repository, { ref: 'HEAD~' });
        return !result;
    }

    public async getLastCommit(): Promise<ScmCommit | undefined> {
        const commits = await this.git.log(this.repository, { maxCount: 1 });
        if (commits.length > 0) {
            return this.createScmCommit(commits[0]);
        }
    }

    // make static, but dupped in git-history-support
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

}
