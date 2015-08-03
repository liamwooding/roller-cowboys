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
      if (fields.turns) newTurn()
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
    Meteor.call('declareMove', ctx.gameId(), turn)
  },
  'click .btn-join': function () {
    var ctx = this
    Meteor.call('joinGame', ctx.gameId(), localStorage.playerId, function (err) {
      if (err) return console.error(err)
      var player = Games.findOne().players.filter(function (p) { return p._id === localStorage.playerId })[0]
      console.log('Player joined: ', player)
      addPlayerToStage(player )
    })
  }
})

function newTurn () {
  console.log('A new turn has begun')
  var game = Games.findOne()
  RCEngine.world.bodies.filter(function (p) { return p.playerId })
  .forEach(function (playerBody) {
    var player = game.players.filter(function (p) {
      return p._id === playerBody.playerId
    })[0]
    playerBody.position = player.position
  })
  startAiming()
}

function resumeTurn () {
  console.log('Resuming play')
  var game = Games.findOne()
  RCEngine.world.bodies.filter(function (p) { return p.playerId })
  .forEach(function (playerBody) {
    var player = game.players.filter(function (p) {
      return p._id === playerBody.playerId
    })[0]
    playerBody.position = player.position
  })
  startAiming()
}

function waitForNewTurn () {
  console.log('Waiting for previous turn to finish')
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

  // var scale = sceneWidth / Config.world.boundsX
  // engine.render.container.scale.set(scale, scale)

  // engine.render.container.pivot.set(sceneWidth / 2, sceneHeight / 2)

  console.log(engine.render)

  cb(engine)
}

function initWorld () {
  RCEngine.world.gravity = { x: 0, y: 0 }
  Games.findOne().players.filter(function (player) { return player.position })
  .forEach(addPlayerToStage)

  //DEBUG
  addTestBodyToStage(10, 10)
  addTestBodyToStage(100, 100)
  addTestBodyToStage(200, 200)
  addTestBodyToStage(Config.world.boundsX - 10, Config.world.boundsY - 10)
}

function getBodyForPlayer (player) {
  return Matter.Bodies.circle(player.position.x, player.position.y, 10)
}

function addPlayerToStage (player) {
  var playerBody = getBodyForPlayer(player)
  playerBody.playerId = player._id
  Matter.World.addBody(RCEngine.world, playerBody)
}

function addTestBodyToStage (x, y) {
  var testBody = Matter.Bodies.circle(x, y, 10)
  Matter.World.addBody(RCEngine.world, testBody)
}

function resizeWorldAndUI () {
  var sceneWidth = $('#world').innerWidth()
  var sceneHeight = sceneWidth * 0.5
  var scale = sceneWidth / Config.world.boundsX
  var translate = 100 - (scale * 100)

  UI.renderer.resize(sceneWidth, sceneHeight)
  console.log('scale('+ scale +') translate(-'+ translate +'%, 0)')

  $('#world').css({ transform: 'scale('+ scale +')' })


  // var scale = sceneWidth / Config.world.boundsX

  // var renderOptions = RCEngine.render.options
  // var canvas = RCEngine.render.canvas
  // var boundsMax = RCEngine.render.bounds.max

  // RCEngine.render.container.pivot.set(0, -80)

  // boundsMax.x = canvas.width = renderOptions.width = sceneWidth
  // boundsMax.y = canvas.height = renderOptions.height = sceneHeight

  // RCEngine.render.container.scale.set(scale, scale)

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
