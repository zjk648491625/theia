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


import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import URI from '@theia/core/lib/common/uri';
import { expect } from 'chai';
import { Container } from 'inversify';
import { ContributionProvider } from '@theia/core/lib/common';
import { LabelProvider, LabelProviderContribution, DefaultUriLabelProviderContribution } from '@theia/core/lib/browser';
import { MarkerTreeLabelProvider } from './marker-tree-label-provider';
import { TreeLabelProvider } from '@theia/core/lib/browser/tree/tree-label-provider';
import { MarkerInfoNode } from './marker-tree';

disableJSDOM();

let markerTreeLabelProvider: MarkerTreeLabelProvider;

before(() => {
    disableJSDOM = enableJSDOM();
    const testContainer = new Container();
    testContainer.bind(MarkerTreeLabelProvider).toSelf().inSingletonScope();
    testContainer.bind(TreeLabelProvider).toSelf().inSingletonScope();
    testContainer.bind(DefaultUriLabelProviderContribution).toSelf().inSingletonScope();
    testContainer.bind(LabelProvider).toSelf().inSingletonScope();
    testContainer.bind<ContributionProvider<LabelProviderContribution>>(ContributionProvider).toDynamicValue(ctx => ({
        getContributions(): LabelProviderContribution[] {
            return [
                ctx.container.get<MarkerTreeLabelProvider>(MarkerTreeLabelProvider),
                ctx.container.get<TreeLabelProvider>(TreeLabelProvider),
                ctx.container.get<DefaultUriLabelProviderContribution>(DefaultUriLabelProviderContribution)
            ];
        }
    })).inSingletonScope();
    testContainer.bind(LabelProviderContribution).toConstantValue({});
    markerTreeLabelProvider = testContainer.get<MarkerTreeLabelProvider>(MarkerTreeLabelProvider);
});

after(() => {
    disableJSDOM();
});

describe('Marker Tree Label Provider', () => {

    it('should return the proper label for #getName', () => {
        const markerInfoNode: MarkerInfoNode = {
            id: 'marker-info-node',
            parent: {
                id: 'marker-info-node-parent',
                kind: 'error',
                parent: undefined,
                children: []
            },
            numberOfMarkers: 1,
            children: [],
            expanded: true,
            selected: true,
            uri: new URI('test/a.ts').withScheme('file')
        };
        const result = markerTreeLabelProvider.getName(markerInfoNode);
        console.log('desc: ', result);
        expect(result).equals('a.ts');
    });

});
