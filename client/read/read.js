Template.read.helpers({
	story: function () {
		return Session.get('story');
	},
	thing: function() {
		return Session.get('thing');
	}
});