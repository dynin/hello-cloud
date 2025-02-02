/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const counterData = makeDatastore("counter", {
  state: makeBoxed(68, IntegerType),
  increment: makeConstantReference(
      () => { setValue(counterData.state, getValue(counterData.state) + 1); }, FunctionType),
  reset: makeConstantReference(
      () => { setValue(counterData.state, 0); }, FunctionType)
});
