/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const viewsNamespace = new Namespace("views");

const ViewType = addNamespaceType(viewsNamespace, "view", (value) => value instanceof View);

class View {
  render(lifespan) {
    panic("All Views must implement render().");
  }
}

class VisibleView extends View {
  constructor(view, isVisible) {
    super();
    this.view = view;
    this.isVisible = isVisible;
  }

  render(lifespan) {
    const visibleView = this;
    var subSpan = null;

    const renderedView = makeComputableReference(function() {
      if (subSpan != null) {
        subSpan.finish();
      }

      if (getValue(visibleView.isVisible)) {
        subSpan = lifespan.makeSubSpan();
        const rendered = visibleView.view.render(lifespan);
        observe(rendered, subSpan, renderedView.recompute);
        return getValue(rendered);
      } else {
        return new DocumentFragment();
      }
    }, ObjectType);

    observe(visibleView.isVisible, lifespan, renderedView.recompute);

    return renderedView;
  }
}

function updateStyle(element, style) {
  const styleValue = getValue(style);
  if (styleValue) {
    StyleType.check(styleValue);
    element.setAttribute("class", styleValue.cssClassName);
  } else {
    element.removeAttribute("class");
  }
}

class TextView extends View {
  constructor(text, style) {
    super();
    this.text = text;
    this.style = style;
  }

  render(lifespan) {

    const textState = this;

    const renderedText = makeComputableReference(function() {
      const textValue = getValue(textState.text);
      const styleValue = getValue(textState.style);

      if (styleValue) {
        const textElement = document.createElement("span");
        StyleType.check(styleValue);
        textElement.setAttribute("class", styleValue.cssClassName);
        textElement.textContent = textValue;
        return textElement;
      } else {
        return document.createTextNode(textValue);
      }
    }, ObjectType);


    observe(this.style, lifespan, renderedText.recompute);
    observe(this.text, lifespan, renderedText.recompute);

    return renderedText;
  }

  toString() {
    if (StringType.isInstance(this.text)) {
      return "TextView/" + this.text;
    } else {
      return "TextView";
    }
  }
}

class DivView extends View {
  constructor(content, style) {
    super();
    this.content = content;
    this.style = style;
  }

  render(lifespan) {
    const contentState = this;
    var subSpan = null;

    const contentElement = document.createElement("div");

    function updateState() {
      if (subSpan != null) {
        subSpan.finish();
      }
      subSpan = lifespan.makeSubSpan();

      const rendered = getValue(contentState.content).render(lifespan);
      contentElement.replaceChildren(getValue(rendered));
      updateStyle(contentElement, contentState.style);
      observe(rendered, subSpan, updateState);
    }

    updateState();
    observe(this.style, lifespan, updateState);
    observe(this.content, lifespan, updateState);

    return contentElement;
  }
}

class ButtonView extends View {
  constructor(text, action, style) {
    super();
    this.text = text;
    this.action = action;
    this.style = style;
  }

  render(lifespan) {
    const buttonState = this;
    const buttonZone = lifespan.zone;

    const buttonElement = document.createElement("button");

    function updateState() {
      buttonElement.textContent = getValue(buttonState.text);
      buttonElement.onclick = () => buttonZone.scheduleAction(getValue(buttonState.action));
      updateStyle(buttonElement, buttonState.style);
    }

    updateState();
    observe(this.text, lifespan, updateState);
    observe(this.action, lifespan, updateState);
    observe(this.style, lifespan, updateState);

    return buttonElement;
  }
}

class LinkView extends View {
  constructor(text, action, style) {
    super();
    this.text = text;
    this.action = action;
    this.style = style;
  }

  render(lifespan) {
    const linkState = this;
    const linkZone = lifespan.zone;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", "#");

    function updateState() {
      linkElement.textContent = getValue(linkState.text);
      linkElement.onclick = function() {
        linkZone.scheduleAction(getValue(linkState.action));
        return false;
      }
      updateStyle(linkElement, linkState.style);
    }

    updateState();
    observe(this.text, lifespan, updateState);
    observe(this.action, lifespan, updateState);
    observe(this.style, lifespan, updateState);

    return linkElement;
  }
}

class ContainerView extends View {
  constructor(views) {
    super();
    this.views = views;
  }

