var RCEngine
var hammer
var UI = {
  renderer: null,
  stage: null,
  aimLine: null
}
var clientState

Template.playGame.onRendered(function () {
  Games.find().observeChanges({
    changed: function (gameId, fields) {
      console.log(fields)
      if (fields.state) syncState(fields.state)
    }
  })

  FlowRouter.subsReady('game', function () {
    initEngine(function (engine) {
      RCEngine = engine
      initWorld(RCEngine)
      initUI()
      initHammer()

      Players.find().observe({
        added: function (player) {
          console.log('Player joined:', player)
          if (player.state === 'ready') addPlayerToStage(player)
        }
      })

      $(window).on('resize', resizeWorldAndUI)
      resizeWorldAndUI()
      $('#world').addClass('ready')

      clientState = null

      syncState(Games.findOne().state)
    })
  })
})

Template.playGame.events({
  'click .btn-join-game': function () {
    Meteor.call('joinGame', Games.findOne()._id, Meteor.userId())
  }
})

Template.playGame.helpers({
  players: function () {
    return Players.find().fetch()
  },
  player: function () {
    return Players.findOne({ userId: Meteor.userId() })
  },
  game: function () {
    return Games.findOne()
  }
})

function syncState (state) {
  console.log('syncing clientState', clientState, 'with game state', state)
  if (state === clientState) return

  switch (state) {
    case 'ready':
      startAiming()
      clientState = state
      return
    case 'waiting-for-moves':
      clientState = state
      simulateTurn()
      return
    default:
      console.warn('No case in syncState for state:', state)
      return
  }
}

function simulateTurn () {
  var players = Players.find().fetch()

  players.forEach(function (player) {
    var body = RCEngine.world.bodies.filter(function (p) {
      return p.playerId && p.playerId === player._id
    })[0]
    if (!body) return console.error('No body found for player:', player)

    var shotVectors = Object.keys(player.action).map(function (key) {
      return new Victor(1,0).rotateDeg(player.action[key])
    })

    var finalVector = shotVectors.reduce(function (previous, vector) {
      return vector.add(previous)
    })
    .divide({ x: 200, y: 200 })
    .invert()

    body.force = { x: 0, y: 0 }
    Matter.Body.applyForce(body, body.position, finalVector)
  })

  RCEngine.enabled = true

  setTimeout(function () {
    Matter.Events.on(RCEngine, 'afterTick', function () {
      var haveAllPlayersStopped = RCEngine.world.bodies.every(function (body) {
        if (!body.playerId) return true
        return body.isSleeping
      })
      if (haveAllPlayersStopped) {
        console.log('All players have stopped')
        RCEngine.enabled = false

        var thisPlayer = Players.findOne({ userId: Meteor.userId() })

        var playerBody = RCEngine.world.bodies.filter(function (p) {
          return p.playerId && p.playerId === thisPlayer._id
        })[0]
        Meteor.call('declarePosition', thisPlayer._id, playerBody.position)
        Matter.Events.off(RCEngine, 'afterTick')
      }
    })
  }, 1000)
}

function startAiming () {
  waitForAim(function (angle1) {
    console.log('got angle 1', angle1)
    waitForAim(function (angle2) {
      console.log('got angle 2', angle2)
      var player = Players.findOne({ userId: Meteor.userId() })
      Meteor.call(
        'declareMove',
        player._id,
        { 0: angle1, 1: angle2 },
        function (err) {
          if (err) return console.error(err)
          console.log('declared move')
        }
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

  setTimeout(function () {
    console.log('disabling engine')
    engine.enabled = false
  })

  cb(engine)
}

function initWorld () {
  RCEngine.world.gravity = { x: 0, y: 0 }
  addBoundsToStage()
}

function getBodyForPlayer (player) {
  if (!player.position || (!player.position.x && !player.position.y)) return console.error('No position for player:', player)
  return Matter.Bodies.circle(player.position.x, player.position.y, 10)
}

function addPlayerToStage (player) {
  var playerBody = getBodyForPlayer(player)
  playerBody.playerId = player._id
  playerBody.frictionAir = 0.1
  console.log('Adding player', player.name, 'at', playerBody.position)
  Matter.World.addBody(RCEngine.world, playerBody)
}

function addBoundsToStage () {
  var bounds = {
    x: Config.world.boundsX,
    y: Config.world.boundsY
  }
  var leftWall = Matter.Bodies.rectangle(0, bounds.y / 2, 10, bounds.y, { isStatic: true })
  Matter.World.addBody(RCEngine.world, leftWall)
  var rightWall = Matter.Bodies.rectangle(bounds.x, bounds.y / 2, 10, bounds.y, { isStatic: true })
  Matter.World.addBody(RCEngine.world, rightWall)
  var topWall = Matter.Bodies.rectangle(bounds.x / 2, 0, bounds.x, 10, { isStatic: true })
  Matter.World.addBody(RCEngine.world, topWall)
  var bottomWall = Matter.Bodies.rectangle(bounds.x / 2, bounds.y, bounds.x, 10, { isStatic: true })
  Matter.World.addBody(RCEngine.world, bottomWall)
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
    hammer.off('panstart pan panend')
    cb(e.angle)
  })
}
