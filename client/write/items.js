Template.items.events({
	'submit #item_form': function(evt) {
		evt.preventDefault();
		var name = $('#new_item').val();
		
		Stories.update(Session.get('story'), {
			$push: {items: name}
		});		
	},
	'click .del_item': function(evt) {
		var val = $(evt.target).attr('item');
		var arr = Stories.findOne(Session.get('story')).items;
		var I = arr.indexOf(val);
		
		arr.splice(I,1);

		Stories.update(Session.get('story'), {
			$set: {items: arr}
		});
	}
});