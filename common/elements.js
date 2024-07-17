/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

/**
 * Lifespan keeps track of resources that need to be released, such as event callbacks.
 * Unlike traditional APIs that require passing the same callback to both register and
 * unregister, the Lifespan object releases all registered resources when it is finish()ed.
 * This simplifies the code that uses it, and prevents resource leaks.
 *
 * Lifespan is a lightweight object, so it can be created and finished with low overhead.
 */
class Lifespan {
  /**
   * Construct a Lifespan instance within the context of a given zone.
   * More about zones below, in the documentation of the Zone class.
   */
  constructor(zone) {
    this.zone = zone;
    this.callbacks = new Array();
  }

  /**
   * Register a callback that will be scheduled as an observer when this lifespan is finished.
   */
  onFinish(callback) {
    this.callbacks.push(callback);
  }

  /**
   * Schedule for invokation all callbacks registered with this lifespan.
   *
   * Should be invoked only once, although in the spirit of defensive programming
   * the current implementation gracefully handles multiple invokations.
   */
  finish() {
    if (this.callbacks.length > 0) {
      const callbacksArray = this.callbacks;
      this.callbacks = new Array();

      for (const callback of callbacksArray) {
        this.zone.scheduleObserver(callback);
      }
    }
  }

  /**
   * Create a sub-lifespan that will be finished when this lifespan is finished.
   */
  makeSubSpan() {
    const subSpan = new Lifespan(this.zone);
    this.onFinish(() => subSpan.finish());
    return subSpan;
  }
}

/**
 * Reference is an object that can be dereferenced to fetch a value, as well as to allow
 * registering observers that get invoked when the state of reference changes.
 * Reference also has a type field that is the supertype of the value's type.
 */
class Reference {
  /**
   * Create a Reference instance by providing initial value and type.
   */
  constructor(initialValue, type) {
    this.value = initialValue;
    this.type = type;

    TypeType.check(type);
    this.typecheck(initialValue);
  }

  /**
   * Dereference this Reference.  See also getValue() standalone function.
   */
  getValue() {
    return this.value;
  }

  /**
   * Get notified when the state change for a given lifespan by invoking the given observer.
   */
  observe(lifespan, callback) {
    panic("Must implement observe()");
  }

  /**
   * Validate the value type. Panics if type check fails.
   */
  typecheck(value) {
    this.type.check(value);
  }

  /**
   * Set a name that describes this Reference.  Currently used for debugging purposes only.
   */
  setName(name) {
    if (this.name) {
      panic("Name already set in reference " + this.name);
    }

    this.name = name;
  }

  /**
   * Generate a description of this reference for debugging.
   */
  toString() {
    return this.constructor.name + " " + this.name + " " + this.value;
  }
}

/**
 * A trivial Reference--a wrapper around value that never changes.
 */
class ConstantReference extends Reference {
  /**
   * Create a ConstantReference by providing the value and the type.
   */
  constructor(value, type) {
    super(value, type);
  }

  /**
   * The value never changes, so observe() is a no-op.
   */
  observe(lifespan, callback) {
  }
}

/**
 * A shared superclass that implements Reference contract by maintaining an array of observers.
 * It is subtyped by Boxed and ComputableReference.
 */
class ReferenceWithObservers extends Reference {
  /**
   * Create a ReferenceWithObservers instance by providing initial value and type.
   */
  constructor(initialValue, type) {
    super(initialValue, type);
    this.observers = new Array();
  }

  /**
   * Register a callback with a given lifespan that gets invoked
   * when the reference state changes.
   */
  observe(lifespan, callback) {
    LifespanType.check(lifespan);
    FunctionType.check(callback);

    const observer = new ObserverWithZone(callback, lifespan.zone);
    this.observers.push(observer);
    const referenceState = this;
    lifespan.onFinish(function() {
      const index = referenceState.observers.indexOf(observer);
      if (index >= 0) {
        referenceState.observers.splice(index, 1);
      } else {
        panic("Can't find callback in observer list.");
      }
    });
  }

  /**
   * Invoke all the observes.  Internal use only.
   */
  internalTriggerObservers() {
    if (this.observers.length > 0) {
      // We create a copy of the observer array to defend against in-flight mutations.
      const observersCopy = [...this.observers];
      for (const observer of observersCopy) {
        observer.schedule();
      }
    }
  }
}

