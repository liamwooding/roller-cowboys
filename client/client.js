/* global FlowRouter */
/* global Games */
/* global Players */

Template.body.onRendered(function () {
  if (!window.localStorage.playerId) {
    console.log('No player found in localStorage, creating a new one')
    Players.insert({
      name: Random.id()
    }, function (err, playerId) {
      if (err) return console.error(err)
        window.localStorage.playerId = playerId
    })
  }
})

// listGames
Template.listGames.helpers({
  games: function () {
    return Games.find().fetch()
  }
})
Template.listGames.events({
  'submit #new-game': function (e) {
    e.preventDefault()
    var form = $('#new-game')

    $.ajax({
      method: 'POST',
      url: form.attr('action'),
      data: form.serialize()
    })
    .done(function (data) {
      console.log(data)
      FlowRouter.go('/games/' + data.gameId)
    })
    .fail(function (err) {
      console.error(err)
    })
  }
})

// playGame
Template.playGame.onRendered(function () {
  Games.find().observeChanges({
    changed: function (gameId, fields) {
      if (fields.turns) console.log('A new turn has begun')
    }
  })
})
Template.playGame.helpers({
  players: function () {
    return Players.find().fetch()
  },
  player: function () {
    return Players.findOne({ _id: playerId() })
  },
  hasJoined: function () {
    var player = Players.findOne({ _id: playerId() })
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
    var player = Players.findOne({_id: playerId()})
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

    var player = Players.findOne({_id: playerId()})
    Games.update(
      { _id: ctx.gameId() },
      { $addToSet: { players: player } }, // addToSet avoids duplicate values
      function (err) {
        if (err) return console.error(err)
      }
    )
  }
})

// Global helpers
Template.registerHelper('isReady', function (sub) {
  if (sub) {
    return FlowRouter.subsReady(sub)
  } else {
    return FlowRouter.subsReady()
  }
})
Template.registerHelper('isEq', function (a, b) {
  return a === b
})

function playerId () {
  if (!window || !window.localStorage) return false
  return window.localStorage.playerId
}
