/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */
Players = new Meteor.Collection('players') /* global Players */

if (Meteor.isClient) {
  if (!window.localStorage.playerId) {
    console.log('No player found in localStorage, creating a new one')
    Players.insert({
      games: [],
      name: Random.id()
    }, function (err, playerId) {
      if (err) return console.error(err)
        window.localStorage.playerId = playerId
    })
  }

  Template.listGames.helpers({
    games: function () {
      return Games.find().fetch()
    }
  })

  Template.listGames.events({
    'submit #new-game': function (e) {
      e.preventDefault()
      var form = $('#new-game')

      $.ajax({
        method: 'POST',
        url: form.attr('action'),
        data: form.serialize()
      })
      .done(function (data) {
        console.log(data)
        FlowRouter.go('/games/' + data.gameId)
      })
      .fail(function (err) {
        console.error(err)
      })
    }
  })

  Template.playGame.helpers({
    players: function () {
      return Players.find().fetch()
    },
    game: function () {
      return Games.findOne()
    }
  })

  Template.playGame.events({
    ready: function () {

    },
    'click .btn-join': function () {
      var ctx = this

      var player = Players.findOne({_id: playerId()})
      Games.update(
        { _id: ctx.gameId() },
        { $addToSet: { players: player } }, // addToSet avoids duplicate values
        function (err) {
          if (err) return console.error(err)
          // We're in - do stuff
        }
      )
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

function playerId () {
  return window.localStorage.playerId
}

// Server
if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.publish('games', function (params) {
      if (params && params.gameId) return Games.find({ _id: params.gameId })
      return Games.find()
    })

    Meteor.publish('players', function (params) {
      if (params && params.playerId) return Players.find({ _id: params.playerId })
      return Players.find()
    })
  })

  Players.allow({
    insert: function () { return true },
    update: function () { return true }
  })

  Games.allow({
    insert: function () { return true },
    update: function () { return true }
  })
}
