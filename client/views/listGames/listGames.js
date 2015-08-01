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
  },
  'click .btn-delete-game': function (e) {
    e.preventDefault()
    var btn = e.target
    Games.remove({ _id: $(btn).data('gameId') })
  }
})
