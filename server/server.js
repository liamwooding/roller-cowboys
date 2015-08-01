Meteor.startup(function () {
  // Publish functions
  Meteor.publish('games', function (params) {
    if (params && params.gameId) return Games.find({ _id: params.gameId })
    return Games.find({}, { sort: { name: 1 } })
  })
  Meteor.publish('players', function (params) {
    if (params && params.playerId) return Players.find({ _id: params.playerId })
    return Players.find()
  })

  // DB permissions
  Players.allow({
    insert: function () { return true },
    update: function () { return true }
  })
  Games.allow({
    insert: function () { return true },
    update: function () { return true },
    remove: function () { return true }
  })
})
