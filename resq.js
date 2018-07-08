angular.module('resq', [])
	.service('resq', function ($q) {
		return function (config) {
			return {
				get: function (id, type) {
					return id instanceof Array ?
						config.get(id, type)
							.then(function (object) {
								return id.map(
									object instanceof Array ?
										function (id, i) { return object[i]; } :
										function (id) { return object[id]; }
								);
							}) :
						config.get(id, type);
				},
				join: function (schema) {
					return function (object) {
						var queue = {};
						object = { $: object };
						schema = { $: schema };
						collect(object, schema);
						return flush().finally(function () {
							object = object.$;
							schema = schema.$;
						}).then(function () {
							return object;
						});
						function collect(object, schema) {
							if (angular.isArray(schema)) {
								var schema = schema[0];
								object.forEach(
									typeof schema == 'string' ?
										function (element, i) {
											enqueue(element, schema, object, i);
										} :
										function (element) {
											collect(element, schema);
										}
								);
							} else if (angular.isObject(schema))
								angular.forEach(schema, function (value, key) {
									if (typeof value == 'string')
										enqueue(object[key], value, object, key);
									else
										collect(object[key], value);
								});
						}
						function flush() {
							var request = {};
							for (var type in queue)
								request[type] = config.get(queue[type].map(function (request) { return request.id; }), type);
							return $q.all(request)
								.then(function (object) {
									angular.forEach(object, function (object, type) {
										queue[type].forEach(
											object instanceof Array ?
												function (request, i) {
													request.object[request.i] = object[i];
												} :
												function (request) {
													request.object[request.i] = object[request.id];
												}
										);
									});
								});
						};
						function enqueue(id, type, object, i) {
							var request = {
								id: id,
								type: type,
								object: object,
								i: i
							};
							if (!queue[type]) queue[type] = [];
							queue[type].push(request);
						};
					};
				}
			};
		};
	});
