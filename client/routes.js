Router.configure({
	layoutTemplate: "layout"
});

Router.map(function() {
	this.route('home', {
		path: '/',
		template: 'home'
	});

	this.route('read', {
		path: '/read/:story',
		template: 'read',
		onBeforeAction: function() {
			Session.set('story', this.params.story);
		}
	});

	this.route('read', {
		path: '/read/:story/:thing',
		template: 'read',
		onBeforeAction: function() {
			Session.set('story', this.params.story);
			Session.set('thing', this.params.thing);
		}
	});

	this.route('write', {
		path: '/write',
		template: 'story_list'
	});

	this.route('story', {
		path: '/write/:story',
		template: 'story',
		onBeforeAction: function() {
			Session.set('story', this.params.story);
		}
	});
});
