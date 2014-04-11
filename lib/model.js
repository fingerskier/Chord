/*
	Story = {
		owner: #,
		characters: [],
		places: [],
		items: [],
		ideas: [],
		events: []
	}
	
	Exposition = {
		story: #,
		content: ''
	}
*/
Exposition = new Meteor.Collection('Exposition');
Stories = new Meteor.Collection('Stories');

if (Meteor.isServer) {
	Meteor.publish('allExposition', function () {
		return Exposition.find();
	});

	Meteor.publish('allStories', function () {
		return Stories.find();
	});
}

if (Meteor.isClient) {
	Meteor.subscribe('allExposition');
	Meteor.subscribe('allStories');
}