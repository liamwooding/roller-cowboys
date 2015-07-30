/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */
Players = new Meteor.Collection('players') /* global Players */

if (Meteor.isClient) {
  if (!window.localStorage.playerId) {
    console.log('No player found in localStorage, creating a new one')
    Players.insert({
      name: Random.id()
    }, function (err, playerId) {
      if (err) return console.error(err)
        window.localStorage.playerId = playerId
    })
  }

  // listGames
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

  // playGame
  Template.playGame.onRendered(function () {
    Games.find().observeChanges({
      changed: function (gameId, fields) {
        if (fields.turns) console.log('A new turn has begun')
      }
    })
  })
  Template.playGame.helpers({
    players: function () {
      return Players.find().fetch()
    },
    player: function () {
      return Players.findOne({ _id: playerId() })
    },
    hasJoined: function () {
      var player = Players.findOne({ _id: playerId() })
      return Games.findOne({ players: player })
    },
    game: function () {
      return Games.findOne()
    },
    currentTurnArray: function () {
      var turn = Games.findOne().currentTurn
      if (!turn) return console.log('no turn yet')
      var array = Object.keys(turn).map(function (key) {
        var obj = {
          name: turn[key].name,
          action: turn[key].action
        }
        return obj
      })
      return array
    }
  })
  Template.playGame.events({
    'click .btn-end-turn': function () {
      var player = Players.findOne({_id: playerId()})
      var ctx = this
      var turn = {
        playerId: player._id,
        name: player.name,
        action: 'pushed the button'
      }
      Meteor.call('declareTurn', ctx.gameId(), turn)
    },
    'click .btn-join': function () {
      var ctx = this

      var player = Players.findOne({_id: playerId()})
      Games.update(
        { _id: ctx.gameId() },
        { $addToSet: { players: player } }, // addToSet avoids duplicate values
        function (err) {
          if (err) return console.error(err)
        }
      )
    }
  })

  // Global helpers
  Template.registerHelper('isReady', function (sub) {
    if (sub) {
      return FlowRouter.subsReady(sub)
    } else {
      return FlowRouter.subsReady()
    }
  })
  Template.registerHelper('isEq', function (a, b) {
    return a === b
  })
}

// Meteor methods - client side
Meteor.methods({
  checkForTurnEnded: function (gameId) {
    if (Meteor.isServer) {
      if (!gameId) return console.error('No ID provided with checkForTurnEnded call')
      var game = Games.findOne({ _id: gameId })
      if (game.currentTurn.length === game.players.length) {
        Games.update(
          { _id: gameId },
          {
            $push: { turns: game.currentTurn },
            $set: { currentTurn: [] }
          },
          function (err) {
            if (err) return console.error(err)
            console.log('New turn started')
          }
        )
      }
    }
  },
  declareTurn: function (gameId, turn) {
    // This one's for the heads
    if (Meteor.isServer) {
      Games.update(
        { _id: gameId, 'currentTurn.playerId': turn.playerId },
        { $set: { 'currentTurn.$': turn } },
        function (err, affected) {
          if (err) return console.error(err)
          if (affected) return Meteor.call('checkForTurnEnded', gameId)
          Games.update(
            { _id: gameId },
            { $push: { currentTurn: turn } },
            function (err, affected) {
              if (err) return console.error(err)
              Meteor.call('checkForTurnEnded', gameId)
            }
          )
        }
      )
    }
  }
})

function playerId () {
  if (!window || !window.localStorage) return false
  return window.localStorage.playerId
}

// Server
if (Meteor.isServer) {
  Meteor.startup(function () {
    // Publish functions
    Meteor.publish('games', function (params) {
      if (params && params.gameId) return Games.find({ _id: params.gameId })
      return Games.find()
    })
    Meteor.publish('players', function (params) {
      if (params && params.playerId) return Players.find({ _id: params.playerId })
      return Players.find()
    })
  })

  // DB permissions
  Players.allow({
    insert: function () { return true },
    update: function () { return true }
  })
  Games.allow({
    insert: function () { return true },
    update: function () { return true }
  })

  // Cursor observers
  Games.update
}
