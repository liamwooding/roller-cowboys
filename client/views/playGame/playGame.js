Template.playGame.onRendered(function () {
  Games.find().observeChanges({
    changed: function (gameId, fields) {
      if (fields.turns) console.log('A new turn has begun')
    }
  })

  initWorld(function (world) {
    renderWorld(world, function (canvas) {
      console.log(canvas)
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

function initWorld (cb) {
  // build world with matter

  //cb(world)
}

function renderWorld (world, cb) {
  var canvas = new PIXI.Container()
  var container = new PIXI.Container()
  stage.addChild(container)
  //stage.addChild(world)
  renderer = new PIXI.autoDetectRenderer($('#canvas').innerWidth(), $('#canvas').innerHeight(), {
    antialias: true
  })
  renderer.backgroundColor = 0xF5F5F5
  $('#canvas').append(renderer.view)
  renderer.render(canvas)
}
