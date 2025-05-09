/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const counterText = ["elements:stringJoin",
  "s:The button was pressed ", "counter:state", "s: times."];
const counterLabel = ["makeTextView", counterText, "styles:Message"];
const contentView =
    ["makeContainerView",
        ["makeTextView", "s:Hello, Cloud: Counter Demo", "styles:Header"],
        ["makeVisibleView",
            ["makeContainerView",
                counterLabel,
                ["makeButtonView", "s:Increment", "counter:increment"],
                ["makeButtonView", "s:Reset", "counter:reset", "styles:RedText"]
            ],
            ["elements:notEqualsOp", "counter:syncStatus", "elements:NOT_INITIALIZED"]
        ]
    ];

function main() {
  const isViewSource = makeBoxed(false, BooleanType);
  function toggleViewSource() { setValue(isViewSource, !getValue(isViewSource)); }
  const viewSource = makeLinkView(
    conditional(isViewSource, "Run", "View Source"), toggleViewSource, Styles.ViewSource);

  const parsedContent = parseAndCheck(contentView);
  const content = parsedContent.evaluate(null);
  var sourceView;
  if (true) {
    sourceView = formatConstructAsView(parsedContent);
  } else {
    const sourceText = formatConstructAsText(parsedContent);
    sourceView = makeTextView(sourceText, Styles.Code);
  }

  const mainView = conditional(isViewSource, sourceView, content);
  const rootView = makeContainerView(mainView, makeStatusView(counterData, viewSource));
  setRootView(rootView);

  new DatastoreSync(counterData, notOp(isViewSource));
  sync(counterData, Priority.NORMAL, ForeverLifespan.instance);
}
