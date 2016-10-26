import {
  clearCookie,
  handleResponse
} from '../utils';

export default function setupRestService (app) {
  let options = app.authentication.options;
  const restService = app.service(options.endpoint);
  const originalCreate = restService.create;
  const originalRemove = restService.remove;

  restService.create = function (data, params) {
    return originalCreate(data, params);
  };

  restService.remove = function (id) {
    // What do we want to return when we logout?
    const promise = id ? originalRemove(id) : Promise.resolve(null);
    return promise.then(response => {
      app.set('accessToken', null);
      clearCookie(options.cookie);
      return;
    });
  };

  // restService.find =
  // restService.get =
  // restService.update =
  // restService.patch =
  // function () {
  //   return new Error('NotImplemented');
  // };

  return restService;
}
