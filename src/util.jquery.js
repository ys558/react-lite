import $ from 'jquery'

import { WILL_UNMOUNT } from './constant'

//types.js
export let isType = type => obj => obj != null && Object.prototype.toString.call(obj) === `[object ${ type }]`
export let isObj = isType('Object')
export let isStr = isType('String')
export let isNum = isType('Number')
export let isFn = isType('Function')
export let isBln = isType('Boolean')
export let isArr = Array.isArray || isType('Array')
export let isComponent = obj => isFn(obj)
export let isComponentClass = obj => isFn(obj) && isFn(obj.prototype.render)
export let isUndefined = obj => obj === void 0
export let pipe = (fn1, fn2) => function(...args) {
	fn1.apply(this, args)
	return fn2.apply(this, args)
}

let arrayPrototype = Array.prototype
let objectPrototype = Object.prototype

if (!arrayPrototype.forEach) {
	arrayPrototype.forEach = function(callback) {
		$.each(this, (i, value) => callback(value, i, this))
	}
}

if (!Object.create) {
	Object.create = proto => {
		let Fn = function() {}
		Fn.prototype = proto
		return new Fn()
	}
}

if (!Object.keys) {
	Object.keys = obj => {
		let keys = []
		$.each(obj, key => keys.push(key))
		return keys
	}
}

if (!Function.prototype.bind) {
	Function.prototype.bind = function(context, ...initArgs) {
		return (...args) => this.apply(context, initArgs.concat(args))
	}
}



export let toArray = Array.from || (obj => {
	let list = []
	for (let i = 0, len = obj.length; i < len; i++) {
		list.push(obj[i])
	}
	return list
})
export let nextFrame = isFn(window.requestAnimationFrame)
	? fn => requestAnimationFrame(fn)
	: fn => setTimeout(fn, 100 / 6)

export let getUid = () => Math.random().toString(36).substr(2)

export let mergeProps = (props, children) => {
	if (props && children && children.length > 0) {
		props.children = children.length === 1 ? children[0] : children 
	}
	return props
}

export let mapChildren = (children, callback, record = { index: 0, store: [] }) => {
	let { store } = record
	children.forEach(child => {
		if (isArr(child)) {
			mapChildren(child, callback, record)
		} else if (!isBln(child)) {
			store.push(child)
			callback(child, record.index)
			record.index += 1
		}
	})
	return store
}

export let hasKey = obj => obj && obj.props && obj.props.key

let $events = {}

export let $on = (name, callback) => {
	let events = $events[name] = $events[name] || []
	events.push(callback)
}

// export let $off = (name, callback) => {
// 	if (!isFn(callback)) {
// 		$events[name] = []
// 		return
// 	}
// 	let index = $events[name].indexOf(callback)
// 	if (index !== -1) {
// 		$events[name].splice(index, 1)
// 	}
// }

export let $trigger = (name, ...args) => {
	if (isArr($events[name])) {
		$events[name].forEach(callback => callback(...args))
	}
}

export let $triggerOnce = (name, ...args) => {
	let events = $events[name]
	$events[name] = []
	if (isArr(events)) {
		events.forEach(callback => callback(...args))
	}
}


let componentId
let $componentId
export let setComponentId = id => {
	$componentId = componentId
	componentId = id
}
export let resetComponentId = () => {
	componentId = $componentId
}

let refsStore = {}
let getDOMNode = function() { return this }
export let getRefs = id => {
	let refs = refsStore[id] || {}
	delete refsStore[id]
	return refs
}
export let collectRef = (key, value) => {
	if (!componentId) {
		return
	}
	let refs = refsStore[componentId]
	if (!refs) {
		refs = refsStore[componentId] = {}
	}
	if (value.nodeName) {
		value.getDOMNode = getDOMNode
	}
	refs[key] = value
}

export let setAttr = (elem, key, value) => {
	$.fn.attr.call([elem], key, value)
}

export let getAttr = (elem, key) => {
	return $.fn.attr.call([elem], key)
}

export let removeAttr = (elem, key) => {
	$.fn.removeAttr.call([elem], key)
}

