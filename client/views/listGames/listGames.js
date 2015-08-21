Template.listGames.helpers({
  games: function () {
    return Games.find().fetch()
  }
})
Template.listGames.events({
  'submit #new-game': function (e) {
    e.preventDefault()
    var name = $('#new-game input[name=name]').val()
    Meteor.call('createGame', name)
  },
  'click .btn-delete-game': function (e) {
    e.preventDefault()
    var btn = e.target
    Games.remove({ _id: $(btn).data('gameId') })
  }
})
