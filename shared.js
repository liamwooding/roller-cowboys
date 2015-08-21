Games = new Meteor.Collection('games')
Players = new Meteor.Collection('players')
Turns = new Meteor.Collection('turns')

Config = {
  world: {
    boundsX: 1280,
    boundsY: 640
  }
}

Meteor.methods({
  createGame: function (name) {
    Games.insert({
      name: name,
      state: 'ready'
    }, function (err, gameId) {
      if (err) throw new Meteor.Error('500', err)
      Players.insert({
        gameId: gameId,
        userId: Meteor.userId(),
        state: 'ready',
        name: Meteor.user().emails[0].address,
        position: {
          x: getRandomInt(0, Config.world.boundsX),
          y: getRandomInt(0, Config.world.boundsY)
        },
      }, function (err, playerId) {
        if (err) throw new Meteor.Error('500', err)
        console.log('Player with ID', playerId, 'created game with ID', gameId)
      })
    })
  },
  declareMove: function (playerId, action) {
    if (Meteor.isServer) {
      var context = this
      var player = Players.findOne({ _id: playerId })
      if (!player) throw new Meteor.Error('404')
      if (context.userId !== player.userId) throw new Meteor.Error('401')

      var game = Games.findOne({ _id: player.gameId })
      if (game.state !== 'ready') throw new Meteor.Error('403')

      Players.update(
        { _id: playerId },
        {
          $set: {
            action: action,
            state: 'has-shot'
          }
        },
        function (err) {
          if (err) throw new Meteor.Error('500', err)

          var countUndeclaredPlayers = Players.find({ gameId: player.gameId, state: { $ne: 'has-shot' }}).count()
          console.log('Players yet to declare move:', countUndeclaredPlayers)
          if (countUndeclaredPlayers !== 0) return
          Games.update(
            { _id: player.gameId },
            {
              $set: {
                state: 'waiting-for-moves'
              }
            },
            function (err) {
              if (err) throw new Meteor.Error('500', err)
            }
          )
        }
      )
    }
  },
  declarePosition: function (playerId, position) {
    if (Meteor.isServer) {
      var context = this
      var player = Players.findOne({ _id: playerId })
      if (!player) throw new Meteor.Error('404')
      if (context.userId !== player.userId) throw new Meteor.Error('401')

      Players.update(
        { _id: playerId },
        {
          $set: {
            position: position,
            state: 'has-moved'
          }
        },
        function (err) {
          if (err) throw new Meteor.Error('500', err)

          var countUndeclaredPlayers = Players.find({ gameId: player.gameId, state: { $ne: 'has-moved' }}).count()
          console.log('Players yet to declare position:', countUndeclaredPlayers)
          if (countUndeclaredPlayers !== 0) return
          Games.update(
            { _id: player.gameId },
            {
              $set: {
                state: 'ready'
              }
            },
            function (err) {
              if (err) throw new Meteor.Error('500', err)
              includeJoinedPlayers()
            }
          )
        }
      )
    }
  },
  joinGame: function (gameId, userId) {
    if (Meteor.isServer) {
      var existingPlayerCount = Players.find({ gameId: gameId, userId: userId }).count()
      if (existingPlayerCount) throw new Meteor.Error('409', 'You joined this game already')
      var game = Games.findOne({ _id: gameId })
      Players.insert({
        gameId: gameId,
        userId: userId,
        state: game.state === 'ready' ? 'ready' : 'has-joined',
        name: Meteor.user().emails[0].address,
        position: {
          x: getRandomInt(0, Config.world.boundsX),
          y: getRandomInt(0, Config.world.boundsY)
        },
      }, function (err, playerId) {
        if (err) throw new Meteor.Error('500', err)
        console.log('Player with ID', playerId, 'joined game with ID', gameId)
      })
    }
  }
})

function includeJoinedPlayers (gameId) {
  Players.update({ gameId: gameId, state: 'has-joined' }, { $set: { state: 'ready' } })
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
