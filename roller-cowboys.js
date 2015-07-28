/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */

if (Meteor.isClient) {

  Template.listGames.helpers({
    games: function () {
      return Games.find().fetch()
    }
  })

  Template.listGames.events({

  })

  Template.playGame.helpers({
    game: function () {
      return Games.findOne()
    }
  })

  Template.registerHelper('isReady', function (sub) {
    if (sub) {
      return FlowRouter.subsReady(sub)
    } else {
      return FlowRouter.subsReady()
    }
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Games.find().count() === 0) Games.insert({ name: 'Default' })

    Meteor.publish('games', function () {
      return Games.find()
    })
  })
}
