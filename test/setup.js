var assert = require('node:assert/strict');
var nodeTest = require('node:test');
var JSDOM = require('jsdom').JSDOM;

var dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true
});

global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.window = global;
global.self = global;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.Image = dom.window.Image;
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.describe = nodeTest.describe;
global.it = nodeTest.it;
global.before = nodeTest.before;
global.after = nodeTest.after;
global.beforeEach = nodeTest.beforeEach;
global.afterEach = nodeTest.afterEach;

function noop() {}

function createCanvasContext() {
  return {
    canvas: null,
    fillStyle: '#000',
    strokeStyle: '#000',
    shadowColor: '#000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineCap: 'butt',
    lineDashOffset: 0,
    lineJoin: 'miter',
    lineWidth: 1,
    miterLimit: 10,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    save: noop,
    restore: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    drawImage: noop,
    fillText: noop,
    strokeText: noop,
    setLineDash: noop,
    createLinearGradient: function() {
      return { addColorStop: noop };
    },
    createPattern: function() {
      return {};
    },
    createRadialGradient: function() {
      return { addColorStop: noop };
    },
    getImageData: function() {
      return { data: [] };
    },
    putImageData: noop,
    measureText: function(text) {
      return { width: String(text).length * 10 };
    }
  };
}

Object.defineProperty(global.HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: function() {
    if (!this._context2d) {
      this._context2d = createCanvasContext();
      this._context2d.canvas = this;
    }
    return this._context2d;
  }
});

function sameMembers(actual, expected) {
  assert.strictEqual(actual.length, expected.length);
  expected.forEach(function(item) {
    assert.notStrictEqual(actual.indexOf(item), -1);
  });
}

global.expect = function(actual) {
  var state = { deep: false };
  var chain = {};

  function eq(expected) {
    if (state.deep) {
      assert.deepStrictEqual(actual, expected);
    } else {
      assert.strictEqual(actual, expected);
    }
    return chain;
  }

  function eql(expected) {
    assert.deepStrictEqual(actual, expected);
    return chain;
  }

  function closeTo(expected, delta) {
    assert.ok(Math.abs(actual - expected) <= delta);
    return chain;
  }

  Object.defineProperty(chain, 'to', {
    get: function() {
      return chain;
    }
  });

  Object.defineProperty(chain, 'be', {
    get: function() {
      return chain;
    }
  });

  Object.defineProperty(chain, 'have', {
    get: function() {
      return chain;
    }
  });

  Object.defineProperty(chain, 'deep', {
    get: function() {
      state.deep = true;
      return chain;
    }
  });

  Object.defineProperty(chain, 'empty', {
    get: function() {
      if (Array.isArray(actual) || typeof actual === 'string') {
        assert.strictEqual(actual.length, 0);
      } else {
        assert.strictEqual(Object.keys(actual).length, 0);
      }
      return chain;
    }
  });

  Object.defineProperty(chain, 'true', {
    get: function() {
      assert.strictEqual(actual, true);
      return chain;
    }
  });

  chain.eq = eq;
  chain.eql = eql;
  chain.members = function(expected) {
    sameMembers(actual, expected);
    return chain;
  };
  chain.closeTo = closeTo;

  return chain;
};
