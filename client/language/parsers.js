/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

class ParserContext {
  constructor() {
    this.imports = [ viewsNamespace ];
  }

  lookup(name) {
    for (const namespace of this.imports) {
      var member = namespace.getMember(name);
      if (member) {
        return member;
      }
    }

    return null;
  }
}

function parseExpression(expression, context) {
  if (StringType.isInstance(expression)) {
    if (expression.length == 0) {
      return new ConstantConstruct("", StringType);
    }

    const colon = expression.indexOf(':');
    var result = null;

    if (colon < 0) {
      result = context.lookup(expression);
    } else {
      const first = expression.substring(0, colon);
      const second = expression.substring(colon + 1);

      if (first == "s") {
        return new ConstantConstruct(second, StringType);
      }

      const namespace = Namespace.namespacesByName.get(first);
      if (namespace != null) {
        result = namespace.getMember(second);
      }
    }

    if (result == null) {
      return new ErrorConstruct("Member expected: " + expression);
    } else if (result instanceof Field) {
      return new FieldConstruct(result);
    } else if (result instanceof Method) {
      return new MethodConstruct(result);
    } else {
      return new ErrorConstruct("Field or method expected: " + expression);
    }
  } else if (ListType.isInstance(expression)) {
    if (expression.length == 0) {
      return new ConstantConstruct([], ListType);
    }

    const functionConstruct = parseExpression(expression[0], context);
    const theArguments = [];
    for (var index = 1; index < expression.length; ++index) {
      theArguments.push(parseExpression(expression[index], context));
    }

    return new CallConstruct(functionConstruct, theArguments);
  } else {
    return new ErrorConstruct("Unrecognized expression: " + expression);
  }
}

function parseAndCheck(expression) {
  const parsedConstruct = parseExpression(expression, new ParserContext());

  parsedConstruct.traversePreOrder((construct) => {
    if (construct instanceof ErrorConstruct) {
      // TODO: gracefully handle parse errors.
      panic("Parse error: " + construct.message);
    }
  });

  return parsedConstruct;
}
