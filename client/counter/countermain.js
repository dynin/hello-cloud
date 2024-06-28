/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const counterText = ["elements:stringJoin",
  "'The button was pressed ", "counter:state", "' times."];
  // stringJoin("The button was pressed ", counterData.state, " times.");
const counterLabel = ["views:makeTextView", counterText, "styles:Message"];
const contentView =
    ["views:makeContainerView",
        ["views:makeTextView", "'Hello, Cloud: Counter Demo", "styles:Header"],
        ["views:makeVisibleView",
            ["views:makeContainerView",
                counterLabel,
                ["views:makeButtonView", "'Increment", "counter:increment"],
                ["views:makeButtonView", "'Reset", "counter:reset", "styles:RedText"]
            ],
            "counter:isInitialized"
        ]
    ];

function isOnFilesystem() {
  return window.location.href.toLowerCase().startsWith("file:");
}

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

  setRootView(makeContainerView(mainView, makeStatusView(counterData, viewSource)));

  if (isOnFilesystem()) {
    setValue(counterData.isInitialized, true);
  } else {
    new DatastoreSync(counterData, notOp(isViewSource)).start();
  }
}
