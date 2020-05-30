
import Mura from './core';

/**
 * Creates a new Mura.UI instance
 * @name Mura.UI
 * @class
 * @extends  Mura.Core
 * @memberof Mura
 */

Mura.UI=Mura.Core.extend(
  /** @lends Mura.UI.prototype */
  {
	rb:{},
	context:{},
	onAfterRender(){},
	onBeforeRender(){},
	trigger(eventName){
		var $eventName=eventName.toLowerCase();
		if(typeof this.context.targetEl != 'undefined'){
			var obj=Mura(this.context.targetEl).closest('.mura-object');
			if(obj.length && typeof obj.node != 'undefined'){
				if(typeof this.handlers[$eventName] != 'undefined'){
					var $handlers=this.handlers[$eventName];
					for(var i=0;i < $handlers.length;i++){
						if(typeof $handlers[i].call == 'undefined'){
							$handlers[i](this);
						} else {
							$handlers[i].call(this,this);
						}
					}
				}
				if(typeof this[eventName] == 'function'){
					if(typeof this[eventName].call == 'undefined'){
						this[eventName](this);
					} else {
						this[eventName].call(this,this);
					}
				}
				var fnName='on' + eventName.substring(0,1).toUpperCase() + eventName.substring(1,eventName.length);
				if(typeof this[fnName] == 'function'){
					if(typeof this[fnName].call == 'undefined'){
						this[fnName](this);
					} else {
						this[fnName].call(this,this);
					}
				}
			}
		}
		return this;
	},

	/* This method is deprecated, use renderClient and renderServer instead */
	render(){
		Mura(this.context.targetEl).html(Mura.templates[context.object](this.context));
		this.trigger('afterRender');
		return this;
	},

	/*
		This method's current implementation is to support backward compatibility

		Typically it would look like:

		Mura(this.context.targetEl).html(Mura.templates[context.object](this.context));
		this.trigger('afterRender');
	*/
	renderClient(){
		return this.render();
	},


	renderServer(){
		return '';
	},

	hydrate(){

	},

	destroy(){
		
	},

	reset(self,empty){
		
	},

	init(args){
		this.context=args;
		this.registerHelpers();
		return this;
	},

	registerHelpers(){

	}
});
