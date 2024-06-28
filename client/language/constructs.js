/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const languageNamespace = new Namespace("language");

const ConstructType = addNamespaceType(languageNamespace, "Construct",
    (value) => value instanceof Construct);

class Construct {
  type() {
    panic("Construct.type() not implemented");
  }

  traversePreOrder(visitor) {
    visitor(this);
  }

  accept(visitor, payload) {
    panic("Construct.accept() not implemented");
  }

  evaluate(context) {
    panic("Construct.evaluate() not implemented");
  }

  toString() {
    return this.constructor.name + ";";
  }
}

class ConstantConstruct extends Construct {
  constructor(value, valueType) {
    super();
    this.value = value;
    this.valueType = valueType;
  }

  accept(visitor, payload) {
    return visitor.visitConstantConstruct(this, payload);
  }

  type() {
    return this.valueType;
  }

  evaluate(context) {
    return this.value;
  }
}

class ErrorConstruct extends Construct {
  constructor(message) {
    super();
    this.message = message;
  }

  accept(visitor, payload) {
    return visitor.visitErrorConstruct(this, payload);
  }

  type() {
    return NullType;
  }

  evaluate(context) {
    return null;
  }
}

class FieldConstruct extends Construct {
  constructor(field) {
    super();
    this.field = field;
  }

  accept(visitor, payload) {
    return visitor.visitFieldConstruct(this, payload);
  }

  type() {
    return this.field.type;
  }

  evaluate(context) {
    return this.field.fieldReference;
  }
}

class MethodConstruct extends Construct {
  constructor(method) {
    super();
    this.method = method;
  }

  accept(visitor, payload) {
    return visitor.visitMethodConstruct(this, payload);
  }

  type() {
    return this.method.resultType;
  }

  evaluate(context) {
    return this.method.getImplementation();
  }

  toString() {
    return this.constructor.name + ":" + this.method.name;
  }
}

class CallConstruct extends Construct {
  constructor(theFunction, theArguments) {
    super();
    this.theFunction = theFunction;
    this.theArguments = theArguments;

    ConstructType.check(theFunction);
    for (const argument of theArguments) {
      ConstructType.check(argument);
    }
  }

  traversePreOrder(visitor) {
    visitor(this);
    this.theFunction.traversePreOrder(visitor);
    for (const argument of this.theArguments) {
      argument.traversePreOrder(visitor);
    }
  }

  accept(visitor, payload) {
    return visitor.visitCallConstruct(this, payload);
  }

  type() {
    // TODO: result is a return type of the function.
    return this.theFunction.type();
  }

  evaluate(context) {
    const functionValue = this.theFunction.evaluate(context);
    // TODO: gracefully handle type errors here.
    FunctionType.check(functionValue);
    const callArguments = new Array();
    for (const argument of this.theArguments) {
     callArguments.push(argument.evaluate(context));
    }
    return functionValue(...callArguments);
  }

  toString() {
    return this.constructor.name + ":" + this.theFunction;
  }
}

class ConstructVisitor {
  visit(construct, payload) {
    return construct.accept(this, payload);
  }

  visitConstruct() {
    panic("ConstructVisitor.visitConstruct() not implemented");
  }

  visitConstantConstruct(construct, payload) {
    return this.visitConstruct(construct, payload);
  }

  visitErrorConstruct(construct, payload) {
    return this.visitConstruct(construct, payload);
  }

  visitFieldConstruct(construct, payload) {
    return this.visitConstruct(construct, payload);
  }

  visitMethodConstruct(construct, payload) {
    return this.visitConstruct(construct, payload);
  }

  visitCallConstruct(construct, payload) {
    return this.visitConstruct(construct, payload);
  }
}
