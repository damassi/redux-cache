import entitiesReducer from 'rootReducers/entities'
import expect from 'expect'
import invalidateProfilesCache from 'routes/ManageProfiles/0.0.4/actions/invalidateProfilesCache'
import reducers from 'routes/ManageProfiles/0.0.4/reducers'
import {_test} from 'routes/ManageProfiles/0.0.4/actions/listProfiles'
import {cacheListAction, cacheListReducer} from 'utils/cache'
import {configureTestStore} from 'utils/store'
import {isFunction} from 'utils/predicates'

describe('utils/cache.test.js', () => {
  const getState = (cache = {}) => ({
    entities: {
      profiles: [1, 2, 3]
    },
    ManageProfiles: {
      cache,
      lastUpdated: new Date() - 1000
    }
  })

  const I = x => x

  const KEYS = {
    cacheKey: 'some-key',
    entitiesKey: 'profiles',
    storeKey: 'ManageProfiles'
  }

  const ACTIONS = {
    retrieve: I,
    invalidate: I
  }

  const CACHE_KEY = KEYS.cacheKey

  describe('#cacheListAction', () => {
    it('expects a dispatch fn', () => {
      expect(() =>
        cacheListAction()
      ).toThrow()
    })

    it('expects a getState fn', () => {
      expect(() =>
        cacheListAction(I)
      ).toThrow()
    })

    it('expects a config object', () => {
      expect(() =>
        cacheListAction(I, I, false)
      ).toThrow()

      expect(() =>
        cacheListAction(I, getState, {
          keys: KEYS,
          actions: ACTIONS
        })
      ).toNotThrow()
    })

    it('calls invalidate fn if CACHE_EXPIRE_TIME condition met', (done) => {
      const invalidate = expect.createSpy()

      cacheListAction(I, getState, {
        keys: KEYS,
        actions: {
          invalidate,
          retrieve: I
        },
        cacheExpireTime: 1
      })

      setTimeout(() => {
        expect(invalidate).toHaveBeenCalled()
        done()
      }, 2)
    })

    it('returns false if cache isnt present', () => {
      const state = getState()
      delete state.ManageProfiles

      const cache = cacheListAction(I, getState, {
        keys: KEYS,
        actions: ACTIONS
      })

      expect(cache).toEqual(false)
    })

    it('returns a object with a retrieve fn if cache is present', () => {
      const dispatch = expect.createSpy()

      const state = () => getState({
        [CACHE_KEY]: {
          result: [1, 2, 3],
          lastUpdated: new Date()
        }
      })

      const cache = cacheListAction(dispatch, state, {
        keys: KEYS,
        actions: ACTIONS,
        cacheExpireTime: 20000
      })

      expect(isFunction(cache.retrieve)).toEqual(true)
      cache.retrieve()
      expect(dispatch).toHaveBeenCalled()
    })

    it('updates the store with the cache', (done) => {
      const store = configureTestStore({
        ...entitiesReducer,
        ...reducers
      }, getState())

      cacheListAction(store.dispatch, store.getState, {
        keys: KEYS,
        actions: {
          retrieve: _test.retrieveProfilesListCache,
          invalidate: invalidateProfilesCache
        },
        cacheExpireTime: 20000
      })

      const payload = {
        cacheKey: CACHE_KEY,
        result: [1, 2, 3]
      }

      store.subscribe(() => {
        const cached = store.getState().ManageProfiles.cache[CACHE_KEY]
        expect(cached).toEqual(payload)
        done()
      })

      store.dispatch(_test.listProfilesSuccess(payload))
    })
  })

  describe('#cacheListReducer', () => {
    it('expects a cacheKey string in the payload', () => {
      expect(() =>
        cacheListReducer(I)
      ).toThrow()
    })

    it('expects a result array in the payload', () => {
      expect(() =>
        cacheListReducer(I, {foo: 'bar'})
      ).toThrow()
    })

    it('updates the cache object, by cacheKey, with the payload', () => {
      const payload = {
        cacheKey: 'foo',
        result: [1, 2, 3]
      }

      const result = cacheListReducer(I, {payload})

      expect(result).toContain({
        cache: {
          [payload.cacheKey]: {
            result: payload.result
          }
        }
      })
    })
  })
})
