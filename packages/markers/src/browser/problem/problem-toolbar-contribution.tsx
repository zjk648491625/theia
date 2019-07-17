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
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';

@injectable()
export class ProblemToolbarContribution implements TabBarToolbarContribution {

    protected readonly ID: string = 'problems.widget.filter';

    @inject(ProblemWidget)
    protected readonly problemWidget: ProblemWidget;

    async registerToolbarItems(toolbarRegistry: TabBarToolbarRegistry): Promise<void> {
        toolbarRegistry.registerItem({
            id: this.ID,
            priority: 0,
            render: () => this.renderFilter(),

            isVisible: widget => (widget instanceof ProblemWidget),
        });
    }

    /**
     * Render the filter input element used to be able
     * to filter down the results from the problems-widget.
     */
    protected renderFilter(): React.ReactNode {
        return <input
            id={this.ID}
            key={this.ID}
            title={'Filter Problems.'}
            placeholder={'Filter.'}
            size={20}
            onChange={this.onFilter}
        />;
    }

    /**
     * Handle the input from the filter.
     */
    protected onFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        console.log(`query: ${query}`);
        this.problemWidget.filterTree(query);
    }

}
