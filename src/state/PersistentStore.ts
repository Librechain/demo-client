import { combineReducers, createStore, Store } from 'redux'
import Claims, {
  ClaimsStateSerialized,
  ImmutableClaimsState,
} from './ducks/Claims'
import WalletRedux, {
  ImmutableWalletState,
  WalletStateSerialized,
} from './ducks/WalletRedux'

declare global {
  /* tslint:disable */
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__: any
  }
  /* tslint:enable */
}

type State = {
  wallet: ImmutableWalletState
  claims: ImmutableClaimsState
}

type SerializedState = {
  wallet: WalletStateSerialized
  claims: ClaimsStateSerialized
}

function deserialize(obj: SerializedState): State {
  return {
    claims: Claims.deserialize(obj.claims),
    wallet: WalletRedux.deserialize(obj.wallet),
  }
}

function serialize(state: State): string {
  const obj: SerializedState = {
    claims: Claims.serialize(state.claims),
    wallet: WalletRedux.serialize(state.wallet),
  }

  return JSON.stringify(obj)
}

class PersistentStore {
  public get store() {
    return this._store
  }

  private static NAME = 'reduxState'

  private _store: Store

  constructor() {
    const localState = localStorage.getItem(PersistentStore.NAME)
    let persistedState = {} as State
    if (localState) {
      const storedState = JSON.parse(localState)
      persistedState = deserialize(storedState)
    }

    this._store = createStore(
      combineReducers({ wallet: WalletRedux.reducer, claims: Claims.reducer }),
      persistedState,
      window.__REDUX_DEVTOOLS_EXTENSION__ &&
        window.__REDUX_DEVTOOLS_EXTENSION__()
    )

    this._store.subscribe(() => {
      localStorage.setItem(
        PersistentStore.NAME,
        serialize(this._store.getState())
      )
    })
  }
}

export default new PersistentStore()
export { serialize, deserialize }
