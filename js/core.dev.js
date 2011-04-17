// http://ejohn.org/blog/simple-javascript-inheritance/
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  this.Class = function(){};

  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
	var _super = this.prototype;

	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = true;
	var prototype = new this();
	initializing = false;

	// Copy the properties over onto the new prototype
	for (var name in prop) {
	  // Check if we're overwriting an existing function
	  prototype[name] = ( typeof prop[name] == "function" &&
	    typeof _super[name] == "function" && fnTest.test(prop[name]) ) ?
	    (function(name, fn){
	      return function() {
	        var tmp = this._super;

	        // Add a new ._super() method that is the same method
	        // but on the super-class
	        this._super = _super[name];

	        // The method only need to be bound temporarily, so we
	        // remove it when we're done executing
	        var ret = fn.apply(this, arguments);
	        this._super = tmp;

	        return ret;
	      };
	    })(name, prop[name]) :
	    prop[name];
	}

	// The dummy class constructor
	function Class() {
	  // All construction is actually done in the init method
	  if ( !initializing && this.init )
	    this.init.apply(this, arguments);
	}

	// Populate our constructed prototype object
	Class.prototype = prototype;

	// Enforce the constructor to be what we expect
	Class.constructor = Class;

	// And make this class extendable
	Class.extend = arguments.callee;

	return Class;
  };
})();


//_____Custom code starts here_____


FrontEndEditor.fieldTypes = {};

FrontEndEditor.overlay = function($el) {

	var $cover = jQuery('<div>', {'class': 'fee-loading'})
		.css('background-image', 'url(' + FrontEndEditor.data.spinner + ')')
		.hide()
		.prependTo(jQuery('body'));

	return {
		show: function() {
			$cover
				.css({
					width: $el.width(),
					height: $el.height()
				})
				.css($el.offset())
				.show();
		},

		hide: function() {
			$cover.hide();
		}
	};
};

// Do an ajax request, while loading a required script
FrontEndEditor.sync_load = (function(){
	var cache = [];

	return function(callback, data, src) {
		var count = 0, content;

		function proceed() {
			count++;
			if ( 2 === count )
				callback(content);
		}

		if ( !src || cache[src] ) {
			proceed();
		} else {
			cache[src] = jQuery('<script>').attr({
				type: 'text/javascript',
				src: src,
				load: proceed
			}).prependTo('head');
		}

		jQuery.post(FrontEndEditor.data.ajax_url, data, function(data) {
			content = data;
			proceed();
		}, 'json');
	};
}());

jQuery(document).ready(function($) {

	// fetch all 'data-' attributes from a DOM node
	function extract_data_attr(el) {
		var i, data = {};

		for (i = 0; i < el.attributes.length; i++) {
			var attr = el.attributes.item(i);

			if ( attr.specified && 0 === attr.name.indexOf('data-') ) {
				var value = attr.value;

				try {
					value = jQuery.parseJSON(value);
				} catch(e) {}

				if ( null === value )
					value = '';

				data[ attr.name.substr(5) ] = value;
			}
		}

		return data;
	}


	// Create field instances
	var OVERLAY_BORDER = 2,
		overlays = {},
		overlay_box = jQuery('<div>Edit</div>').addClass('fee-overlay-edit').hide().appendTo('body'),
		overlay_lock = false,
		overlay_timeout;

	overlay_box
		.mouseover(function () { overlay_lock = true; })
		.mouseout(function () { overlay_lock = false; });

	jQuery.each(['top', 'right', 'bottom', 'left'], function(i, key) {
		overlays[key] = jQuery('<div>').addClass('fee-overlay-' + key).hide().appendTo('body');
	});

	jQuery.each(FrontEndEditor.data.fields, function (i, filter) {
		jQuery('.fee-filter-' + filter)
		.mouseover(function () {
			var $self = jQuery(this),
				offset = $self.offset(),
				dims = {
					width: $self.outerWidth(),
					height: $self.outerHeight()
				};

			clearTimeout(overlay_timeout);

			// Add 'Edit' box
			overlay_box.css({
				'top': (offset.top - OVERLAY_BORDER) + 'px',
				'left': (offset.left - overlay_box.outerWidth()) + 'px'
			}).show();

			// Add overlay as individual divs
			overlays.top.css({
				'width': (dims.width + OVERLAY_BORDER * 2) + 'px',
				'top': (offset.top - OVERLAY_BORDER) + 'px',
				'left': (offset.left - OVERLAY_BORDER) + 'px'
			}).show();

			overlays.bottom.css({
				'width': (dims.width + OVERLAY_BORDER * 2) + 'px',
				'top': (offset.top + dims.height) + 'px',
				'left': (offset.left - OVERLAY_BORDER) + 'px'
			}).show();

			overlays.left.css({
				'height': dims.height + 'px',
				'top': offset.top + 'px',
				'left': (offset.left - OVERLAY_BORDER) + 'px'
			}).show();

			overlays.right.css({
				'height': dims.height + 'px',
				'top': offset.top + 'px',
				'left': (offset.left + dims.width) + 'px'
			}).show();
		})
		.mouseout(function () {
			overlay_timeout = setTimeout(function () {
				if ( overlay_lock )
					return;

				overlay_box.hide();

				overlays.top.hide();
				overlays.right.hide();
				overlays.bottom.hide();
				overlays.left.hide();
			}, 200);
		})
		.each(function () {
			var $el = jQuery(this),
				data = extract_data_attr(this),
				editor;

			if ( undefined === FrontEndEditor.fieldTypes[data.type] ) {
				if ( undefined !== console )
					console.warn('invalid field type', this);
				return;
			}

			editor = new FrontEndEditor.fieldTypes[data.type]();

			editor = jQuery.extend(editor, {
				el: $el,
				data: data,
				filter: filter,
				type: data.type
			});
			editor.start();

			$el.delayedDblClick( jQuery.proxy(editor, 'dblclick') );
		});
	});
});
