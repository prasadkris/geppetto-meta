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
 * Client class use to represent a composite type.
 * 
 * @module model/CompositeVisualType
 * @author Giovanni Idili
 */
define(function(require) {
	var Type = require('model/Type');

	return Type.extend({
		variables : [],
		
		/**
		 * Initializes this node with passed attributes
		 * 
		 * @param {Object} options - Object with options attributes to initialize node
		 */
		initialize : function(options) {
			this.set({ "variables" : (options.variables != 'undefined') ? options.variables : []});
			this.set({ "visualGroups" : (options.visualGroups != 'undefined') ? options.visualGroups : []});
			this.set({ "wrappedObj" : options.wrappedObj });
			this.set({ "_metaType" : options._metaType });
		},

		/**
		 * Get variables
		 * 
		 * @command CompositeVariableNode.getChildren()
		 * 
		 * @returns {List<Variable>} - List of variables
		 * 
		 */
		getVariables : function() {
			return this.get("variables");
		},
		
		/**
		 * Get the visual groups
		 * 
		 * @command CompositeVariableNode.getVisualGroups()
		 * 
		 * @returns {List<VisualGroup>} - List of variables
		 * 
		 */
		getVisualGroups : function() {
			return this.get("visualGroups");
		},
		
		/**
		 * Get combined children
		 * 
		 * @command CompositeType.getChildren()
		 * 
		 * @returns {List<Object>} - List of children
		 * 
		 */
		getChildren : function() {
			return this.get("variables");
		},
	});
});
