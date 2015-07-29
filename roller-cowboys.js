/* global FlowRouter */
Games = new Meteor.Collection('games') /* global Games */

if (Meteor.isClient) {

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

  Template.playGame.helpers({
    game: function () {
      return Games.findOne()
    }
  })

  Template.registerHelper('isReady', function (sub) {
    if (sub) {
      return FlowRouter.subsReady(sub)
    } else {
      return FlowRouter.subsReady()
    }
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Games.find().count() === 0) Games.insert({ name: 'Default' })

    Meteor.publish('games', function (params) {
      if (params && params.gameId) return Games.find({ _id: params.gameId })
      return Games.find()
    })
  })
}
