var RCEngine
var hammer
var UI = {
  renderer: null,
  stage: null,
  aimLine: null
}

Template.playGame.onRendered(function () {
  Games.find().observeChanges({
    changed: function (gameId, fields) {
      if (fields.turns) endTurn()
      if (fields.players) {
        arePlayersReady(function (ready) {
          if (ready) newTurn()
        })
      }
    }
  })

  FlowRouter.subsReady('game', function () {
    initEngine(function (engine) {
      RCEngine = engine
      initWorld(RCEngine)
      initUI()
      initHammer()

      $(window).on('resize', resizeWorldAndUI)
      resizeWorldAndUI()
      $('#world').addClass('ready')

      getGameState(function (state) {
        switch (state) {
          case 0:
            // User has not joined yet & is spectating
            return
          case 1:
            // Player is returning to a game they had already joined and is expected to declare a move
            return resumeTurn()
          case 2:
            // Player is returning to a game they had already joined and is waiting for the previous turn to play out
            return waitForNewTurn()
        }
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
    return Games.findOne({ 'players._id': localStorage.playerId })
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
    Meteor.call('declareMove', ctx.gameId(), action)
  },
  'click .btn-join': function () {
    var ctx = this
    Meteor.call('joinGame', ctx.gameId(), localStorage.playerId, function (err) {
      if (err) return console.error(err)
      var player = Games.findOne().players.filter(function (p) { return p._id === localStorage.playerId })[0]
      console.log('Player joined: ', player)
      addPlayerToStage(player)
      if (Games.findOne().players.length === 1) newTurn()
    })
  }
})

function simulateMoves (turn, cb) {
  turn.moves.forEach(function (move) {
    var body = RCEngine.world.bodies.filter(function (p) {
      return p.playerId && p.playerId === move.playerId
    })[0]

    var shotVectors = Object.keys(move.action).map(function (key) {
      return new Victor(1,0).rotateDeg(move.action[key])
    })

    var finalVector = shotVectors.reduce(function (previous, vector) {
      return vector.add(previous)
    })
    Matter.Body.applyForce(body, body.position, finalVector)
  })

  RCEngine.enabled = true
}

function newTurn () {
  console.log('A new turn has begun')
  var game = Games.findOne()

  RCEngine.world.bodies.filter(function (p) { return p.playerId })
  .forEach(function (playerBody) {
    var player = game.players.filter(function (p) { return p._id == playerBody.playerId })[0]
    var playerPosition = getPositionForPlayer(player)
    playerBody.position = playerPosition
  })

  RCEngine.enabled = false

  startAiming()
}

function resumeTurn () {
  console.log('Resuming play')
  var game = Games.findOne()
  RCEngine.world.bodies.filter(function (p) { return p.playerId })
  .forEach(function (playerBody) {
    var player = game.players.filter(function (p) { return p._id == playerBody.playerId })[0]
    var playerPosition = getPositionForPlayer(player)
    playerBody.position = playerPosition
    console.log(playerPosition)
  })

  RCEngine.enabled = false

  startAiming()
}

function endTurn () {

///////////////
  simulateMoves(game.turns[game.turns.length - 1], function () {

  })
////////////////
}

function waitForNewTurn () {
  console.log('Waiting for previous turn to finish')
}

function arePlayersReady (cb) {
  console.log('Are players ready?')
  cb(false) // Work out if players are ready
}

function getGameState (cb) {
  var game = Games.findOne()
  if (!game.players.some(function (p) { return p._id === localStorage.playerId }))
    return cb(0)
  return cb(1)
  // TODO: Need to handle the case that the previous turn is still playing out
}

function startAiming () {
  waitForAim(function (angle1) {
    waitForAim(function (angle2) {
      Meteor.call(
        'declareMove',
        Games.findOne()._id,
        localStorage.playerId,
        { 0: angle1, 1: angle2 }
      )
    })
  })
}

function initEngine (cb) {
  var sceneWidth = $('#stage').innerWidth()
  var sceneHeight = sceneWidth * 0.5
  var engine = Matter.Engine.create({
    render: {
      element: document.querySelector('#world'),
      controller: Matter.RenderPixi,
      options: {
        width: Config.world.boundsX,
        height: Config.world.boundsY
      }
    }
  })

  engine.enableSleeping = true
  Matter.Engine.run(engine)

  cb(engine)
}

function initWorld () {
  RCEngine.world.gravity = { x: 0, y: 0 }
  Games.findOne().players.forEach(addPlayerToStage)
}

function getBodyForPlayer (player) {
  var playerPosition = getPositionForPlayer(player)
  return Matter.Bodies.circle(playerPosition.x, playerPosition.y, 10)
}

function getPositionForPlayer (player) {
  var game = Games.findOne()
  var playerPosition = game.currentTurn.positions.filter(function (position) {
    return position.playerId === player._id
  })[0]
  return playerPosition.position
}

function addPlayerToStage (player) {
  console.log('adding player to stage', player)
  var playerBody = getBodyForPlayer(player)
  playerBody.playerId = player._id
  console.log('Adding player', player.name, 'at', playerBody.position)
  Matter.World.addBody(RCEngine.world, playerBody)
}

function addTestBodyToStage (x, y) {
  var testBody = Matter.Bodies.circle(x, y, 10)
  Matter.World.addBody(RCEngine.world, testBody)
}

function resizeWorldAndUI () {
  var sceneWidth = $('#stage').innerWidth()
  var sceneHeight = sceneWidth * 0.5
  var scale = sceneWidth / Config.world.boundsX

  UI.renderer.resize(sceneWidth, sceneHeight)

  $('#world').css({ transform: 'scale('+ scale +')' })
}

function initUI () {
  UI.renderer = new PIXI.autoDetectRenderer(
    $('#ui').innerWidth(),
    $('#ui').innerHeight(),
    {
      antialias: true,
      transparent: true,
      autoResize: true
    }
  )
  $('#ui').append(UI.renderer.view)
  UI.stage = new PIXI.Container()

  UI.aimLine = new PIXI.Graphics()
  UI.stage.addChild(UI.aimLine)

  UI.renderer.render(UI.stage)
}

function drawAimLine (center, angle, distance) {
  var radians = angle * Math.PI / 180

  UI.aimLine.clear()
  UI.aimLine.lineStyle(1, 0xFFFFFF, 1)
  UI.aimLine.moveTo(center.x, center.y)
  UI.aimLine.lineTo(
    center.x + (50 * Math.cos(radians) * 2),
    center.y + (50 * Math.sin(radians) * 2)
  )
  UI.renderer.render(UI.stage)
}

function clearAimLine () {
  UI.aimLine.clear()
}

function initHammer () {
  hammer = new Hammer($('#ui')[0])
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
}

function waitForAim (cb) {
  hammer.off('panstart panend')
  hammer.on('panstart', function (e) {
    var center = {
      x: e.pointers[0].offsetX,
      y: e.pointers[0].offsetY
    }
    hammer.on('pan', function (e) {
      drawAimLine(center, e.angle, e.distance)
    })
  })
  hammer.on('panend', function (e) {
    hammer.off('pan')
    cb(e.angle)
  })
}
