Template.playGame.onRendered(function () {
  Games.find().observeChanges({
    changed: function (gameId, fields) {
      if (fields.turns) console.log('A new turn has begun')
    }
  })

  Meteor.subscribe('games', function () {
    initEngine(function (engine) {
      buildWorld(engine, function (engine) {
        console.log('Built world')
      })
    })
  })
})

Template.playGame.helpers({
  players: function () {
    return Players.find().fetch()
  },
  player: function () {
    return Players.findOne({ _id: localStorage.playerId })
  },
  hasJoined: function () {
    var player = Players.findOne({ _id: localStorage.playerId })
    return Games.findOne({ players: player })
  },
  game: function () {
    return Games.findOne()
  }
})

Template.playGame.events({
  'click .btn-end-turn': function () {
    var player = Players.findOne({_id: localStorage.playerId})
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

    var player = Players.findOne({_id: localStorage.playerId})
    Games.update(
      { _id: ctx.gameId() },
      { $addToSet: { players: player } }, // addToSet avoids duplicate values
      function (err) {
        if (err) return console.error(err)
      }
    )
  }
})

function initEngine (cb) {
  // create a Matter.js engine
  var engine = Matter.Engine.create({
    render: {
      element: document.querySelector('#stage'),
      controller: Matter.RenderPixi,
      options: {
        width: $('#stage').innerWidth(),
        height: $('#stage').innerHeight()
      }
    }
  })

  // run the engine
  Matter.Engine.run(engine)
  cb(engine)
}

function buildWorld (engine) {
  // Need to position players after they join the game
  // Also need to prevent players from joining during a game
  engine.world.gravity = { x: 0, y: 0 }
  Games.findOne().players.filter(function (player) { return player.position })
  .forEach(function (player, i) {
    var playerBody = getBodyForPlayer()
    Matter.World.addBody(engine.world, playerBody)
  })
}

function getBodyForPlayer (player) {
  return Matter.Bodies.circle(player.position.x, player.position.y, 10)
}
