Template.body.onRendered(function () {

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
