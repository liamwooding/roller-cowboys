Meteor.startup(function () {
  // Publish functions
  Meteor.publish('games', function (params) {
    if (params && params.gameId) return Games.find({ _id: params.gameId })
    return Games.find({}, { sort: { name: 1 } })
  })
  Meteor.publish('players', function (params) {
    if (params && params.gameId) return Players.find({ gameId: params.gameId })
    return Players.find()
  })
  Meteor.publish('turns', function (params) {
    if (params && params.gameId) return Turns.find({ _id: params.gameId })
    if (params && params.turnId) return Turns.find({ _id: params.turnId })
    return Turns.find()
  })

  // DB permissions
  Players.allow({
    insert: function (userId, player) { return userId === player.userId },
    update: function (userId, player) { return userId === player.userId },
    remove: function (userId, player) { return userId === player.userId },
  })
  Games.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })
})
