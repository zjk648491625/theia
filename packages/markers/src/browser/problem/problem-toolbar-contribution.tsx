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

import * as React from 'react';
import { injectable, inject } from 'inversify';
import { ProblemWidget } from './problem-widget';
import { CommandService } from '@theia/core/lib/common';
import { ProblemsCommands } from './problem-contribution';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';

@injectable()
export class ProblemToolbarContribution implements TabBarToolbarContribution {

    protected readonly id: string = 'problems.view.filter';

    @inject(CommandService)
    protected readonly commandService: CommandService;

    async registerToolbarItems(toolbarRegistry: TabBarToolbarRegistry): Promise<void> {
        toolbarRegistry.registerItem({
            id: this.id,
            priority: 0,
            render: () => this.renderFilter(),
            isVisible: widget => (widget instanceof ProblemWidget),
        });
        toolbarRegistry.registerItem({
            id: ProblemsCommands.COLLAPSE_ALL_TOOLBAR.id,
            command: ProblemsCommands.COLLAPSE_ALL_TOOLBAR.id,
            tooltip: 'Collapse All',
            priority: 1,
        });
    }

    /**
     * Render the problems-view filter.
     * Used to filter down the marker results present in the problems-view.
     */
    protected renderFilter(): React.ReactNode {
        return <input
            id={this.id}
            key={this.id}
            title={'Problem Filter'}
            placeholder={'Filter Problems'}
            size={25}
            onChange={this.filterProblems}
        ></input>;
    }

    /**
     * Perform problems-view filter.
     */
    protected filterProblems = (event: React.ChangeEvent<HTMLInputElement>) => {
        // The user inputted query.
        const query = event.target.value;
        // Execute the filter toolbar command passing the user query.
        this.commandService.executeCommand(ProblemsCommands.FILTER_TOOLBAR.id, query);
    }

}
