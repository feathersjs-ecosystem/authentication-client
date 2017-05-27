/*
 * Exposes the access token to the client side hooks
 * under hook.params.accessToken.
 */

export default function populateAccessToken () {
  return function (hook) {
    const app = hook.app;

    if (hook.type !== 'before') {
      return Promise.reject(new Error(`The 'populateAccessToken' hook should only be used as a 'before' hook.`));
    }

    Object.assign(hook.params, { accessToken: app.passport.getJWT() });

    return Promise.resolve(hook);
  };
}
