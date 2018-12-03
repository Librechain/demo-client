import Identity from '../../types/Identity'
import Action from '../Action'

// Types & Interfaces
interface ISaveAction extends Action {
  payload: {
    alias: string
    identity: Identity
  }
}
interface IRemoveAction extends Action {
  payload: string
}
export type WalletAction = ISaveAction | IRemoveAction
export interface IWalletState {
  [index: string]: {
    alias: string
    identity: Identity
  }
}

// Actions
const SAVE_USER = 'client/wallet/SAVE_USER'
const REMOVE_USER = 'client/wallet/REMOVE_USER'

// Reducer
export default function reducer(
  state: IWalletState = {},
  action: WalletAction
): IWalletState {
  switch (action.type) {
    case SAVE_USER:
      action = action as ISaveAction
      const { alias, identity } = action.payload
      state = {
        [identity.seedAsHex]: {
          alias,
          identity,
        },
        ...state,
      }
      break
    case REMOVE_USER:
      action = action as IRemoveAction
      const { [action.payload]: value, ...rest } = state
      state = rest
      break
  }
  return state
}

// Action Creators
export function saveUser(alias: string, identity: Identity): ISaveAction {
  return { type: SAVE_USER, payload: { alias, identity } }
}

export function removeUser(seedAsHex: string): IRemoveAction {
  return { type: REMOVE_USER, payload: seedAsHex }
}
