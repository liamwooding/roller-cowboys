var RCEngine
var hammer
var UI = {
  renderer: null,
  stage: null,
  aimLine: null
}
var clientState
// After adding a body, we should wait til the next frame to stop the engine.
var disableEngineNextFrame = _.debounce(disableEngine, 34)

Template.playGame.onRendered(function () {
  var template = this
  template.observers = template.observers || {}

  template.observers.games = Games.find().observeChanges({
    changed: function (gameId, fields) {
      console.log('The game changed:', fields)
      if (fields.state) syncState(fields.state)
    }
  })

  template.observers.players = Players.find().observe({
    added: function (player) {
      console.log('Player joined:', player)
      if (player.state !== 'ready') return
      if (!RCEngine) return
      console.log('adding player now')
      enableEngine(RCEngine)
      addPlayerToStage(player)
      disableEngineNextFrame()
    }
  })

  template.observers.playerChanges = Players.find().observeChanges({
    changed: function (playerId, fields) {
      if (!fields.position) return
      updatePositionOfPlayer(playerId, fields.position)
    }
  })

  FlowRouter.subsReady('game', function () {
    initEngine(function (engine) {
      RCEngine = engine
      initWorld(RCEngine)
      initCollisionListeners(RCEngine)
      initUI()
      initHammer()
      Players.find({ state: 'ready' }).fetch().forEach(addPlayerToStage)
      disableEngineNextFrame()

      $(window).on('resize', resizeWorldAndUI)
      resizeWorldAndUI()
      $('#world').addClass('ready')

      clientState = null

      syncState(Games.findOne().state)
    })
  })
})

