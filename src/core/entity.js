
var Mura=require('./core');

/**
* Creates a new Mura.Entity
* @name	Mura.Entity
* @class
* @extends Mura.Core
* @memberof Mura
* @param	{object} properties Object containing values to set into object
* @return {Mura.Entity}
*/

Mura.Entity = Mura.Core.extend(
/** @lends Mura.Entity.prototype */
{
	init(properties,requestcontext) {
		properties = properties || {};
		properties.entityname = properties.entityname || 'content';
		properties.siteid = properties.siteid || Mura.siteid;
		this.set(properties);

		if (typeof this.properties.isnew == 'undefined') {
			this.properties.isnew = 1;
		}

		if (this.properties.isnew) {
			this.set('isdirty', true);
		} else {
			this.set('isdirty', false);
		}

		if (typeof this.properties.isdeleted ==	'undefined') {
			this.properties.isdeleted = false;
		}

		this._requestcontext=requestcontext || Mura._requestcontext;

		this.cachePut();

		return this;
	},

	/**
	 * setRequestContext - Sets the RequestContext
	 *
	 * @RequestContext	{Mura.RequestContext} Mura.RequestContext List of fields
	 * @return {Mura.Feed}				Self
	 */
	setRequestContext(requestcontext) {
		this._requestcontext=requestcontext;
		return this;
	},

	/**
	 * getEnpoint - Returns API endpoint for entity type
	 *
	 * @return {string} All Headers
	 */
	getApiEndPoint(){
		return	Mura.getAPIEndpoint() + this.get('entityname') + '/';
	},

	/**
	 * invoke - Invokes a method
	 *
	 * @param	{string} name Method to call
	 * @param	{object} params Arguments to submit to method
	 * @param	{string} method GET or POST
	 * @return {any}
	 */
	invoke(name,params,method,eventHandler){
		if(typeof name == 'object'){
			params=name.params || {};
			method=name.method || 'get';
			eventHandler=name;
			name=name.name;
		} else {
			eventHandler=eventHandler || {};
		}

		Mura.normalizeRequestHandler(eventHandler);

		var self = this;

		if(typeof method=='undefined' && typeof params=='string'){
			method=params;
			params={};
		}

		params=params || {};
		method=method || "post";

		if(this[name]=='function'){
			return this[name].apply(this,params);
		}

		return new Promise(function(resolve,reject) {

			if(typeof resolve == 'function'){
				eventHandler.success=resolve;
			}

			if(typeof reject == 'function'){
				eventHandler.error=reject;
			}

			if(Mura.formdata && params instanceof FormData){
				params.append('_cacheid',Math.random());
			} else {
				params._cacheid=Math.random();
			}

			self._requestcontext.request({
				type: method.toLowerCase(),
				url: self.getApiEndPoint() + name,
				data: params,
				success(resp) {
					if (typeof resp.error == 'undefined') {
						if (typeof 	eventHandler.success ==	'function') {
							if(typeof resp.data != 'undefined'){
								eventHandler.success(resp.data);
							} else {
								eventHandler.success(resp);
							}
						}
					} else {
						if (typeof eventHandler.error == 'function') {
							eventHandler.error(resp);
						}
					}
				},
				error(resp) {
					resp=Mura.parseString(resp.response);
					if (typeof eventHandler.error == 'function'){
						eventHandler.error(resp);
					}
				},
				progress:eventHandler.progress,
				abort: eventHandler.abort
			});
		});
	},

	/**
	 * invokeWithCSRF - Proxies method call to remote api, but first generates CSRF tokens based on name
	 *
	 * @param	{string} name Method to call
	 * @param	{object} params Arguments to submit to method
	 * @param	{string} method GET or POST
	 * @return {Promise} All Headers
	 */
	invokeWithCSRF(name,params,method,eventHandler){
		if(typeof name == 'object'){
			params=name.params || {};
			method=name.method || 'get';
			eventHandler=name;
			name=name.name;
		} else {
			eventHandler=eventHandler || {};
		}

		Mura.normalizeRequestHandler(eventHandler);

		if(Mura.mode.toLowerCase() == 'rest'){

			return new Promise(function(resolve,reject) {
				return self.invoke(
					name,
					params,
					method,
					eventHandler
				).then(resolve,reject);
			});
		} else {
			var self = this;
			return new Promise(function(resolve,reject) {
				if(typeof resolve == 'function'){
					eventHandler.success=resolve;
				}

				if(typeof reject == 'function'){
					eventHandler.error=reject;
				}
				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint() + '?method=generateCSRFTokens',
					data: {
						siteid: self.get('siteid'),
						context: name
					},
					success(resp) {

						if(Mura.formdata && params instanceof FormData){
							params.append('csrf_token',resp.data.csrf_token);
							params.append('csrf_token_expires',resp.data.csrf_token_expires);
						} else {
							params=Mura.extend(params,resp.data);
						}

						if (resp.data != 'undefined'	) {
							self.invoke(
								name,
								params,
								method,
								eventHandler
							).then(resolve,reject);
						} else {
							if (typeof eventHandler.error == 'function'){
								eventHandler.error(resp);
							}
						}
					},
					error(resp) {
						resp=Mura.parseString(resp.response);
						if (typeof eventHandler.error == 'function'){
							eventHandler.error(resp);
						}
					}
				});
			});
		}
	},

	/**
	 * exists - Returns if the entity was previously saved
	 *
	 * @return {boolean}
	 */
	exists() {
		return this.has('isnew') && !this.get('isnew');
	},

	/**
	 * get - Retrieves property value from entity
	 *
	 * @param	{string} propertyName Property Name
	 * @param	{*} defaultValue Default Value
	 * @return {*}							Property Value
	 */
	get(propertyName, defaultValue) {
		if (typeof this.properties.links != 'undefined' &&
			typeof this.properties.links[propertyName] != 'undefined') {
			var self = this;
			if (typeof this.properties[propertyName] == 'object') {
				return new Promise(function(resolve,reject) {
					if ('items' in self.properties[propertyName]) {
						var returnObj = new Mura.EntityCollection(self.properties[propertyName],self._requestcontext);
					} else {
						if (Mura.entities[self.properties[propertyName].entityname]) {
							var returnObj = new Mura.entities[self.properties[propertyName ].entityname](self.properties[propertyName],self._requestcontext);
						} else {
							var returnObj = new Mura.Entity(self.properties[propertyName],self._requestcontext);
						}
					}
					if (typeof resolve == 'function') {
						resolve(returnObj);
					}
				});
			} else {
				if (typeof defaultValue == 'object') {
					var params = defaultValue;
				} else {
					var params = {};
				}
				return new Promise(function(resolve,reject) {
					self._requestcontext.request({
						type: 'get',
						url: self.properties.links[propertyName],
						params: params,
						success(resp) {
							if (
								'items' in resp.data
							) {
								var returnObj = new Mura.EntityCollection(resp.data,self._requestcontext);
							} else {
								if (Mura.entities[self.entityname]) {
									var returnObj = new Mura.entities[self.entityname](resp.data,self._requestcontext);
								} else {
									var returnObj = new Mura.Entity(resp.data,self._requestcontext);
								}
							}
							//Dont cache if there are custom params
							if (Mura.isEmptyObject(params)) {
								self.set(propertyName,resp.data);
							}
							if (typeof resolve == 'function') {
								resolve(returnObj);
							}
						},
						error(resp){
							resp=Mura.parseString(resp.response);
							if (typeof reject == 'function'){
								reject(resp);
							}
						}
					});
				});
			}
		} else if (typeof this.properties[propertyName] != 'undefined') {
			return this.properties[propertyName];
		} else if (typeof defaultValue != 'undefined') {
			this.properties[propertyName] = defaultValue;
			return this.properties[propertyName];
		} else {
			return '';
		}
	},

	/**
	 * set - Sets property value
	 *
	 * @param	{string} propertyName	Property Name
	 * @param	{*} propertyValue Property Value
	 * @return {Mura.Entity} Self
	 */
	set(propertyName, propertyValue) {
		if (typeof propertyName == 'object') {
			this.properties = Mura.deepExtend(this.properties,propertyName);
			this.set('isdirty', true);
		} else if (typeof this.properties[propertyName] == 'undefined' || this.properties[propertyName] != propertyValue) {
			this.properties[propertyName] = propertyValue;
			this.set('isdirty', true);
		}

		return this;
	},


	/**
	 * has - Returns is the entity has a certain property within it
	 *
	 * @param	{string} propertyName Property Name
	 * @return {type}
	 */
	has(propertyName) {
		return typeof this.properties[propertyName] !=
			'undefined' || (typeof this.properties.links !=
			'undefined' && typeof this.properties.links[propertyName] != 'undefined');
	},


	/**
	 * getAll - Returns all of the entities properties
	 *
	 * @return {object}
	 */
	getAll() {
		return this.properties;
	},


	/**
	 * load - Loads entity from JSON API
	 *
	 * @return {Promise}
	 */
	load() {
		return this.loadBy('id', this.get('id'));
	},


	/**
	 * new - Loads properties of a new instance from JSON API
	 *
	 * @param	{type} params Property values that you would like your new entity to have
	 * @return {Promise}
	 */
	'new'(params) {
		var self = this;
		return new Promise(function(resolve, reject) {
			params = Mura.extend({
				entityname: self.get('entityname'),
				method: 'findNew',
				siteid: self.get('siteid'),
				'_cacheid': Math.random()
			},
				params
			);
			Mura.get(Mura.getAPIEndpoint(), params).then(
				function(resp) {
					self.set(resp.data);
					if (typeof resolve == 'function') {
						resolve(self);
					}
			});
		});
	},

	/**
	 * checkSchema - Checks the schema for Mura ORM entities
	 *
	 * @return {Promise}
	 */
	'checkSchema'() {
		var self = this;
		return new Promise(function(resolve, reject) {
			if(Mura.mode.toLowerCase() == 'rest'){
				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint(),
					data:{
						entityname: self.get('entityname'),
						method: 'checkSchema',
						siteid: self.get('siteid'),
						'_cacheid': Math.random()
					},
					success(	resp) {
						if (resp.data != 'undefined'	) {
							if (typeof resolve ==	'function') {
								resolve(self);
							}
						} else {
							self.set('errors',resp.error);
							if (typeof reject == 'function') {
								reject(self);
							}
						}
					}
				});
			} else {
				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint() + '?method=generateCSRFTokens',
					data: {
						siteid: self.get('siteid'),
						context: ''
					},
					success(resp) {
						self._requestcontext.request({
							type: 'post',
							url: Mura.getAPIEndpoint(),
							data: Mura
							.extend(
							{
								entityname: self.get('entityname'),
								method: 'checkSchema',
								siteid: self.get('siteid'),
								'_cacheid': Math.random()
							}, {
								'csrf_token': resp.data.csrf_token,
								'csrf_token_expires': resp.data.csrf_token_expires
							}),
							success(	resp) {
								if (resp.data != 'undefined'	) {
									if (typeof resolve ==	'function') {
										resolve(self);
									}
								} else {
									self.set('errors',resp.error);
									if (typeof reject == 'function') {
										reject(self);
									}
								}
							},
							error(resp) {
								this.success(Mura.parseString(resp.response));
							}
						});
					},
					error(resp) {
						this.success(Mura.parseString(resp.response));
					}
				});
			}
		});

	},

	/**
	 * undeclareEntity - Undeclares an Mura ORM entity with service factory
	 *
	 * @return {Promise}
	 */
	'undeclareEntity'(deleteSchema) {
		deleteSchema=deleteSchema || false;
		var self = this;
		return new Promise(function(resolve, reject) {
			if(Mura.mode.toLowerCase() == 'rest'){
				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint(),
					data: {
						entityname: self.get('entityname'),
						deleteSchema: deleteSchema,
						method: 'undeclareEntity',
						siteid: self.get('siteid'),
						'_cacheid': Math.random()
					},
					success(	resp) {
						if (resp.data != 'undefined'	) {
							if (typeof resolve ==	'function') {
								resolve(self);
							}
						} else {
							self.set('errors',resp.error);
							if (typeof reject == 'function') {
								reject(self);
							}
						}
					},
					error(resp){
						this.success(Mura.parseString(resp.response));
					}
				});
			} else {
				return self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint() + '?method=generateCSRFTokens',
					data: {
						siteid: self.get('siteid'),
						context: ''
					},
					success(resp) {
						self._requestcontext.request({
							type: 'post',
							url: Mura.getAPIEndpoint(),
							data: Mura
							.extend(	{
								entityname: self.get('entityname'),
								method: 'undeclareEntity',
								siteid: self.get('siteid'),
								'_cacheid': Math.random()
							}, {
								'csrf_token': resp.data.csrf_token,
								'csrf_token_expires': resp.data.csrf_token_expires
							}),
							success(resp) {
								if (resp.data != 'undefined'	) {
									if (typeof resolve ==	'function') {
										resolve(self);
									}
								} else {
									self.set('errors',resp.error);
									if (typeof reject == 'function') {
										reject(self);
									}
								}
							}
						});
					},
					error(resp) {
						this.success(Mura.parseString(resp.response));
					}
				});
			}
		});

	},


	/**
	 * loadBy - Loads entity by property and value
	 *
	 * @param	{string} propertyName	The primary load property to filter against
	 * @param	{string|number} propertyValue The value to match the propert against
	 * @param	{object} params				Addition parameters
	 * @return {Promise}
	 */
	loadBy(propertyName, propertyValue, params) {
		propertyName = propertyName || 'id';
		propertyValue = propertyValue || this.get(propertyName) || 'null';
		var self = this;
		if (propertyName == 'id') {
			var cachedValue = Mura.datacache.get(propertyValue);
			if (typeof cachedValue != 'undefined') {
				this.set(cachedValue);
				return new Promise(function(resolve,reject) {
					resolve(self);
				});
			}
		}
		return new Promise(function(resolve, reject) {
			params = Mura.extend({
				entityname: self.get('entityname').toLowerCase(),
				method: 'findQuery',
				siteid: self.get( 'siteid'),
				'_cacheid': Math.random(),
			},
				params
			);
			if (params.entityname == 'content' ||	params.entityname ==	'contentnav') {
				params.includeHomePage = 1;
				params.showNavOnly = 0;
				params.showExcludeSearch = 1;
			}
			params[propertyName] = propertyValue;
			Mura.findQuery(params).then(
				function(collection) {
					if (collection.get('items').length) {
						self.set(collection.get('items')[0].getAll());
					}
					if (typeof resolve == 'function') {
						resolve(self);
					}
			},function(resp){
				resp=Mura.parseString(resp.response);
				if (typeof reject == 'function'){
					reject(resp);
				}
			});
		});
	},

	/**
	 * validate - Validates instance
	 *
	 * @param	{string} fields List of properties to validate, defaults to all
	 * @return {Promise}
	 */
	validate(fields) {
		fields = fields || '';
		var self = this;
		var data = Mura.deepExtend({}, self.getAll());
		data.fields = fields;
		return new Promise(function(resolve, reject) {
			self._requestcontext.request({
				type: 'post',
				url: Mura.getAPIEndpoint() + '?method=validate',
				data: {
					data: Mura.escape( data),
					validations: '{}',
					version: 4
				},
				success(resp) {
					if (resp.data !=	'undefined') {
						self.set('errors',resp.data)
					} else {
						self.set('errors',resp.error);
					}
					if (typeof resolve ==	'function') {
						resolve(self);
					}
				}
			});
		});
	},


	/**
	 * hasErrors - Returns if the entity has any errors
	 *
	 * @return {boolean}
	 */
	hasErrors() {
		var errors = this.get('errors', {});
		return (typeof errors == 'string' && errors !='') || (typeof errors == 'object' && !Mura.isEmptyObject(errors));
	},


	/**
	 * getErrors - Returns entites errors property
	 *
	 * @return {object}
	 */
	getErrors() {
		return this.get('errors', {});
	},


	/**
	 * save - Saves entity to JSON API
	 *
	 * @return {Promise}
	 */
	save(eventHandler) {
		eventHandler=eventHandler || {};

		Mura.normalizeRequestHandler(eventHandler);

		var self = this;

		if (!this.get('isdirty')) {
			return new Promise(function(resolve, reject) {
				if(typeof resolve == 'function'){
					eventHandler.success=resolve;
				}
				if (typeof eventHandler.success =='function') {
					eventHandler.success(self);
				}
			});
		}
		if (!this.get('id')) {
			return new Promise(function(resolve, reject) {
				var temp = Mura.deepExtend({},self.getAll());
				self._requestcontext.request({
					type: 'get',
					url: Mura.getAPIEndpoint() + self.get('entityname') + '/new',
					success(resp) {
						self.set(resp.data);
						self.set(temp);
						self.set('id',resp.data.id);
						self.set('isdirty',true);
						self.cachePut();
						self.save(eventHandler).then(
							resolve,
							reject
						);
					},
					error: eventHandler.error,
					abort: eventHandler.abort
				});
			});
		} else {
			return new Promise(function(resolve, reject) {

				if(typeof resolve == 'function'){
					eventHandler.success=resolve;
				}

				if(typeof reject == 'function'){
					eventHandler.error=reject;
				}

				var context = self.get('id');
				if(Mura.mode.toLowerCase() == 'rest'){
					self._requestcontext.request({
						type: 'post',
						url: Mura.getAPIEndpoint() + '?method=save',
						data:	self.getAll(),
						success(resp) {
							if (resp.data != 'undefined') {
								self.set(resp.data)
								self.set('isdirty',false );
								if (self.get('saveerrors') ||
									Mura.isEmptyObject(self.getErrors())
								) {
									if (typeof eventHandler.success ==	'function') {
											eventHandler.success(self);
									}
								} else {
									if (typeof eventHandler.error == 'function') {
											eventHandler.error(self);
									}
								}
							} else {
								self.set('errors',resp.error);
								if (typeof eventHandler.error == 'function') {
									eventHandler.error(self);
								}
							}
						},
						progress:eventHandler.progress,
						abort: eventHandler.abort
					});
				} else {
					self._requestcontext.request({
						type: 'post',
						url: Mura.getAPIEndpoint() + '?method=generateCSRFTokens',
						data: {
							siteid: self.get('siteid'),
							context: context
						},
						success(resp) {
							self._requestcontext.request({
								type: 'post',
								url: Mura.getAPIEndpoint() + '?method=save',
								data: Mura
								.extend( self.getAll(), {
										'csrf_token': resp.data.csrf_token,
										'csrf_token_expires': resp.data.csrf_token_expires
									}
								),
								success(	resp) {
									if (resp.data != 'undefined'	) {
										self.set(resp.data)
										self.set('isdirty',false );
										if (self.get('saveerrors') ||
											Mura.isEmptyObject(self.getErrors())
										) {
											if (typeof eventHandler.success ==	'function') {
												eventHandler.success(self);
											}
										} else {
											if (typeof eventHandler.error == 'function') {
												eventHandler.error(self);
											}
										}
									} else {
										self.set('errors',resp.error);
										if (typeof eventHandler.error == 'function') {
											eventHandler.error(self);
										}
									}
								},
								progress:eventHandler.progress,
								abort: eventHandler.abort
							});
						},
						error(resp) {
							this.success(resp );
						},
						abort: eventHandler.abort
					});
				}
			});
		}
	},

	/**
	 * delete - Deletes entity
	 *
	 * @return {Promise}
	 */
	'delete'(eventHandler) {
		eventHandler=eventHandler || {};

		Mura.normalizeRequestHandler(eventHandler);

		var self = this;
		if(Mura.mode.toLowerCase() == 'rest'){
			return new Promise(function(resolve, reject) {

				if(typeof resolve == 'function'){
					eventHandler.success=resolve;
				}

				if(typeof reject == 'function'){
					eventHandler.error=reject;
				}

				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint() + '?method=delete',
					data: {
						siteid: self.get('siteid'),
						id: self.get('id'),
						entityname: self.get('entityname')
					},
					success() {
						self.set('isdeleted',true);
						self.cachePurge();
						if (typeof eventHandler.success == 'function') {
							eventHandler.success(self);
						}
					},
					error: eventHandler.error,
					progress:eventHandler.progress,
					abort: eventHandler.abort
				});
			});
		} else {
			return new Promise(function(resolve, reject) {
				if(typeof resolve == 'function'){
					eventHandler.success=resolve;
				}

				if(typeof reject == 'function'){
					eventHandler.error=reject;
				}

				self._requestcontext.request({
					type: 'post',
					url: Mura.getAPIEndpoint() + '?method=generateCSRFTokens',
					data: {
						siteid: self.get('siteid'),
						context: self.get('id')
					},
					success(resp) {
						self._requestcontext.request({
							type: 'post',
							url: Mura.getAPIEndpoint() + '?method=delete',
							data: {
								siteid: self.get('siteid'),
								id: self.get('id'),
								entityname: self.get('entityname'),
								'csrf_token': resp.data.csrf_token,
								'csrf_token_expires': resp.data.csrf_token_expires
							},
							success() {
								self.set('isdeleted',true);
								self.cachePurge();
								if (typeof eventHandler.success == 'function') {
									eventHandler.success(self);
								}
							},
							error: eventHandler.error,
							progress:eventHandler.progress,
							abort: eventHandler.abort
						});
					},
					error: eventHandler.error,
					abort: eventHandler.abort
				});
			});
		}
	},

	/**
	 * getFeed - Returns a Mura.Feed instance of this current entitie's type and siteid
	 *
	 * @return {object}
	 */
	getFeed() {
		var siteid = get('siteid') || Mura.siteid;
		var feed=this._requestcontext.getFeed(this.get('entityName'));
		return feed;
	},

	/**
	 * cachePurge - Purges this entity from client cache
	 *
	 * @return {object}	Self
	 */
	cachePurge() {
		Mura.datacache.purge(this.get('id'));
		return this;
	},

	/**
	 * cachePut - Places this entity into client cache
	 *
	 * @return {object}	Self
	 */
	cachePut() {
		if (!this.get('isnew')) {
			Mura.datacache.set(this.get('id'), this);
		}
		return this;
	}

});
