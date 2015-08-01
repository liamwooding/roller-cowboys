/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */
Players = new Meteor.Collection('players') /* global Players */

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
  },
  joinGame: function (gameId, playerId) {
    if (Meteor.isServer) {
      var player = Players.findOne({ _id: playerId })

      Games.update(
        { _id: gameId, 'players._id': playerId },
        { $set: { 'players.$': player } },
        function (err, affected) {
          if (err) return console.error(err)
          if (affected) return console.log('Existing player updated:', playerId)
          Games.update(
            { _id: gameId },
            { $push: { players: player } },
            function (err, affected) {
              if (err) return console.error(err)
              if (affected) return console.log('Player joined:', playerId)
            }
          )
        }
      )
    }
  }
})
