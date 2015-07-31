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
