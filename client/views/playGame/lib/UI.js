Meteor.rollerCowboys = Meteor.rollerCowboys || {}

Meteor.rollerCowboys.UI = function () {
  var self = this
  self.renderer
  self.stage
  self.aimLine
}

var UI = Meteor.rollerCowboys.UI

UI.prototype.initUI = function () {
  var self = this
  self.renderer = new PIXI.autoDetectRenderer(
    $('#ui').innerWidth(),
    $('#ui').innerHeight(),
    {
      antialias: true,
      transparent: true,
      autoResize: true
    }
  )
  $('#ui').append(self.renderer.view)
  self.stage = new PIXI.Container()

  self.aimLine = new PIXI.Graphics()
  self.stage.addChild(self.aimLine)

  self.renderer.render(self.stage)
}

UI.prototype.resizeWorldAndUI = function () {
  var self = this
  var sceneWidth = $('#stage').innerWidth()
  var sceneHeight = sceneWidth * 0.5
  var scale = sceneWidth / Config.world.boundsX

  self.renderer.resize(sceneWidth, sceneHeight)

  $('#world').css({ transform: 'scale('+ scale +')' })
}

UI.prototype.startAiming = function (player) {
  var self = this
  waitForAim.apply(self, [player, 0, function (angle1) {
    waitForAim.apply(self, [player, 1, function (angle2) {
      var player = Players.findOne({ userId: Meteor.userId() })
      Meteor.call(
        'declareMove',
        player._id,
        { 0: angle1, 1: angle2 },
        function (err) {
          if (err) return console.error(err)
        }
      )
    }])
  }])
}

UI.prototype.initHammer = function () {
  hammer = new Hammer($('#ui')[0])
  hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
}

function drawAimLine (center, angle, distance, shotNumber) {
  var self = this
  var radians = angle * Math.PI / 180

  var centerVector = new Victor(center.x, center.y)
  if (shotNumber === 0) centerVector.add(new Victor(0, 7.5).rotate(radians))
  if (shotNumber === 1) centerVector.add(new Victor(0, -7.5).rotate(radians))

  self.aimLine.clear()
  self.aimLine.lineStyle(1, 0xFFFFFF, 1)
  self.aimLine.moveTo(centerVector.x, centerVector.y)
  self.aimLine.lineTo(
    centerVector.x + (50 * Math.cos(radians) * 2),
    centerVector.y + (50 * Math.sin(radians) * 2)
  )
  self.renderer.render(self.stage)
}

function clearAimLine () {
  var self = this
  self.aimLine.clear()
  self.renderer.render(self.stage)
}

function waitForAim (player, shotNumber, cb) {
  var self = this
  hammer.off('panstart panend')
  hammer.on('panstart', function (e) {
    var pos = player.position
    var scale = $('#stage').innerWidth() / Config.world.boundsX
    var center = {
      x: pos.x * scale,
      y: pos.y * scale
    }
    hammer.on('pan', function (e) {
      drawAimLine.apply(self, [center, e.angle, e.distance, shotNumber])
    })
  })
  hammer.on('panend', function (e) {
    clearAimLine.apply(self)
    hammer.off('panstart pan panend')
    cb(e.angle)
  })
}
