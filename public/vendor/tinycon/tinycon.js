/*!
 * Tinycon - A small library for manipulating the Favicon
 * Tom Moor, http://tommoor.com
 * Copyright (c) 2012 Tom Moor
 * MIT Licensed
 * @version 0.6.1
 */

(function(){

	var Tinycon = {};
	var currentFavicon = null;
	var originalFavicon = null;
	var originalTitle = document.title;
	var faviconImage = null;
	var canvas = null;
	var options = {};
	var r = window.devicePixelRatio || 1;
	var size = 16 * r;
	var defaults = {
		width: 7,
		height: 9,
		font: 9 * r + 'px arial',
		colour: '#ffffff',
		background: '#F03D25',
		fallback: true,
		crossOrigin: true,
		abbreviate: true
	};

	var ua = (function () {
		var agent = navigator.userAgent.toLowerCase();
		// New function has access to 'agent' via closure
		return function (browser) {
			return agent.indexOf(browser) !== -1;
		};
	}());

	var browser = {
		ie: ua('msie'),
		chrome: ua('chrome'),
		webkit: ua('chrome') || ua('safari'),
		safari: ua('safari') && !ua('chrome'),
		mozilla: ua('mozilla') && !ua('chrome') && !ua('safari')
	};

	// private methods
	var getFaviconTag = function(){

		var links = document.getElementsByTagName('link');

		for(var i=0, len=links.length; i < len; i++) {
			if ((links[i].getAttribute('rel') || '').match(/\bicon\b/)) {
				return links[i];
			}
		}

		return false;
	};

	var removeFaviconTag = function(){

		var links = document.getElementsByTagName('link');
		var head = document.getElementsByTagName('head')[0];

		for(var i=0, len=links.length; i < len; i++) {
			var exists = (typeof(links[i]) !== 'undefined');
			if (exists && (links[i].getAttribute('rel') || '').match(/\bicon\b/)) {
				head.removeChild(links[i]);
			}
		}
	};

	var getCurrentFavicon = function(){

		if (!originalFavicon || !currentFavicon) {
			var tag = getFaviconTag();
			originalFavicon = currentFavicon = tag ? tag.getAttribute('href') : '/favicon.ico';
		}

		return currentFavicon;
	};

	var getCanvas = function (){

		if (!canvas) {
			canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
		}

		return canvas;
	};

	var setFaviconTag = function(url){
		removeFaviconTag();

		var link = document.createElement('link');
		link.type = 'image/x-icon';
		link.rel = 'icon';
		link.href = url;
		document.getElementsByTagName('head')[0].appendChild(link);
	};

	var log = function(message){
		if (window.console) window.console.log(message);
	};

	var drawFavicon = function(label, colour) {

		// fallback to updating the browser title if unsupported
		if (!getCanvas().getContext || browser.ie || browser.safari || options.fallback === 'force') {
			return updateTitle(label);
		}

		var context = getCanvas().getContext("2d");
		var colour = colour || '#000000';
		var src = getCurrentFavicon();

		faviconImage = document.createElement('img');
		faviconImage.onload = function() {

			// clear canvas
			context.clearRect(0, 0, size, size);

			// draw the favicon
			context.drawImage(faviconImage, 0, 0, faviconImage.width, faviconImage.height, 0, 0, size, size);

			// draw bubble over the top
			if ((label + '').length > 0) drawBubble(context, label, colour);

			// refresh tag in page
			refreshFavicon();
		};

		// allow cross origin resource requests if the image is not a data:uri
		// as detailed here: https://github.com/mrdoob/three.js/issues/1305
		if (!src.match(/^data/) && options.crossOrigin) {
			faviconImage.crossOrigin = 'anonymous';
		}

		faviconImage.src = src;
	};

	var updateTitle = function(label) {

		if (options.fallback) {
			if ((label + '').length > 0) {
				document.title = '(' + label + ') ' + originalTitle;
			} else {
				document.title = originalTitle;
			}
		}
	};

	var drawBubble = function(context, label, colour) {

		// automatic abbreviation for long (>2 digits) numbers
		if (typeof label == 'number' && label > 99 && options.abbreviate) {
			label = abbreviateNumber(label);
		}

		// bubble needs to be larger for double digits
		var len = (label + '').length-1;

		var width = options.width * r + (6 * r * len),
			height = options.height * r;

		var top = size - height,
            left = size - width - r,
            bottom = 16 * r,
            right = 16 * r,
            radius = 2 * r;

		// webkit seems to render fonts lighter than firefox
		context.font = (browser.webkit ? 'bold ' : '') + options.font;
		context.fillStyle = options.background;
		context.strokeStyle = options.background;
		context.lineWidth = r;

		// bubble
		context.beginPath();
        context.moveTo(left + radius, top);
		context.quadraticCurveTo(left, top, left, top + radius);
		context.lineTo(left, bottom - radius);
        context.quadraticCurveTo(left, bottom, left + radius, bottom);
        context.lineTo(right - radius, bottom);
        context.quadraticCurveTo(right, bottom, right, bottom - radius);
        context.lineTo(right, top + radius);
        context.quadraticCurveTo(right, top, right - radius, top);
        context.closePath();
        context.fill();

		// bottom shadow
		context.beginPath();
		context.strokeStyle = "rgba(0,0,0,0.3)";
		context.moveTo(left + radius / 2.0, bottom);
		context.lineTo(right - radius / 2.0, bottom);
		context.stroke();

		// label
		context.fillStyle = options.colour;
		context.textAlign = "right";
		context.textBaseline = "top";

		// unfortunately webkit/mozilla are a pixel different in text positioning
		context.fillText(label, r === 2 ? 29 : 15, browser.mozilla ? 7*r : 6*r);
	};

	var refreshFavicon = function(){
		// check support
		if (!getCanvas().getContext) return;

		setFaviconTag(getCanvas().toDataURL());
	};

	var abbreviateNumber = function(label) {
		var metricPrefixes = [
			['G', 1000000000],
			['M',    1000000],
			['k',       1000]
		];

		for(var i = 0; i < metricPrefixes.length; ++i) {
			if (label >= metricPrefixes[i][1]) {
				label = round(label / metricPrefixes[i][1]) + metricPrefixes[i][0];
				break;
			}
		}

		return label;
	};

	var round = function (value, precision) {
		var number = new Number(value);
		return number.toFixed(precision);
	};

	// public methods
	Tinycon.setOptions = function(custom){
		options = {};

		for(var key in defaults){
			options[key] = custom.hasOwnProperty(key) ? custom[key] : defaults[key];
		}
		return this;
	};

	Tinycon.setImage = function(url){
		currentFavicon = url;
		refreshFavicon();
		return this;
	};

	Tinycon.setBubble = function(label, colour) {
		label = label || '';
		drawFavicon(label, colour);
		return this;
	};

	Tinycon.reset = function(){
		setFaviconTag(originalFavicon);
	};

	Tinycon.setOptions(defaults);
	window.Tinycon = Tinycon;
})();