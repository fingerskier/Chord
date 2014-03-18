Session.set('editing_name', false);

Template.story.events({
	'click #story_name': function () {
		Session.set('editing_name', true);
	},
	'click #save_story_name': function() {
		Stories.update(Session.get('story'), {
			$set: {name: $('#story_name').val()}
		});
		Session.set('editing_name', false);
	}
});

Template.story.helpers({
	editing_name: function() {
		return Session.get('editing_name');
	},
	story: function () {
		return Stories.findOne(Session.get('story'));
	}
});
