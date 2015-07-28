/* global FlowRouter */
/* global FlowLayout */
FlowRouter.route('/', {
  subscriptions: function () {
    this.register('games', Meteor.subscribe('games'))
  },
  action: function () {
    FlowLayout.render('listGames')
  }
})

FlowRouter.route('/games/:gameId', {
  subscriptions: function (params) {
    this.register('game', Meteor.subscribe('games', params.gameId))
  },
  action: function (params) {
    FlowLayout.render('playGame', params)
  }
})
