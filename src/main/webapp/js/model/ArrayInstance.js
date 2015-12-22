/*******************************************************************************
 * The MIT License (MIT)
 *
 * Copyright (c) 2011, 2013 OpenWorm.
 * http://openworm.org
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the MIT License
 * which accompanies this distribution, and is available at
 * http://opensource.org/licenses/MIT
 *
 * Contributors:
 *      OpenWorm - http://openworm.org/people.html
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/

/**
 * Client class use to represent an array of instances.
 * 
 * @module model/ArrayInstance
 * @author Giovanni Idili
 */

define([ 'jquery', 'underscore', 'backbone'], function(require) {
	return Backbone.Model.extend({
			id : "",
			name : "",
			_metaType : "",
			variable : null,
			size : 0,
			
			/**
			 * Initializes this node with passed attributes
			 * 
			 * @param {Object} options - Object with options attributes to initialize instance
			 */
			initialize : function(options) {
				this.set({ "variable" : options.variable });
				this.set({ "size" : options.size });
				this.set({ "id" : options.id });
				this.set({ "name" : options.name });
				this.set({ "_metaType" : options._metaType });
			},
			
			/**
			 * Get id 
			 * 
			 * @command Instance.getId()
			 * 
			 * @returns {String} - Id
			 * 
			 */
			getId : function() {
				return this.get("id");
			},
			
			/**
			 * Get name 
			 * 
			 * @command Instance.getName()
			 * 
			 * @returns {String} - Name
			 * 
			 */
			getName : function() {
				return this.get("name");
			},
			
			/**
			 * Get meta type
			 * 
			 * @command Instance.getMetaType()
			 * 
			 * @returns {String} - meta type
			 * 
			 */
			getMetaType : function() {
				return this.get("_metaType");
			},
			
			/**
			 * Get the type for this instance
			 * 
			 * @command Instance.getTypes()
			 * 
			 * @returns {List<Type>} - array of types
			 * 
			 */
			getTypes : function() {
				return this.get("variable").getTypes();
			},
			
			/**
			 * Get the variable for this instance
			 * 
			 * @command Instance.getVariable()
			 * 
			 * @returns {Variable} - Variable object for this instance
			 * 
			 */
			getVariable : function() {
				return this.get("variable");
			},
			
			/**
			 * Get the size of the array instance
			 * 
			 * @command Instance.getSize()
			 * 
			 * @returns {Integer} - size of the array 
			 * 
			 */
			getSize : function() {
				return this.get("size");
			},
		})
});
