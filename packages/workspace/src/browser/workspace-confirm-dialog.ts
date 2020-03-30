/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
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

import { inject } from 'inversify';
import { ConfirmDialog, ConfirmDialogProps } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';

export class RemoveWorkspaceFolderDialog extends ConfirmDialog {

    constructor(
        @inject(ConfirmDialogProps) protected readonly props: ConfirmDialogProps,
        uris: URI[]
    ) {
        super(props);
        this.appendWorkspaceFolders(uris);
    }

    protected appendWorkspaceFolders(uris: URI[]): void {
        if (uris.length > 0) {
            const messageContainer = document.createElement('div');
            messageContainer.textContent = 'Remove the following folders from workspace? (note: nothing will be erased from disk)';
            const list = document.createElement('ul');
            list.style.listStyleType = 'none';
            uris.forEach(uri => {
                const listItem = document.createElement('li');
                listItem.textContent = uri.displayName;
                console.log(`display-name: ${uri.displayName}`);
                list.appendChild(listItem);
            });
            messageContainer.appendChild(list);
            this.contentNode.appendChild(this.createMessageNode(messageContainer));
        }
    }
}
