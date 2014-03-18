Template.ideas.events({
	'submit #idea_form': function(evt) {
		evt.preventDefault();
		var name = $('#new_idea').val();
		
		Stories.update(Session.get('story'), {
			$push: {ideas: name}
		});		
	},
	'click .del_idea': function(evt) {
		var val = $(evt.target).attr('idea');
		var arr = Stories.findOne(Session.get('story')).ideas;
		var I = arr.indexOf(val);
		
		arr.splice(I,1);

		Stories.update(Session.get('story'), {
			$set: {ideas: arr}
		});
	}
});