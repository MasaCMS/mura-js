import React from 'react';
import ReactDOM from 'react-dom';
import Mura from './core';

/**
 * Creates a new Mura.UI.React
 * @name  Mura.UI.React
 * @class
 * @extends Mura.UI
 * @memberof  Mura
 */

Mura.UI.React=Mura.UI.extend(
/** @lends Mura.UI.React.prototype */
{
	renderClient:function(){
		ReactDOM.render(
			React.createElement(this.component, this.context),
			this.context.targetEl,
			()=>{this.trigger('afterRender')}
		);
	},

	destroy:function(){
		if(this.context && this.context.targetEl && this.context.targetEl.innerHTML){
			ReactDOM.unmountComponentAtNode(this.context.targetEl);
		}
	}
});