/**
 * An internal helper class to keep track of the zone in which observer needs to be invoked.
 * TODO: all callbacks will eventually keep track of affiliated zones, making
 * this class unnecessary.
 */
class ObserverWithZone {
  constructor(callback, zone) {
    this.callback = callback;
    this.zone = zone;
  }

  schedule() {
    this.zone.scheduleObserver(this.callback);
  }
}

/**
 * Boxed type is an implementation of Reference that supports both writes and reads.
 */
class Boxed extends ReferenceWithObservers {
  /**
   * Create a Boxed instance by providing initial value and type.
   */
  constructor(initialValue, type) {
    super(initialValue, type);
  }

  /**
   * Set value in the Boxed instance, and trigger observers.
   */
  setValue(newValue) {
    if (newValue instanceof Reference) {
      return panic("The value in setValue() can't be a reference.");
    }

    // When the value is the same as the current one, do not trigger observers.
    if (newValue == this.value) {
      return;
    }

    this.typecheck(newValue);

    this.value = newValue;
    this.internalTriggerObservers();
  }
}

/**
 * ComputableReference implements the Reference with a value that's computed when
 * it's accessed, and then cached.
 *
 * When recompute method is called, it invalidates the cached value and forces
 * recomputation on the next access.
 *
 * For examples of how ComputableReference is used, see andOp() and other functions
 * below.
 */
class ComputableReference extends ReferenceWithObservers {
  static NEEDS_RECOMPUTE = new Object();

  /**
   * Create a ComputableReference given a function that produces the value,
   * and the type bound for that value.
   */
  constructor(computeFunction, type) {
    super(ComputableReference.NEEDS_RECOMPUTE, type);
    this.compute = computeFunction;
    this.recompute = () => this.doRecompute();
    this.dependsOnReferences = [];
  }

  /**
   * Dereferences this instance by calling the function that produces the value,
   * and caching it.
   */
  getValue() {
    if (this.value === ComputableReference.NEEDS_RECOMPUTE) {
      const newValue = this.compute();

      if (newValue === ComputableReference.NEEDS_RECOMPUTE) {
        panic("Computed NEEDS_RECOMPUTE in compute reference: " + this);
      }

      this.typecheck(newValue);
      this.value = newValue;
    }

    return this.value;
  }

  /**
   * Validate the value type, allowing a special NEEDS_RECOMPUTE value which marks
   * ComputableReference that needs to produce a value on the next access.
   */
  typecheck(value) {
    if (value !== ComputableReference.NEEDS_RECOMPUTE) {
      super.typecheck(value);
    }
  }

  /**
   * Invalidates cached value in this ComputableReference instance, and triggers observers.
   * This function should be accessed via the `recompute` field.
   */
  doRecompute() {
    if (this.value === ComputableReference.NEEDS_RECOMPUTE) {
      return;
    }

    this.value = ComputableReference.NEEDS_RECOMPUTE;
    this.internalTriggerObservers();
  }

  /**
   * Add an object that this reference depends on.
   */
  dependsOn(anotherObject) {
    if (!(anotherObject instanceof Reference)) {
      return;
    }

    if (this.introducesCycle(anotherObject)) {
      panic("Circular dependency for " + this);
    }

    this.dependsOnReferences.push(anotherObject);
  }

  /**
   * Check for circular dependency.
   */
  introducesCycle(anotherReference) {
    if (anotherReference == this) {
      return true;
    }

    const dependenciesList = [ anotherReference ];
    const dependenciesSet = new Set();
    dependenciesSet.add(anotherReference);

    var index;
    for (index = 0; index < dependenciesList.length; ++index) {
      const theReference = dependenciesList[index];
      if (theReference == this) {
        return true;
      }

      if (theReference instanceof ComputableReference) {
        for (const dependence of theReference.dependsOnReferences) {
          if (!dependenciesSet.has(dependence)) {
            dependenciesList.push(dependence);
            dependenciesSet.add(dependence);
          }
        }
      }
    }

    return false;
  }

  /**
   * Add a dependency and introduce observer in one operation.
   * The observer recomputes the reference.
   */
  observeAndDependsOn(object, lifespan) {
    if (object instanceof Reference) {
      object.observe(lifespan, this.recompute);
      this.dependsOn(object);
    }
  }
}

/**
 * Dereference this object, if needed.  This allows mixing References and objects
 * without syntactic overhead: getValue() works with either one.
 *
 * If the argument is a Reference, the getValue() method is called on it; other objects
 * are passed through.
 */
