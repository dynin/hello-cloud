/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

function parseExpression(expression) {
  if (StringType.isInstance(expression)) {
    if (expression.length == 0) {
      return new ConstantConstruct("", StringType);
    } else if (expression.charAt(0) == "'") {
      return new ConstantConstruct(expression.substring(1), StringType);
    } else {
      const result = lookupMember(expression);
      if (result == null) {
        return new ErrorConstruct("Member expected: " + expression);
      } else if (result instanceof Field) {
        return new FieldConstruct(result);
      } else if (result instanceof Method) {
        return new MethodConstruct(result);
      } else {
        return new ErrorConstruct("Field or method expected: " + expression);
      }
    }
  } else if (ListType.isInstance(expression)) {
    if (expression.length == 0) {
      return new ConstantConstruct([], ListType);
    }

    const functionConstruct = parseExpression(expression[0]);
    const theArguments = [];
    for (var index = 1; index < expression.length; ++index) {
      theArguments.push(parseExpression(expression[index]));
    }

    return new CallConstruct(functionConstruct, theArguments);
  } else {
    return new ErrorConstruct("Unrecognized expression: " + expression);
  }
}

function parseAndCheck(expression) {
  const parsedConstruct = parseExpression(expression);

  parsedConstruct.traversePreOrder((construct) => {
    if (construct instanceof ErrorConstruct) {
      // TODO: gracefully handle parse errors.
      panic("Parse error: " + construct.message);
    }
  });

  return parsedConstruct;
}
