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

import { injectable } from 'inversify';
import { FileTreeLabelProvider } from '@theia/filesystem/lib/browser/file-tree/file-tree-label-provider';
import { FileStatNode } from '@theia/filesystem/lib/browser/file-tree';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class CustomLabelProviderContribution extends FileTreeLabelProvider {

    getIcon(node: FileStatNode): string {

        // default icons.
        return this.labelProvider.getIcon(new URI(''));

        // default implementation.
        // return this.labelProvider.getIcon(node.fileStat);

        // will result in no icons displayed for files.
        // return '';
    }

}