function getValue(object) {
  if (object instanceof Reference) {
    return object.getValue();
  } else {
    return object;
  }
}

/**
 * Set the value of Boxed instance.  Equivalent to Boxed.setValue(); added for symmetry
 * with getValue() function.
 */
function setValue(object, value) {
  if (!(object instanceof Boxed)) {
    return panic("Can't call setValue on a non-Boxed reference.");
  }

  return object.setValue(value);
}

/**
 * Register a callback with a given lifespan that gets invoked
 * when the reference state changes.  If the object argument is not a Reference,
 * this is a no-op.
 *
 * Similar to getValue(), this allows mixing References and objects.
 * Calling observe() on a non-Reference is harmless.
 */
function observe(object, lifespan, callback) {
  LifespanType.check(lifespan);

  if (object instanceof Reference) {
    object.observe(lifespan, callback);
  }
}

/**
 * In case lifespan is null, defaultLifespan() returns the default lifespan for
 * the given execution context.  Current implementation is trivial: just return
 * top-level ForeverLifespan instance.
 */
function defaultLifespan(lifespan) {
  if (lifespan) {
    return lifespan;
  } else {
    return ForeverLifespan.instance;
  }
}

/**
 * Called when a fatal error is encountered.
 * Notifies the programmer by logging the message and showing an alert.
 * An exception is thrown to record the stack trace in developer console.
 */
function panic(message) {
  console.log(message);
  alert("Fatal error: " + message);
  throw message;
}

/**
 * A Zone encapsulates execution context--for example, identifying an event loop.
 * It is possible to schedule observers or actions in a given zone.
 *
 * Observer execution can be 'collapsed' by the implementation:
 * if two or more instances of the same observer are scheduled,
 * they may be invoked only once.
 * Scheduled actions are executed only after all pending observers are processed.
 */
class Zone {
  /**
   * Create a Zone instance that processes observer and action queues
   * on the main event loop.
   */
  constructor() {
    this.observerQueue = new Array();
    this.observerSet = new Set();
    this.actionQueue = new Array();
    this.processingScheduled = false;
    this.suppressedObserver = null;
  }

  /**
   * Schedules observer for execution.
   * If the observer already scheduled on the queue, this is a no-op.
   */
  scheduleObserver(observer) {
    FunctionType.check(observer);

    // Collapse observer invokations
    if (this.observerSet.has(observer) || observer == this.suppressedObserver) {
      return;
    }

    this.observerQueue.push(observer);
    this.observerSet.add(observer);
    this.scheduleProcessing();
  }

  /**
   * Schedules action for execution.
   */
  scheduleAction(action) {
    FunctionType.check(action);

    this.actionQueue.push(action);
    this.scheduleProcessing();
  }

  /**
   * Schedules action for execution after a specified delay.
   */
  scheduleDelayedAction(action, delayMilliseconds) {
    FunctionType.check(action);

    setTimeout(() => this.scheduleAction(action), delayMilliseconds);
  }

  /**
   * For internal use only: observer suppression is used by the synchronization logic.
   */
  internalSuppressObserver(observer) {
    if (this.suppressedObserver != null) {
      panic("Only one observer can be suppressed at a time");
    }
    this.suppressedObserver = observer;
  }

  /**
   * For internal use only: observer suppression is used by the synchronization logic.
   */
  internalUnsuppressObserver(observer) {
    if (this.suppressedObserver != observer) {
      panic("Wrong observer in internalUnsuppressObserver");
    }
    this.suppressedObserver = null;
  }

  /**
   * For internal use only: schedule queue processing if it's not already in progress.
   */
  scheduleProcessing() {
    if (!this.processingScheduled) {
      // Execute on the main event loop
      setTimeout(() => this.processQueues());
      this.processingScheduled = true;
    }
  }

  /**
   * For internal use only: process observer and action queues.
   * If the observer queue is not empty, it is always processed
   * before the action queue.
   */
  processQueues() {
    while(this.observerQueue.length > 0 || this.actionQueue.length > 0) {
      // Process observers first
      while(this.observerQueue.length > 0) {
        const observer = this.observerQueue.shift();
        observer();
        this.observerSet.delete(observer);
      }

      // Process actions if done with observers
      while(this.observerQueue.length == 0 && this.actionQueue.length > 0) {
        const action = this.actionQueue.shift();
        action();
      }
    }

    this.processingScheduled = false;
  }
}

