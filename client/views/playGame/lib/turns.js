Meteor.RC = Meteor.RC || {}

Meteor.RC.newTurn = function (engine, cb) {
  console.log('Starting new turn')
  var game = Games.findOne()
  if (!game) return cb('No game found')

  engine.world.bodies.filter(function (body) { return body.playerId })
  .forEach(function (playerBody) {
    var player = Players.findOne({ _id: playerBody.playerId })
    if (!player) return cb('No player found matching body with ID ' + playerBody.playerId)
    playerBody.position = player.position
  })

  setTimeout(function () {
    // For whatever reason, we need to wait a tick before disabling it. Investigation needed.
    console.log('Disabling engine')
    engine.enabled = false
  })

  cb()
}

Meteor.RC.resumeTurn = function (engine, cb) {
  console.log('Resuming turn')
  var game = Games.findOne()
  if (!game) return cb('No game found')

  engine.world.bodies.filter(function (body) { return body.playerId })
  .forEach(function (playerBody) {
    var player = Players.findOne({ _id: playerBody.playerId })
    if (!player) return cb('No player found matching body with ID ' + playerBody.playerId)
    playerBody.position = player.position
  })

  setTimeout(function () {
    // For some reason, we need to wait a tick before disabling it. Investigation needed.
    console.log('Disabling engine')
    engine.enabled = false
  })

  cb()
}
