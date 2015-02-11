Template.story_list.events({
	'submit #new_story_form': function (event) {
		var storyName = $('#story_name').val();
		
		event.preventDefault();
		
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