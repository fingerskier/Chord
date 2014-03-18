Template.characters.events({
	'submit #character_form': function(evt) {
		evt.preventDefault();
		var name = $('#new_character').val();
		
		Stories.update(Session.get('story'), {
			$push: {characters: name}
		});		
	},
	'click .del_character': function(evt) {
		var val = $(evt.target).attr('character');
		var arr = Stories.findOne(Session.get('story')).characters;
		var I = arr.indexOf(val);
		
		arr.splice(I,1);

		Stories.update(Session.get('story'), {
			$set: {characters: arr}
		});
	}
});