Template.playGame.onDestroyed(function () {
  var template = this
  Object.keys(template.observers).forEach(function (key) {
    template.observers[key].stop()
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
  console.log('syncing client state', clientState, 'with game state', state)
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
  console.log('simulating turn')
  var players = Players.find().fetch()

  players.forEach(function (player) {
    var playerBody = RCEngine.world.bodies.filter(function (p) {
      return p.playerId && p.playerId === player._id
    })[0]
    if (!playerBody) return console.error('No body found for player:', player)

    var kickbackVector = applyKickbackToPlayer(playerBody, player)
    console.log('kickbackVector:', kickbackVector)
    var lookVector = kickbackVector.clone().normalize().invert()
    console.log('lookvector:', lookVector)
    createBulletsForPlayer(player, lookVector)
  })

  enableEngine(RCEngine)

  setTimeout(function () {
    Matter.Events.on(RCEngine, 'afterUpdate', function () { //PROBLEM? This event listener goes beserk sometimes
      cleanupEscapedObjects()
      var haveAllObjectsStopped = Matter.Composite.allBodies(RCEngine.world).every(function (body) {
        return body.isStatic || body.isSleeping
      })
      if (haveAllObjectsStopped) {
        console.log('All players have stopped')
        disableEngine(RCEngine)

        var thisPlayer = Players.findOne({ userId: Meteor.userId() })

        var playerBody = RCEngine.world.bodies.filter(function (p) {
          return p.playerId && p.playerId === thisPlayer._id
        })[0]
        Meteor.call('declarePosition', thisPlayer._id, playerBody.position)
        Matter.Events.off(RCEngine, 'afterUpdate')
      }
    })
  }, 200)
}

function cleanupEscapedObjects () {
 Matter.Composite.allBodies(RCEngine.world).forEach(function (body) {
    if  (body.bounds.min.x > RCEngine.world.bounds.max.x
      || body.bounds.max.x < RCEngine.world.bounds.min.x
      || body.bounds.min.y > RCEngine.world.bounds.max.y
      || body.bounds.max.y < RCEngine.world.bounds.min.y
      || body.bounds.max.x === Number.MIN_VALUE
      || body.bounds.max.y === Number.MIN_VALUE
      || body.bounds.min.x === Number.MIN_VALUE
      || body.bounds.min.y === Number.MIN_VALUE
      || body.bounds.max.x === Number.MAX_VALUE
      || body.bounds.max.y === Number.MAX_VALUE
      || body.bounds.min.x === Number.MAX_VALUE
      || body.bounds.min.y === Number.MAX_VALUE) {
      console.log('removing out-of-bounds body', body)
      Matter.World.remove(RCEngine.world, body)
      Matter.RenderPixi.clear(RCEngine.render)
    }
  })
}

function applyKickbackToPlayer (body, player) {
  var shotVectors = Object.keys(player.action).map(function (key) {
    return new Victor(1,0).rotateDeg(player.action[key])
  })

  var kickbackVector = shotVectors.reduce(function (previous, vector) {
    return vector.add(previous)
  })
  .divide({ x: 200, y: 200 })
  .invert()

  body.force = { x: 0, y: 0 }
  Matter.Body.applyForce(body, body.position, kickbackVector)

  return kickbackVector
}

function createBulletsForPlayer (player, lookVector) {
  var shotVectors = Object.keys(player.action).map(function (key) {
    return new Victor(10,0).rotateDeg(player.action[key])
  })

  shotVectors.forEach(function (vector, i) {
    createBullet(player, vector, lookVector.clone(), i)
  })
}

function createBullet (player, shotVector, lookVector, shotNumber) {
  console.log('creating bullet')
  // Lengthen the vector to be longer than player body's radius
  var startPosition = new Victor(player.position.x, player.position.y)

  if (shotNumber === 0)
    startPosition.add(new Victor(0, 5).rotate(lookVector.angle()))
  if (shotNumber === 1)
    startPosition.add(new Victor(0, -5).rotate(lookVector.angle()))

  startPosition.add(shotVector)

  var bullet = Matter.Bodies.circle(startPosition.x, startPosition.y, 1)

  Matter.Body.applyForce(bullet, startPosition, shotVector.divide({ x: 50000, y: 50000 }))
  bullet.label = 'bullet'
  bullet.shooterId = player._id
  bullet.frictionAir = 0
  Matter.World.addBody(RCEngine.world, bullet)
  console.log('bullet',bullet)
}

function enableEngine (engine) {
  console.log('Enabling engine')
  engine.enabled = true
}

function disableEngine (engine) {
  console.log('Disabling engine')
  if (engine) engine.enabled = false
  else RCEngine.enabled = false
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
  RCEngine.world.bounds.min.x = RCEngine.world.bounds.min.y = 0
  RCEngine.world.bounds.max.x = Config.world.boundsX
  RCEngine.world.bounds.max.y = Config.world.boundsY
  addBoundsToStage()
}

function initCollisionListeners () {
  Matter.Events.on(RCEngine, 'collisionStart', function (e) {
    e.pairs.forEach(function (pair) {
      // Need to handle case that both bodies are bullets
      if (pair.bodyA.label === 'bullet') handleBulletCollision(pair.bodyA, pair.bodyB)
      if (pair.bodyB.label === 'bullet') handleBulletCollision(pair.bodyB, pair.bodyA)
    })
  })
}

function handleBulletCollision (bullet, object) {
  if (object.label === 'player' && bullet.shooterId === getPlayer()._id) {
    Meteor.call('hitPlayer', getPlayer()._id, object.playerId)
  }
  RCEngine.world.bodies.forEach(function (body, i) {
    if (body.id === bullet.id) {
      console.log('Removing body', body)
      Matter.World.remove(RCEngine.world, body)
      Matter.RenderPixi.clear(RCEngine.render)
    }
  })
}

function updatePositionOfPlayer (playerId, position) {
  var playerBody = RCEngine.world.bodies.filter(function (p) { return p.playerId === playerId })[0]
  Matter.Body.setPosition(playerBody, position)
}

function getBodyForPlayer (player) {
  if (!player.position || (!player.position.x && !player.position.y)) return console.error('No position for player:', player)
  var body = Matter.Bodies.circle(player.position.x, player.position.y, 10)
  body.label = 'player'
  body.playerId = player._id
  body.frictionAir = 0.1
  return body
}

function addPlayerToStage (player) {
  if (RCEngine.world.bodies.some(function (body) { body.playerId && body.playerId === player._id })) return
  var playerBody = getBodyForPlayer(player)
  console.log('Adding player', player.name, 'at', playerBody.position)
  Matter.World.addBody(RCEngine.world, playerBody)
  console.log(playerBody)
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

function startAiming () {
  waitForAim(0, function (angle1) {
    console.log('got angle 1', angle1)
    waitForAim(1, function (angle2) {
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

function drawAimLine (center, angle, distance, shotNumber) {
  var radians = angle * Math.PI / 180

  var centerVector = new Victor(center.x, center.y)
  if (shotNumber === 0) centerVector.add(new Victor(0, 7.5).rotate(radians))
  if (shotNumber === 1) centerVector.add(new Victor(0, -7.5).rotate(radians))

  UI.aimLine.clear()
  UI.aimLine.lineStyle(1, 0xFFFFFF, 1)
  UI.aimLine.moveTo(centerVector.x, centerVector.y)
  UI.aimLine.lineTo(
    centerVector.x + (50 * Math.cos(radians) * 2),
    centerVector.y + (50 * Math.sin(radians) * 2)
  )
  UI.renderer.render(UI.stage)
}

function clearAimLine () {
  UI.aimLine.clear()
  UI.renderer.render(UI.stage)
}

function initHammer () {
  hammer = new Hammer($('#ui')[0])
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
}

function waitForAim (shotNumber, cb) {
  hammer.off('panstart panend')
  hammer.on('panstart', function (e) {
    var pos = getPlayer().position
    var scale = $('#stage').innerWidth() / Config.world.boundsX
    var center = {
      x: pos.x * scale,
      y: pos.y * scale
    }
    hammer.on('pan', function (e) {
      drawAimLine(center, e.angle, e.distance, shotNumber)
    })
  })
  hammer.on('panend', function (e) {
    clearAimLine()
    hammer.off('panstart pan panend')
    cb(e.angle)
  })
}

function getPlayer () {
  return Players.findOne({ userId: Meteor.userId() })
}

function getPlayerBody () {
  var player = getPlayer()
  return RCEngine.world.bodies.filter(function (body) {
    return body.playerId === player._id
  })[0]
}