export let querySelectorAll = (elem, selector) => {
	return $(selector, elem)
}

export let appendChild = (node, child) => {
	node.appendChild(child)
}

export let removeChild = (node, child) => {
	$trigger(WILL_UNMOUNT, child)
	node.removeChild(child)
}

export let replaceChild = (node, newChild, child) => {
	$trigger(WILL_UNMOUNT, child)
	node.replaceChild(newChild, child)
}

export let setProp = (elem, key, value) => {
	if (key === 'key' || key === 'ref') {
		if (key === 'ref' && value) {
			collectRef(value, elem)
		}
		return
	}
	switch (true) {
		case key === 'style':
			setStyle(elem, value)
			break
		case isEventKey(key):
			setEvent(elem, key, value)
			break
		case key in elem:
			elem[key] = value
			break
		default:
			elem.setAttribute(key, value)
	}
}

export let setProps = (elem, props) => {
	Object.keys(props).forEach(key => 
		setProp(elem, key, props[key])
	)
}

export let isEventKey = key => /^on/.test(key)

export let removeProp = (elem, key) => {
	let oldValue = elem[key]
	switch (true) {
		case isEventKey(key):
			removeEvent(elem, key)
			break
		case isFn(oldValue):
			elem[key] = null
			break
		case isStr(oldValue):
			elem[key] = ''
			break
		case isBln(oldValue):
			elem[key] = false
			break
		default:
			try {
				elem[key] = null
			} catch(e) {
				//pass
			}
	}
}

export let setEvent = (elem, key, value) => {
	key = key.toLowerCase()
	let $elem = $(elem)
	$elem.off(`${key.substr(2)}.react`)
	$elem.on(`${key.substr(2)}.react`, value)
	if (key === 'onchange') {
		$elem.off('propertychange.react')
		$elem.on('propertychange.react', e => {
			if (e.propertyName === 'value') {
				value.call(elem, e)
			}
		})
	}
}

export let removeEvent = (elem, key) => {
	key = key.toLowerCase()
	let $elem = $(elem)
	$elem.off(`${key.substr(2)}.react`)
	if (key === 'onchange') {
		$elem.off('propertychange.react')
	}
}


export let removeStyle = (elem, style) => {
	if (!isObj(style)) {
		return
	}
	Object.keys(style).forEach(key => elem.style[key] = '')
}

export let setStyle = (elem, style) => {
	if (!isObj(style)) {
		return
	}
	Object.keys(style).forEach(key => {
		setStyleValue(elem.style, key, style[key])
	})
}

const isUnitlessNumber = {
	animationIterationCount: true,
	boxFlex: true,
	boxFlexGroup: true,
	boxOrdinalGroup: true,
	columnCount: true,
	flex: true,
	flexGrow: true,
	flexPositive: true,
	flexShrink: true,
	flexNegative: true,
	flexOrder: true,
	fontWeight: true,
	lineClamp: true,
	lineHeight: true,
	opacity: true,
	order: true,
	orphans: true,
	tabSize: true,
	widows: true,
	zIndex: true,
	zoom: true,

	// SVG-related properties
	fillOpacity: true,
	stopOpacity: true,
	strokeDashoffset: true,
	strokeOpacity: true,
	strokeWidth: true
}

/**
 * @param {string} prefix vendor-specific prefix, eg: Webkit
 * @param {string} key style name, eg: transitionDuration
 * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
 * WebkitTransitionDuration
 */
let prefixKey = (prefix, key) => prefix + key.charAt(0).toUpperCase() + key.substring(1)

/**
 * Support style names that may come passed in prefixed by adding permutations
 * of vendor prefixes.
 */
let prefixes = ['Webkit', 'ms', 'Moz', 'O'];

// Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
// infinite loop, because it iterates over the newly added props too.
Object.keys(isUnitlessNumber).forEach(prop => prefixes.forEach(prefix => 
	isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop]
))

let RE_NUMBER = /^-?\d+(\.\d+)?$/
export let setStyleValue = (style, key, value) => {
	if (RE_NUMBER.test(value) && !isUnitlessNumber[key]) {
		style[key] = value + 'px'
	} else {
		style[key] = value
	}
}