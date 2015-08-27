Meteor.RC = Meteor.RC || {}

var aimLine

Meteor.RC.UI = {
  renderer: null,
  stage: null,
  initUI: function () {
    this.renderer = new PIXI.autoDetectRenderer(
      $('#ui').innerWidth(),
      $('#ui').innerHeight(),
      {
        antialias: true,
        transparent: true,
        autoResize: true
      }
    )
    $('#ui').append(this.renderer.view)
    this.stage = new PIXI.Container()

    aimLine = new PIXI.Graphics()
    this.stage.addChild(aimLine)

    this.renderer.render(this.stage)
  },

  drawAimLine: function (center, angle, distance, shotNumber) {
    var radians = angle * Math.PI / 180

    var centerVector = new Victor(center.x, center.y)
    if (shotNumber === 0) centerVector.add(new Victor(0, 7.5).rotate(radians))
    if (shotNumber === 1) centerVector.add(new Victor(0, -7.5).rotate(radians))

    aimLine.clear()
    aimLine.lineStyle(1, 0xFFFFFF, 1)
    aimLine.moveTo(centerVector.x, centerVector.y)
    aimLine.lineTo(
      centerVector.x + (50 * Math.cos(radians) * 2),
      centerVector.y + (50 * Math.sin(radians) * 2)
    )
    this.renderer.render(this.stage)
  },

  clearAimLine: function () {
    aimLine.clear()
    this.renderer.render(this.stage)
  },

  resizeWorldAndUI: function () {
    var sceneWidth = $('#stage').innerWidth()
    var sceneHeight = sceneWidth * 0.5
    var scale = sceneWidth / Config.world.boundsX

    this.renderer.resize(sceneWidth, sceneHeight)

    $('#world').css({ transform: 'scale('+ scale +')' })
  },

  startAiming: function (player) {
    this.waitForAim(player, 0, function (angle1) {
      console.log('got angle 1', angle1)
      this.waitForAim(player, 1, function (angle2) {
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
  },

  initHammer: function () {
    hammer = new Hammer($('#ui')[0])
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })
  },

  waitForAim: function  (player, shotNumber, cb) {
    hammer.off('panstart panend')
    hammer.on('panstart', function (e) {
      var pos = player.position
      var scale = $('#stage').innerWidth() / Config.world.boundsX
      var center = {
        x: pos.x * scale,
        y: pos.y * scale
      }
      hammer.on('pan', function (e) {
        Meteor.RC.UI.drawAimLine(center, e.angle, e.distance, shotNumber)
      })
    })
    hammer.on('panend', function (e) {
      Meteor.RC.UI.clearAimLine()
      hammer.off('panstart pan panend')
      cb(e.angle)
    })
  }
}
