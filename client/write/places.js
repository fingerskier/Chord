Template.places.events({
	'submit #place_form': function(evt) {
		evt.preventDefault();
		var name = $('#new_place').val();
		
		Stories.update(Session.get('story'), {
			$push: {places: name}
		});		
	},
	'click .del_place': function(evt) {
		var val = $(evt.target).attr('place');
		var arr = Stories.findOne(Session.get('story')).places;
		var I = arr.indexOf(val);
		
		arr.splice(I,1);

		Stories.update(Session.get('story'), {
			$set: {places: arr}
		});
	}
});