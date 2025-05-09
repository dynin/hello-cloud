/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

function isOneliner(construct) {
  if (construct instanceof CallConstruct) {
    for (const argument of construct.theArguments) {
      if (argument instanceof CallConstruct) {
        return false;
      }
    }
  }

  return true;
}

const INDENT_SPACES = "    ";

class ConstructTextFormatter extends ConstructVisitor {
  visitConstantConstruct(construct, indent) {
    return indent + '"' + construct.value + '"';
  }

  visitErrorConstruct(construct, indent) {
    return indent + "*ERROR*:" + construct.message;
  }

  visitFieldConstruct(construct, indent) {
    return indent + construct.field.name;
  }

  visitMethodConstruct(construct, indent) {
    return indent + construct.method.name;
  }

  visitCallConstruct(construct, indent) {
    const oneliner = isOneliner(construct);
    var subIndent = oneliner ? "" : indent + INDENT_SPACES;
    var result = indent + this.visit(construct.theFunction, "") + "(";
    const theArguments = construct.theArguments;
    for (var i = 0; i < theArguments.length; ++i) {
      const argument = theArguments[i];
      if (!oneliner) {
        result += "\n";
      }
      result += this.visit(argument, subIndent);
      if (i < theArguments.length - 1) {
        result += ", ";
      }
    }
    if (oneliner) {
      result += ")";
    } else {
      result += "\n" + indent + ")";
    }
    return result;
  }
}

function formatConstructAsText(construct) {
  return new ConstructTextFormatter().visit(construct, "");
}

const DOTDOTDOT = "\u00B7\u00B7\u00B7";
const RIGHT_TRIANGLE = "\u25B8";
const DOWN_TRIANGLE = "\u25BE";

class ConstructViewFormatter extends ConstructVisitor {
  visitConstantConstruct(construct) {
    return makeTextView('"' + construct.value + '"', Styles.Literal);
  }

  visitErrorConstruct(construct) {
    return makeTextView("*ERROR*:" + construct.message, Styles.RedText);
  }

  visitFieldConstruct(construct) {
    return makeTextView(construct.field.name);
  }

  visitMethodConstruct(construct) {
    return makeTextView(construct.method.name);
  }

  visitCallConstruct(construct) {
    const oneliner = isOneliner(construct);
    var views = [ this.visit(construct.theFunction), makeTextView("(") ];
    var expanded;
    var content;
    if (!oneliner) {
      expanded = makeBoxed(true, BooleanType);
      content = new Array();
      const link = makeLinkView(
          conditional(expanded, DOWN_TRIANGLE, RIGHT_TRIANGLE, null, "triangle"),
          () => setValue(expanded, !getValue(expanded)), Styles.BlueLink);
      views.push(link);
    }
    const theArguments = construct.theArguments;
    for (var i = 0; i < theArguments.length; ++i) {
      const argument = theArguments[i];
      const argumentViews = [ this.visit(argument) ];
      if (i < theArguments.length - 1) {
        argumentViews.push(makeTextView(", "));
      }
      if (oneliner) {
        views = views.concat(argumentViews);
      } else {
        content.push(makeDivView(makeContainerViewFromArray(argumentViews)));
      }
    }
    if (!oneliner) {
      views.push(makeVisibleView(
          makeDivView(makeContainerViewFromArray(content), Styles.Indent), expanded));
    }
    views.push(makeTextView(")"));
    return makeContainerViewFromArray(views);
  }
}

function formatConstructAsView(construct) {
  const view = new ConstructViewFormatter().visit(construct);
  ViewType.check(view);
  return makeDivView(view);
}
