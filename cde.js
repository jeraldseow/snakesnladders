import { Random } from 'meteor/random'

if (Meteor.isClient){
	console.log("Client")
	Meteor.subscribe('thePlayers');

	Template.lead.helpers({
		'player': function(){
			var currentUserId = Meteor.userId()
			return P.find({createdBy: currentUserId})
		},

		'another': function(){
			return "mmmmm";
		},

		'numPlayers': function(){
			var num = P.find().count()
			if (num < 4){
				return true
			}
			else {return false}
		},

		'canPlay':function(){
			var num = P.find().count()
			if (num == 4){
				if (P.findOne({score: 100}, {createdBy: Meteor.userId()})){
					return false;
				}
				else{
					return true;
				}
			}
			else {return false;}
		},

		'selectedOne': function(){
			var playerID =  this._id;
			var selectedPlayer = Session.get('selectedPlayer')
			var playerToRollId = P.findOne({canRoll: true}, {createdBy: Meteor.userId()})._id
			if (playerID == selectedPlayer){
				return "youthechosenone"
			}
			if (playerID == playerToRollId){
				return "toRoll"
			}
			else {
				return 'a'
			}
		},

		'selectedPlayer': function(){
			 var selectedPlayer = Session.get('selectedPlayer');
			 return P.findOne({_id: selectedPlayer}, {createdBy: Meteor.userId()})
		},

		'gameOver': function(){	
			if (P.findOne({score: 100}, {createdBy: Meteor.userId()})){
				return true;
			}
			else{
				return false;
			}
		},

		'findWinner': function(){
			return P.findOne({score:100}, {createdBy: Meteor.userId()}).name;
		}

	});

	Template.lead.events({

		'click .player': function(){
			var playerID = this._id;
			if (Session.get('selectedPlayer') == playerID){
				Session.set('selectedPlayer', 'notyou')
			}
			else{
				Session.set('selectedPlayer', playerID);
			}
		},

		'click .increment': function(){
			var selectedPlayer = Session.get('selectedPlayer');
			Meteor.call('updateScore', selectedPlayer, 5)
		},

		'click .dec': function(){
			var selectedPlayer = Session.get('selectedPlayer');
			Meteor.call('updateScore', selectedPlayer, -5)
		},

		'click .remove':function(){
			var selectedPlayer = Session.get('selectedPlayer');
    		Meteor.call('removePlayer', selectedPlayer)
		},

		'click .roll': function(){
			var selectedPlayer = P.findOne({canRoll: true}, {createdBy: Meteor.userId()})._id;
			Meteor.call('roll', selectedPlayer)
		},

		'click .reset': function(){
			Meteor.call('resetGame');
		}

	});

	Template.addPlayerForm.events({
		'submit form': function(event){
			event.preventDefault();
			var playerNameVar = event.target.playerName2.value;
			event.target.playerName2.value = "";
			Meteor.call('createPlayer', playerNameVar)
		}

	});
}

if (Meteor.isServer){
	Meteor.publish('thePlayers', function(){
		var currentUserId = this.userId;
		return P.find({createdBy: currentUserId});
	})
}

P = new Mongo.Collection('player');
UserAccounts = new Mongo.Collection('accounts');

Meteor.methods({
	'createPlayer': function(playerNameVar){
		check(playerNameVar, String)
		var currentUserId = Meteor.userId();
		if (currentUserId){
			P.insert({name: playerNameVar, score: 0, createdBy: currentUserId, canRoll: true});
		}
	},

	'removePlayer': function(selectedPlayer){
		check(selectedPlayer, String);
		var test = selectedPlayer
		var currentUserId = Meteor.userId();
		if (currentUserId){
			if (test){
				P.remove({ _id: selectedPlayer, createdBy: currentUserId});
			}
		}
	},

	'updateScore': function(selectedPlayer, amount){
		var SnakesNLadders = {3:3, 5:2, 8:-1, 11:3, 12:-3, 15:5, 20:-3, 22:3, 25:-2, 27:10}
		check(selectedPlayer, String)
		check(amount, Number);
		var currentUserId = Meteor.userId()
		var curr_score = P.findOne({_id: selectedPlayer}, {createdBy: Meteor.userId()}).score
		
		if (SnakesNLadders[curr_score + amount]){
			amount += SnakesNLadders[curr_score+amount]
			console.log("snake or laddered!")
		}

		while (P.findOne({score: curr_score + amount}, {createdBy: Meteor.userId()})){
					amount += 1
					console.log("stepped on someone!")
				}

		if (P.findOne({_id: selectedPlayer}, {createdBy: Meteor.userId()}).score + amount> 100){
			var sub = P.findOne({_id: selectedPlayer}, {createdBy: Meteor.userId()}).score + amount - 100;
			var newScore = 100 - sub
			amount = newScore - P.findOne({_id: selectedPlayer}, {createdBy: Meteor.userId()}).score
		}

		if (currentUserId){
			P.update({_id: selectedPlayer, createdBy: currentUserId}, {$inc: {score: amount}});
		}
	},

	'roll': function(selectedPlayer){
		var arr = [1, 2, 3, 4, 5, 6];
		var num = Random.choice(arr);
		Meteor.call('updateScore', selectedPlayer, num);
		Meteor.call('nextPlayer', selectedPlayer)
	},

	'nextPlayer': function(selectedPlayer){
		P.update({_id: selectedPlayer}, {$set: {canRoll: false}})
		if (!P.findOne({createdBy: Meteor.userId()} && {canRoll: true})){
			Meteor.call('makeAllTrue', Meteor.userId())
		}
	},

	'makeAllTrue': function(userId){
		var arr = P.find({createdBy: Meteor.userId()}).fetch();
		for (i = 0; i < 4; i++){
			P.update({_id: arr[i]._id}, {$set: {canRoll: true}});
		}
		console.log(Meteor.userId());
		console.log("made true");
	},

	'resetGame': function(){
		for (i = 0; i < 4; i++){
			P.update({_id: P.find().fetch()[i]._id}, {$set: {score: 0}});
			P.update({_id: P.find().fetch()[i]._id}, {$set: {canRoll: true}})
		console.log("reset") 
		}
	}

});