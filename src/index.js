import * as hooks from './hooks';
import Authentication from './authentication';
import setupRestService from './services/rest';
import SocketService from './services/socket';

const defaults = {
  cookie: 'feathers-jwt',
  tokenKey: 'feathers-jwt',
  endpoint: '/authentication'
};

export default function (opts = {}) {
  const options = Object.assign({}, defaults, opts);

  return function () {
    const app = this;

    app.authentication = new Authentication(app, options);
    app.authenticate = app.authentication.authenticate.bind(app.authentication);
    app.logout = app.authentication.logout.bind(app.authentication);

    if (app.rest) {
      setupRestService(app);
    } else {
      app.service(options.endpoint, new SocketService(app));
    }

    // Set up hook that adds token and user to params so that
    // it they can be accessed by client side hooks and services
    app.mixins.push(function (service) {
      if (typeof service.hooks !== 'function') {
        throw new Error(`It looks like feathers-hooks isn't configured. It is required before running feathers-authentication.`);
      }

      service.before(hooks.populateParams());
    });

    // Set up hook that adds authorization header for REST provider
    if (app.rest) {
      app.mixins.push(function (service) {
        service.before(hooks.populateHeader(options));
      });
    }
  };
}
