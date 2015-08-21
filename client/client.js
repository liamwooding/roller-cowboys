FlowLayout.setRoot('#content')

AccountsTemplates.configure({
  onSubmitHook: function (err) {
    if (err) return console.error(err)
    FlowRouter.go('/')
  }
})

Template.body.onRendered(function () {

})

Template.body.events({
  'click #at-nav-button': function () {
    FlowRouter.go('/sign-in')
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
Template.registerHelper('user', function () {
  return Meteor.user()
})
