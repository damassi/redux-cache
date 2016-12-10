import invariant from 'invariant'
import logger from 'utils/logger'
import u from 'updeep'
import {CACHE_EXPIRE_TIME} from 'constants/config'
import {isArray, isFunction, isObject, isString} from 'utils/predicates'

import {
  keys as pluckKeys,
  pickAll,
  union
} from 'ramda'

/**
 * Creates a cachable list action that is used in conjunction with our
 * normalizr-based `entities` database.
 *
 * @example
 * const passthroughOrg = getPassthroughOrgName(getState())
 *
 * const cacheKey = JSON.stringify({
 *   ...params,
 *   passthroughOrg
 * })
 *
 * const cache = cacheListAction(dispatch, getState, {
 *   keys: {
 *     cacheKey,
 *     entitiesKey: 'profiles',
 *     reducerKey: 'ManageProfiles'
 *   },
 *   actions: {
 *     invalidate: invalidateProfilesCache,
 *     retrieve: retrieveProfilesListCache
 *   }
 * })
 *
 * if (cache) {
 *   cache.retrieve()
 * } else {
 *   ...
 * }
 *
 * @param  {Function} dispatch - redux dispatch fn
 * @param  {Function} getState - selector that returns state
 * @param  {Object} config - settings for cache
 * @return {Boolean|Object} - an object containing a `retrieve` fn or false
 */
export function cacheListAction(dispatch, getState, config) {
  const {
    actions,
    cacheExpireTime = CACHE_EXPIRE_TIME,
    keys
  } = config

  invariant(isFunction(actions && actions.retrieve && actions.invalidate),
    '(utils/cache.js) ' +
    'Error caching action: `actions.retrieve` and `actions.invalidate` must ' +
    'be a function.'
  )

  invariant(isObject(keys),
    '(utils/cache.js) ' +
    'Error caching action: `keys` must be an object containing `cache` ' +
    '`entities` and `store`.'
  )

  Object
    .keys(keys)
    .forEach((key, index) => {
      invariant(isString(keys[key]),
        '(utils/cache.js) ' +
        `Error caching action: \`${key}\` must be a string.`
      )
    })

  let cached = false

  const {
    cacheKey,
    entitiesKey,
    reducerKey
  } = keys

  const {
    entities,
    [reducerKey]: {
      cache,
      lastUpdated
    }
  } = getState()

  const shouldInvalidate = new Date() - lastUpdated > cacheExpireTime

  if (shouldInvalidate) {
    dispatch(actions.invalidate())
  } else {
    const cacheByKey = cache && cache[cacheKey]
    const entitiesByKey = entities[entitiesKey]
    const hasCache = Boolean(cacheByKey && entitiesByKey)

    if (hasCache) {
      logger.warn(
        `(utils/cache.js) @ ${reducerKey} \n` +
        'cacheKey: \n\n', cacheKey
      )

      const result = pluckKeys(pickAll(cacheByKey.result, entitiesByKey))

      const payload = {
        ...cacheByKey,
        cacheKey,
        result
      }

      cached = {
        retrieve: () => {
          dispatch(actions.retrieve(payload))
        },

        // Helpers
        _payload: payload
      }
    }
  }

  return cached
}

/**
 * Creates a cacheable list reducer
 *
 * @example
 * case A.LIST_PROFILES_SUCCESS: {
 *   const cached = cacheListReducer(state, action)
 *
 *   return u({
 *     ...cached,
 *     isFetching: false
 *   }, state)
 * }
 *
 * @param  {Object} state - app state
 * @param  {Object} action - redux action
 * @return {Object} - new state
 */
export function cacheListReducer(state, action) {
  const {
    cacheKey,
    result
  } = action.payload

  invariant(isString(cacheKey),
    '(utils/cache.js) ' +
    'Error caching reducer: `cacheKey` must be a string.'
  )

  invariant(isArray(result),
    '(utils/cache.js) ' +
    'Error caching reducer: `result` must be an array.'
  )

  return u({
    ...action.payload,
    cache: {
      [cacheKey]: action.payload
    },
    currentItems: result,
    items: union(state.items, result)
  }, state)
}
