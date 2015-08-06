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
      if (game.currentTurn.moves.length === game.players.length) {
        Games.update(
          { _id: gameId },
          {
            $push: { turns: game.currentTurn },
            $set: {
              currentTurn: {
                positions: [],
                moves: []
              }
            }
          },
          function (err) {
            if (err) return console.error(err)
            console.log('New turn started in game', gameId)
          }
        )
      }
    }
  },
  declareMove: function (gameId, playerId, action) {
    if (Meteor.isServer) {
      Games.update(
        { _id: gameId, 'currentTurn.moves.playerId': playerId },
        {
          $set: {
            'currentTurn.moves.$': {
              playerId: playerId,
              action: action
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
                'currentTurn.moves': {
                  playerId: playerId,
                  action: action
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

      var position = {
        x: getRandomInt(0, Config.world.boundsX),
        y: getRandomInt(0, Config.world.boundsY)
      }

      console.log('adding player', playerId, 'to game', gameId)

      Games.update(
        { _id: gameId, 'players._id': playerId },
        {
          $set: {
            'players.$': player
          },
          $push: {
            'currentTurn.positions': {
              playerId: playerId,
              position: position
            }
          }
        },
        function (err, affected) {
          if (err) return console.error(err)
          if (affected) return
          Games.update(
            { _id: gameId },
            {
              $push: {
                players: player,
                'currentTurn.positions': {
                  playerId: playerId,
                  position: position
                }
              }
            },
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