  render(lifespan) {
    const containerState = this;
    var subSpan = null;

    const renderedContainer = makeComputableReference(function() {
      if (subSpan != null) {
        subSpan.finish();
      }
      subSpan = lifespan.makeSubSpan();

      const result = new DocumentFragment();
      for (const view of containerState.views) {
        const viewValue = getValue(view);
        if (viewValue) {
          ViewType.check(viewValue);
          const rendered = viewValue.render(subSpan);
          result.appendChild(getValue(rendered));
          observe(view, subSpan, renderedContainer.recompute);
          observe(rendered, subSpan, renderedContainer.recompute);
        }
      }
      return result;
    }, ObjectType);

    observe(this.views, lifespan, renderedContainer.recompute);

    return renderedContainer;
  }
}

class ListView extends View {
  constructor(list, makeView, emptyView) {
    super();
    this.list = list;
    this.makeView = makeView;
    this.emptyView = emptyView;
  }

  render(lifespan) {
    const listViewState = this;
    var subSpan = null;

    const renderedList = makeComputableReference(function() {
      if (subSpan != null) {
        subSpan.finish();
      }
      subSpan = lifespan.makeSubSpan();

      const listState = getValue(listViewState.list);

      if (listState == null) {
        return new DocumentFragment();
      }

      if (listState.length == 0) {
        return getValue(listViewState.emptyView.render(lifespan));
      }

      const result = new DocumentFragment();
      for (const element of listState) {
        const rendered = listViewState.makeView(element).render(subSpan);
        result.appendChild(getValue(rendered));
        observe(rendered, subSpan, renderedList.recompute);
      }

      return result;
    }, ObjectType);


    observe(this.list, lifespan, renderedList.recompute);
    observe(this.makeView, lifespan, renderedList.recompute);
    observe(this.emptyView, lifespan, renderedList.recompute);

    return renderedList;
  }
}

function makeVisibleView(view, isVisible) {
  return new VisibleView(view, isVisible);
}

function makeTextView(text, style) {
  return new TextView(text, style);
}

function makeDivView(content, style) {
  return new DivView(content, style);
}

function makeButtonView(text, action, style) {
  return new ButtonView(text, action, style);
}

function makeLinkView(text, action, style) {
  return new LinkView(text, action, style);
}

function makeContainerView() {
  if (arguments.length == 0) {
    panic("makeContainerView()'s argument list cannot be empty.");
  } else if (arguments.length == 1) {
    ListType.check(arguments[0]);
    return new ContainerView(arguments[0]);
  } else {
    return new ContainerView([...arguments]);
  }
}

function makeListView(list, makeView, emptyView) {
  return new ListView(list, makeView, emptyView);
}

function addViewMaker(name, implementation) {
  viewsNamespace.addMember(new Method(viewsNamespace, name, ViewType, implementation));
}

addViewMaker("makeVisibleView", makeVisibleView);
addViewMaker("makeTextView", makeTextView);
addViewMaker("makeDivView", makeDivView);
addViewMaker("makeButtonView", makeButtonView);
addViewMaker("makeLinkView", makeLinkView);
addViewMaker("makeContainerView", makeContainerView);
addViewMaker("makeListView", makeListView);

function makeStatusView(datastore, viewSource) {
  return makeDivView(conditional(datastore.isInitialized,
      makeContainerView(
          viewSource,
          conditional(datastore.isOnline,
              makeTextView("Online", Styles.GreenStatus),
              makeTextView("Offline", Styles.YellowStatus))),
      makeTextView("Initializing", Styles.BlueStatus)), Styles.StatusBlock);
}

function setRootView(view, lifespan) {
  const body = document.getElementsByTagName("body")[0];
  lifespan = defaultLifespan(lifespan);

  const bodyFragmentOrRef = view.render(lifespan);
  var divElement = document.createElement("div");
  divElement.appendChild(getValue(bodyFragmentOrRef));
  body.prepend(divElement);

  observe(bodyFragmentOrRef, lifespan, function() {
    const newDivElement = document.createElement("div");
    newDivElement.appendChild(getValue(bodyFragmentOrRef));
    body.replaceChild(newDivElement, divElement);
    divElement = newDivElement;
  });
}