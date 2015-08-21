// Client routes
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
    this.register('game', Meteor.subscribe('games', { gameId: params.gameId }))
    this.register('players', Meteor.subscribe('players', { gameId: params.gameId }))
  },
  action: function (params) {
    FlowLayout.render('playGame', params)
  }
})

// Server routes
if (Meteor.isServer) {
  Meteor.startup(function () {
    var bodyParser = Meteor.npmRequire('body-parser')
    Picker.middleware(bodyParser.urlencoded({ extended: false }))
    Picker.middleware(bodyParser.json())
    var postRoutes = Picker.filter(function (req) {
      return req.method === 'POST'
    })

    postRoutes.route('/new-game', function(params, req, res) {
      if (!req.body && !req.body.name) return FlowRouter.go('/')
      Games.insert({
        name: req.body.name
      }, function (err, gameId) {
        if (err) {
          res.statusCode = 500
          return res.end()
        }
        res.writeHead(201, { 'Content-Type': 'application/json' })
        var responseBody = JSON.stringify({ gameId: gameId })
        res.end(responseBody)
      })
    })
  })
}
