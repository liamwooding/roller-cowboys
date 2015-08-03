/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */
Players = new Meteor.Collection('players') /* global Players */

Config = {
  world: {
    boundsX: 1280,
    boundsY: 640
  }
}

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
            console.log('New turn started in game', gameId)
          }
        )
      }
    }
  },
  declareMove: function (gameId, playerId, move) {
    if (Meteor.isServer) {
      Games.update(
        { _id: gameId, 'currentTurn.playerId': playerId },
        {
          $set: {
            'currentTurn.$': {
              playerId: playerId,
              move: move
            }
          }
        },
        function (err, affected) {
          if (err) return console.error(err)
          console.log('set turn', affected)
          if (affected) return Meteor.call('checkForTurnEnded', gameId)
          Games.update(
            { _id: gameId },
            {
              $push: {
                currentTurn: {
                  playerId: playerId,
                  move: move
                }
              }
            },
            function (err, affected) {
              if (err) return console.error(err)
              console.log('pushed turn', affected)
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

      player.position = {
        x: getRandomInt(0, Config.world.boundsX),
        y: getRandomInt(0, Config.world.boundsY)
      }

      Games.update(
        { _id: gameId, 'players._id': playerId },
        { $set: { 'players.$': player } },
        function (err, affected) {
          if (err) return console.error(err)
          if (affected) return
          Games.update(
            { _id: gameId },
            { $push: { players: player } },
            function (err, affected) {
              if (err) return console.error(err)
            }
          )
        }
      )
    }
  }
})

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