/**
 * A top-level Lifespan which is never finished, and therefore ignores onFinish() calls.
 * All other Lifespans are created through a hierarchy of subspans,
 * with ForeverLifespan at the top level.
 */
class ForeverLifespan extends Lifespan {
  /**
   * Create the singleton ForeverLifespan object.
   */
  constructor() {
    super(new Zone());
  }

  /**
   * Register a callback with this subspan--a no-op.
   */
  onFinish(callback) { }


  /**
   * Attempt to release all resources associated with this Lifespan--a fatal error.
   */
  finish() {
    panic("Called ForeverLifespan.finish()");
  }

  /**
   * The singleton ForeverLifespan object.
   */
  static instance = new ForeverLifespan();
}

/**
 * A wrapper around ConstantReference constructor.
 * Create an instance of Reference that never changes.
 */
function makeConstantReference(initialValue, type) {
  return new ConstantReference(initialValue, type);
}

/**
 * A wrapper around Boxed constructor.
 * Create an instance of Reference that supports both writes and reads.
 */
function makeBoxed(initialValue, type) {
  return new Boxed(initialValue, type);
}

/**
 * A wrapper around ComputableReference constructor.
 * Create an instance of Reference that lazily computes its value.
 */
function makeComputableReference(computeFunction, type) {
  return new ComputableReference(computeFunction, type);
}

/**
 * A reactive boolean NOT.
 * Given a boolean Reference as an argument, returns a Reference with a value
 * that negates the argument.
 * Strictly speaking the argument can be a value and not a Reference,
 * in which case the ! operator can be used directly.
 */
function notOp(expression, lifespan) {
  const result = makeComputableReference(() => !getValue(expression), BooleanType);

  result.observeAndDependsOn(expression, defaultLifespan(lifespan));

  return result;
}

/**
 * A reactive boolean AND.
 * Given two boolean References or values as arguments, returns a Reference with a boolean value
 * that is true iff both arguments are true.
 * While both arguments can be values and not References,
 * in this case the && operator can be used directly.
 */
function andOp(first, second, lifespan) {
  const result = makeComputableReference(() => getValue(first) && getValue(second), BooleanType);

  lifespan = defaultLifespan(lifespan);

  result.observeAndDependsOn(first, lifespan);
  result.observeAndDependsOn(second, lifespan);

  return result;
}

/**
 * A reactive conditional expression.
 * The 3 primary arguments are: condition expression, then expression, else expression.
 * All of them can be either References or values (although condition expression
 * should be a Reference, otherwise the evaluation is trivival.)
 * The return value of the function is a Reference that evaluates to
 * the result of then expression or else expression, based on the result
 * of condition expression.
 */
function conditional(condExpression, thenExpression, elseExpression, lifespan, name) {
  lifespan = defaultLifespan(lifespan);
  var subSpan = null;

  const result = makeComputableReference(function() {
    if (subSpan != null) {
      subSpan.finish();
    }
    subSpan = lifespan.makeSubSpan();

    const condValue = getValue(condExpression);
    var resultValue;

    if (condValue) {
      resultValue = getValue(thenExpression);
      observe(thenExpression, subSpan, result.recompute);
    } else {
      resultValue = getValue(elseExpression);
      observe(elseExpression, subSpan, result.recompute);
    }

    return resultValue;
  }, ObjectType);

  if (name) {
    result.setName(name);
  }

  result.observeAndDependsOn(condExpression, lifespan);
  result.dependsOn(thenExpression, lifespan);
  result.dependsOn(elseExpression, lifespan);

  return result;
}

/**
 * A reactive String join.  Takes References or values as arguments.
 *
 * Converts all argument values to Strings using toString(), concatenates them,
 * and returns a Reference to the result.  If an argument References change state,
 * result Reference is updated.
 */
function stringJoin() {
  const joinList = [...arguments];

  function doJoin() {
    var s = "";
    for (var i = 0; i < joinList.length; ++i) {
      s += getValue(joinList[i]).toString();
    }
    return s;
  }

  const result = makeComputableReference(doJoin, StringType);

  const lifespan = defaultLifespan(null);  // TODO: handle lifespan
  for (var i = 0; i < joinList.length; ++i) {
    result.observeAndDependsOn(joinList[i], lifespan);
  }

  return result;
}
