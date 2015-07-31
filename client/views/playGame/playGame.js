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

  var ground = Matter.Bodies.rectangle($('#stage').innerWidth() / 2, $('#stage').innerHeight() - 10, $('#stage').innerWidth(), 20, { isStatic: true })

  Matter.World.add(engine.world, [ground])

  // run the engine
  Matter.Engine.run(engine)
  cb(engine)
}

function buildWorld (engine) {
  engine.world.gravity = { x: 0, y: 0 }
  var game = Games.findOne()
  game.players.forEach(function (player, i) {
    var playerBody = Matter.Bodies.circle(40 * (i + 1), 300, 10)
    Matter.World.addBody(engine.world, playerBody)
  })
}
