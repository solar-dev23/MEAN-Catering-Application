'use strict';

angular.module('cateringApp', ['cateringApp.auth', 'cateringApp.admin', 'cateringApp.constants',
    'ngCookies', 'ngResource', 'ngSanitize', 'btford.socket-io', 'ui.router', 'ui.bootstrap',
    'validation.match', "checklist-model", "rzModule", "angularFileUpload", 'smart-table', 'angularPayments', 'ngAnimate', 'ui.comments.directive'
  ])
  .config(function($urlRouterProvider, $locationProvider /*, commentsConfig*/) {
    $urlRouterProvider.otherwise('/');

    $locationProvider.html5Mode(true);

  });
