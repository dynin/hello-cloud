/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const stylesNamespace = new Namespace("styles");

class Style {
  constructor(name, cssClassName) {
    this.name = name;
    this.cssClassName = cssClassName;
  }
}

const StyleType = addNamespaceType(stylesNamespace, "style", (value) => value instanceof Style);

const Styles = { };

function addStyle(name, cssClassName) {
  const style = new Style(name, cssClassName);
  const styleReference = new ConstantReference(style, StyleType);

  stylesNamespace.addMember(new Field(stylesNamespace, name, styleReference));

  Styles[name] = style;
}

addStyle("Default", "default");
addStyle("Header", "header");
addStyle("Label", "label");
addStyle("Message", "message");
addStyle("Snippet", "snippet");
addStyle("NoMessages", "no-messages");
addStyle("RedText", "red-text");

addStyle("StatusBlock", "status-block");
addStyle("GreenStatus", "green-status");
addStyle("YellowStatus", "yellow-status");
addStyle("RedStatus", "red-status");
addStyle("BlueStatus", "blue-status");

addStyle("ViewSource", "view-source");
addStyle("Code", "code");
addStyle("Literal", "literal");
addStyle("Indent", "indent");
addStyle("BlueLink", "blue-link");
