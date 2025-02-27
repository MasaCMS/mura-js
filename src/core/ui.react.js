

const React=require('react')
const ReactDOM=require('react-dom')

function attach(Mura){

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
		renderClient(){
			ReactDOM.render(
				React.createElement(this.component, this.context),
				this.context.targetEl,
				()=>{this.trigger('afterRender')}
			);
		},

		destroy(){
			if(this.context && this.context.targetEl && this.context.targetEl.innerHTML){
				ReactDOM.unmountComponentAtNode(this.context.targetEl);
			}
		}
	});
}

module.exports=attach;