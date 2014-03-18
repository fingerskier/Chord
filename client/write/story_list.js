Template.story_list.events({
	'click #add_story': function () {
		var storyName = $('#story_name').val();
		
		Stories.insert({
			name: storyName.length ? storyName : 'New Story',
			owner: Meteor.userId()
		});
	}
});

Template.story_list.helpers({
	stories: function () {
		return Stories.find().fetch();
	}
});